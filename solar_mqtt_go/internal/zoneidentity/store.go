package zoneidentity

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
	"sync"

	"solar_mqtt_go/internal/scraper"
)

const stateVersion = 1
const stateFilename = "solar_zone_identities.json"

// Warnf is replaceable in tests. Serial-less zones are intentionally noisy:
// their position fallback is not a durable hardware identity guarantee.
var Warnf = func(format string, args ...any) {
	fmt.Printf("警告："+format+"\n", args...)
}

type binding struct {
	IdentityKey string `json:"identity_key"`
	ZoneID      int    `json:"zone_id"`
}

type factoryFileState struct {
	NextZoneID int       `json:"next_zone_id"`
	Bindings   []binding `json:"bindings"`
}

type fileState struct {
	Version   int                         `json:"version"`
	Factories map[string]factoryFileState `json:"factories"`
}

type factoryState struct {
	nextZoneID int
	bindings   map[string]int
	usedIDs    map[int]string
}

// Store owns the durable alias from factory/serial identity to numeric zone id.
// Callers receive resolved zones only after any newly allocated aliases have
// been persisted successfully.
type Store struct {
	mu            sync.Mutex
	path          string
	factories     map[string]*factoryState
	authoritative map[string]bool
}

// PathForConfig keeps the collector-owned registry beside the authoritative
// config without mixing runtime identity state into operator-editable config.
func PathForConfig(configPath string) string {
	return filepath.Join(filepath.Dir(configPath), stateFilename)
}

// Open loads an existing registry. An existing-but-invalid registry is an error;
// it is never silently reset because that could reassign a canonical zone id.
func Open(path string) (*Store, error) {
	s := &Store{path: path, factories: map[string]*factoryState{}, authoritative: map[string]bool{}}
	data, err := os.ReadFile(path)
	if err != nil {
		if os.IsNotExist(err) {
			return s, nil
		}
		return nil, fmt.Errorf("讀取 zone identity state 失敗: %w", err)
	}

	var raw fileState
	if err := json.Unmarshal(data, &raw); err != nil {
		return nil, fmt.Errorf("zone identity state JSON 損壞: %w", err)
	}
	if raw.Version != stateVersion {
		return nil, fmt.Errorf("不支援的 zone identity state version: %d", raw.Version)
	}

	for factoryID, fac := range raw.Factories {
		state, err := validateFactoryState(factoryID, fac)
		if err != nil {
			return nil, err
		}
		s.factories[factoryID] = state
		s.authoritative[factoryID] = true
	}
	return s, nil
}

func validateFactoryState(factoryID string, fac factoryFileState) (*factoryState, error) {
	state := &factoryState{
		nextZoneID: fac.NextZoneID,
		bindings:   map[string]int{},
		usedIDs:    map[int]string{},
	}
	maxID := 0
	for _, item := range fac.Bindings {
		if !validIdentityKey(item.IdentityKey) {
			return nil, fmt.Errorf("factory %s 有無效 identity key", factoryID)
		}
		if item.ZoneID <= 0 {
			return nil, fmt.Errorf("factory %s 有無效 zone_id=%d", factoryID, item.ZoneID)
		}
		if _, exists := state.bindings[item.IdentityKey]; exists {
			return nil, fmt.Errorf("factory %s 有重複 identity key", factoryID)
		}
		if other, exists := state.usedIDs[item.ZoneID]; exists {
			return nil, fmt.Errorf("factory %s 的 zone_id=%d 同時綁定 %s 與 %s", factoryID, item.ZoneID, other, item.IdentityKey)
		}
		state.bindings[item.IdentityKey] = item.ZoneID
		state.usedIDs[item.ZoneID] = item.IdentityKey
		if item.ZoneID > maxID {
			maxID = item.ZoneID
		}
	}
	if state.nextZoneID <= maxID || state.nextZoneID < 1 {
		return nil, fmt.Errorf("factory %s 的 next_zone_id=%d 不大於已使用最大 ID=%d", factoryID, state.nextZoneID, maxID)
	}
	return state, nil
}

func validIdentityKey(key string) bool {
	if strings.HasPrefix(key, "serial:") {
		return strings.TrimSpace(strings.TrimPrefix(key, "serial:")) != ""
	}
	if strings.HasPrefix(key, "position:") {
		n, err := strconv.Atoi(strings.TrimPrefix(key, "position:"))
		return err == nil && n > 0
	}
	return false
}

func serialKey(serial string) string {
	return "serial:" + strings.TrimSpace(serial)
}

func positionKey(position int) string {
	return "position:" + strconv.Itoa(position)
}

func cloneFactoryState(src *factoryState) *factoryState {
	if src == nil {
		return nil
	}
	dst := &factoryState{
		nextZoneID: src.nextZoneID,
		bindings:   make(map[string]int, len(src.bindings)),
		usedIDs:    make(map[int]string, len(src.usedIDs)),
	}
	for key, id := range src.bindings {
		dst.bindings[key] = id
	}
	for id, key := range src.usedIDs {
		dst.usedIDs[id] = key
	}
	return dst
}

// HasAuthoritativeFactory reports whether this factory was loaded from or has
// already been committed to sidecar state. When true, legacy history must not
// override or gate startup for that factory.
func (s *Store) HasAuthoritativeFactory(factoryID string) bool {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.authoritative[factoryID]
}

func (s *Store) ensureFactory(factoryID string) *factoryState {
	state := s.factories[factoryID]
	if state == nil {
		state = &factoryState{nextZoneID: 1, bindings: map[string]int{}, usedIDs: map[int]string{}}
		s.factories[factoryID] = state
	}
	return state
}

// Bootstrap seeds only a factory that has no sidecar bindings yet. Existing
// sidecar state is authoritative. nextFloor reserves every numeric id already
// seen in legacy history even if that zone is absent from the latest snapshot.
func (s *Store) Bootstrap(factoryID string, serialToID map[string]int, nextFloor int) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	state := s.ensureFactory(factoryID)
	if s.authoritative[factoryID] {
		return nil
	}
	if nextFloor < 1 {
		nextFloor = 1
	}
	if len(serialToID) == 0 && nextFloor == 1 {
		return nil
	}

	before := cloneFactoryState(state)
	maxID := 0
	serials := make([]string, 0, len(serialToID))
	for serial := range serialToID {
		serials = append(serials, serial)
	}
	sort.Strings(serials)
	for _, rawSerial := range serials {
		serial := strings.TrimSpace(rawSerial)
		id := serialToID[rawSerial]
		if serial == "" || id <= 0 {
			s.factories[factoryID] = before
			return fmt.Errorf("factory %s 的 history bootstrap 含無效 serial/zone_id", factoryID)
		}
		key := serialKey(serial)
		if _, exists := state.bindings[key]; exists {
			s.factories[factoryID] = before
			return fmt.Errorf("factory %s 的 history bootstrap 有重複 serial=%s", factoryID, serial)
		}
		if other, exists := state.usedIDs[id]; exists {
			s.factories[factoryID] = before
			return fmt.Errorf("factory %s 的 history bootstrap zone_id=%d 同時綁定 %s 與 %s", factoryID, id, other, key)
		}
		state.bindings[key] = id
		state.usedIDs[id] = key
		if id > maxID {
			maxID = id
		}
	}
	state.nextZoneID = maxID + 1
	if state.nextZoneID < nextFloor {
		state.nextZoneID = nextFloor
	}
	if state.nextZoneID < 1 {
		state.nextZoneID = 1
	}
	if err := s.persistLocked(); err != nil {
		s.factories[factoryID] = before
		return err
	}
	s.authoritative[factoryID] = true
	return nil
}

// ResolveZones returns a copy whose ZoneID values are collector-durable aliases.
// New aliases are allocated as a batch and persisted before the caller can
// publish or record them. A failed write rolls the in-memory allocation back.
func (s *Store) ResolveZones(factoryID string, zones []scraper.Zone) ([]scraper.Zone, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	state := s.ensureFactory(factoryID)
	before := cloneFactoryState(state)
	resolved := make([]scraper.Zone, len(zones))
	copy(resolved, zones)
	changed := false
	seenKeys := make(map[string]struct{}, len(resolved))

	for i := range resolved {
		zone := &resolved[i]
		serial := strings.TrimSpace(zone.Serial)
		key := serialKey(serial)
		if serial == "" {
			if zone.Position <= 0 {
				s.factories[factoryID] = before
				return nil, fmt.Errorf("[%s] serial-less zone 缺少有效 position", factoryID)
			}
			key = positionKey(zone.Position)
			Warnf("[%s] zone position %d 缺少 serial；使用位置 fallback，無跨重啟身份保證", factoryID, zone.Position)
		}
		if _, duplicate := seenKeys[key]; duplicate {
			s.factories[factoryID] = before
			return nil, fmt.Errorf("[%s] 同一抓取批次有重複 zone identity %s", factoryID, key)
		}
		seenKeys[key] = struct{}{}
		if id, exists := state.bindings[key]; exists {
			zone.ZoneID = id
			continue
		}

		id := state.nextZoneID
		for {
			if _, used := state.usedIDs[id]; !used {
				break
			}
			id++
		}
		state.bindings[key] = id
		state.usedIDs[id] = key
		state.nextZoneID = id + 1
		zone.ZoneID = id
		changed = true
	}

	if !changed {
		return resolved, nil
	}
	if err := s.persistLocked(); err != nil {
		s.factories[factoryID] = before
		return nil, err
	}
	s.authoritative[factoryID] = true
	return resolved, nil
}

func (s *Store) persistLocked() error {
	raw := fileState{Version: stateVersion, Factories: map[string]factoryFileState{}}
	factoryIDs := make([]string, 0, len(s.factories))
	for factoryID := range s.factories {
		factoryIDs = append(factoryIDs, factoryID)
	}
	sort.Strings(factoryIDs)
	for _, factoryID := range factoryIDs {
		state := s.factories[factoryID]
		keys := make([]string, 0, len(state.bindings))
		for key := range state.bindings {
			keys = append(keys, key)
		}
		sort.Strings(keys)
		bindings := make([]binding, 0, len(keys))
		for _, key := range keys {
			bindings = append(bindings, binding{IdentityKey: key, ZoneID: state.bindings[key]})
		}
		raw.Factories[factoryID] = factoryFileState{NextZoneID: state.nextZoneID, Bindings: bindings}
	}
	data, err := json.MarshalIndent(raw, "", "  ")
	if err != nil {
		return fmt.Errorf("序列化 zone identity state 失敗: %w", err)
	}
	data = append(data, '\n')

	dir := filepath.Dir(s.path)
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return fmt.Errorf("建立 zone identity state 目錄失敗: %w", err)
	}
	f, err := os.CreateTemp(dir, filepath.Base(s.path)+".tmp-")
	if err != nil {
		return fmt.Errorf("建立 zone identity 暫存檔失敗: %w", err)
	}
	tmp := f.Name()
	cleanup := func() { _ = os.Remove(tmp) }
	if err := f.Chmod(0o600); err != nil {
		_ = f.Close()
		cleanup()
		return fmt.Errorf("設定 zone identity 暫存檔權限失敗: %w", err)
	}
	if _, err := f.Write(data); err != nil {
		_ = f.Close()
		cleanup()
		return fmt.Errorf("寫入 zone identity 暫存檔失敗: %w", err)
	}
	if err := f.Sync(); err != nil {
		_ = f.Close()
		cleanup()
		return fmt.Errorf("同步 zone identity 暫存檔失敗: %w", err)
	}
	if err := f.Close(); err != nil {
		cleanup()
		return fmt.Errorf("關閉 zone identity 暫存檔失敗: %w", err)
	}
	if err := os.Rename(tmp, s.path); err != nil {
		cleanup()
		return fmt.Errorf("更新 zone identity state 失敗: %w", err)
	}
	return nil
}
