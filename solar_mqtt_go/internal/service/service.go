// Package service 實作單廠 worker（FactoryService）與多廠 manager
// （FactoryServiceManager），對應 Python solar/service.py。
//
// 控制契約：
//   - cmd/get-config → 發佈 retained sanitized state 與 non-retained result
//   - cmd/set → 套用 allowlist；state 不會觸發自身的 command handler
package service

import (
	"context"
	"fmt"
	"math"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"

	"solar_mqtt_go/internal/anomaly"
	"solar_mqtt_go/internal/config"
	"solar_mqtt_go/internal/discovery"
	"solar_mqtt_go/internal/display"
	"solar_mqtt_go/internal/heartbeat"
	"solar_mqtt_go/internal/mqttbus"
	"solar_mqtt_go/internal/schedule"
	"solar_mqtt_go/internal/scraper"
	"solar_mqtt_go/internal/storage"
)

// JSONPublisher 服務層對 bus 的最小依賴（*mqttbus.Bus 滿足此介面）。
type JSONPublisher interface {
	Publish(topic string, payload string, retain bool) bool
	PublishJSON(topic string, data any, retain bool) bool
}

// FactoryBus 服務層對 bus 的完整依賴（含廠別 handler 註冊）。
type FactoryBus interface {
	JSONPublisher
	RegisterFactory(factoryID string, handler mqttbus.ControlHandler)
	UnregisterFactory(factoryID string)
}

// nowTS 對應 Python datetime.now().isoformat(timespec="seconds")。
func nowTS() string {
	return time.Now().Format("2006-01-02T15:04:05")
}

// round3 對應 Python round(x, 3)（IEEE half-even）。
func round3(v float64) float64 {
	s := strconv.FormatFloat(v, 'f', 3, 64)
	f, err := strconv.ParseFloat(s, 64)
	if err != nil {
		return math.Round(v*1000) / 1000
	}
	return f
}

// isFinite 對應 Python isfinite（nil 與 NaN/Inf 皆視為非有限）。
func isFinite(v *float64) bool {
	return v != nil && !math.IsInf(*v, 0) && !math.IsNaN(*v)
}

// summaryEnvelope 對應 Python {**summary, "factory":..., "timestamp":...}。
type summaryEnvelope struct {
	scraper.Summary
	Factory   string `json:"factory"`
	Timestamp string `json:"timestamp"`
}

// zoneEnvelope 對應 Python {**z, "factory":..., "timestamp":...}。
type zoneEnvelope struct {
	scraper.Zone
	Factory   string `json:"factory"`
	Timestamp string `json:"timestamp"`
}

// FactoryService 單廠主迴圈（獨立 goroutine）。
type FactoryService struct {
	factoryID string
	cfg       *config.Config
	bus       FactoryBus
	st        *storage.Storage

	scraper   *scraper.Scraper
	zoneIDs   zoneIdentityResolver
	anomaly   *anomaly.Detector
	heartbeat *heartbeat.Heartbeat
	haTracker *discovery.Tracker

	saveConfig          func() error
	putProcessedCommand func(storage.CommandRecord) error
	stopCtx             context.Context
	done                chan struct{}
	startOnce           sync.Once
	controlMu           sync.Mutex
	configRevision      uint64

	lastCompleteZoneIDs map[int]struct{} // nil = 尚無完整基準
	stageConfig         func(factoryID, requestID string) (*config.StagedSave, error)
	commitStaged        func(*config.StagedSave) error
	failClosed          func()
}

// newFactoryService 建立單廠服務（未啟動）。
func newFactoryService(factoryID string, cfg *config.Config, bus FactoryBus, st *storage.Storage, stopCtx context.Context) *FactoryService {
	fac := cfg.Factory(factoryID)
	if fac == nil {
		panic(fmt.Sprintf("factory_id=%s 不在設定中", factoryID))
	}
	baseURL, _ := fac["base_url"].(string)
	user, _ := fac["login_user"].(string)
	pass, _ := fac["login_pass"].(string)

	sc := scraper.New(factoryID, baseURL, user, pass)

	heartbeatPublish := func(topic, payload string) bool {
		return bus.Publish(topic, payload, cfg.GetBool("mqtt_retain_heartbeat", false))
	}
	hb := heartbeat.New(factoryID, cfg.GetString("mqtt_prefix", "solar"),
		cfg.GetInt("heartbeat_interval", 30), heartbeatPublish)

	s := &FactoryService{
		factoryID:           factoryID,
		cfg:                 cfg,
		bus:                 bus,
		st:                  st,
		scraper:             sc,
		heartbeat:           hb,
		haTracker:           discovery.NewTracker(cfg.GetString("ha_discovery_prefix", "homeassistant"), cfg.GetString("mqtt_prefix", "solar"), factoryID),
		saveConfig:          cfg.SaveDefault,
		putProcessedCommand: st.PutProcessedCommand,
		stopCtx:             stopCtx,
		done:                make(chan struct{}),
	}
	// anomaly 告警回呼接線（Python on_alert=self._on_alert）：WARN/INFO 發佈 + 寫入 storage
	s.anomaly = anomaly.New(cfg.GetInt("anomaly_daytime_zero_minutes", 5), s.onAlert)
	s.commitStaged = func(staged *config.StagedSave) error { return staged.Commit() }
	return s
}

// Start 註冊 handler、啟動心跳與主迴圈、發佈 running 狀態。
func (s *FactoryService) Start() {
	s.bus.RegisterFactory(s.factoryID, s.onControl)
	s.heartbeat.Start()
	s.publishStatus("running", "")
	s.startOnce.Do(func() {
		go func() {
			defer close(s.done)
			s.loop()
		}()
	})
}

// Stop 停止心跳、發佈 stopped、註銷 handler 並等待迴圈結束。
func (s *FactoryService) Stop() {
	s.heartbeat.Stop()
	s.publishStatus("stopped", "")
	s.bus.UnregisterFactory(s.factoryID)
	select {
	case <-s.done:
	case <-time.After(5 * time.Second):
	}
}

// loop 主迴圈：夜間暫停 → 抓取 → 等待 interval（可被 context 即時喚醒）。
func (s *FactoryService) loop() {
	for {
		if s.stopCtx.Err() != nil {
			return
		}

		// 夜間暫停
		if s.cfg.GetBool("night_pause", false) {
			now := time.Now()
			lat := s.cfg.GetFloat("night_lat", 24.9576)
			lon := s.cfg.GetFloat("night_lon", 121.2254)
			pad := s.cfg.GetInt("night_padding_min", 30)
			if !schedule.IsDaytime(now, lat, lon, pad) {
				wait := schedule.SecondsUntilSunrise(now, lat, lon, pad)
				s.publishStatus("paused", fmt.Sprintf("night, wake in %ds", wait))
				fmt.Printf("[%s] 夜間暫停，%ds 後恢復\n", s.factoryID, wait)
				if !s.waitSeconds(wait) {
					return
				}
				continue
			}
		}

		s.runOnce()

		interval := s.cfg.GetInt("interval", 60)
		if interval < 1 {
			interval = 1
		}
		if !s.waitSeconds(interval) {
			return
		}
	}
}

// waitSeconds 等待 n 秒；context 取消即回 false（對應 Python stop_event.wait）。
func (s *FactoryService) waitSeconds(n int) bool {
	select {
	case <-s.stopCtx.Done():
		return false
	case <-time.After(time.Duration(n) * time.Second):
		return true
	}
}

// runOnce 單輪：抓取 → 身份解析 → 發佈 → 記錄 → 異常檢查 → discovery。
func (s *FactoryService) runOnce() bool {
	summary, zones, err := s.scraper.Fetch()
	if err != nil {
		fmt.Printf("[%s] 抓取失敗: %v，下一輪重新登入\n", s.factoryID, err)
		s.scraper.ResetSession()
		s.publishStatus("error", err.Error())
		return false
	}
	if s.zoneIDs != nil {
		zones, err = s.zoneIDs.ResolveZones(s.factoryID, zones)
		if err != nil {
			fmt.Printf("[%s] zone identity 失敗: %v\n", s.factoryID, err)
			s.publishStatus("error", "zone identity: "+err.Error())
			return false
		}
	}

	// 日間旗標（給異常偵測用）：night_pause 停用時一律視為白天
	daytime := true
	if s.cfg.GetBool("night_pause", false) {
		now := time.Now()
		daytime = schedule.IsDaytime(now,
			s.cfg.GetFloat("night_lat", 24.9576),
			s.cfg.GetFloat("night_lon", 121.2254),
			s.cfg.GetInt("night_padding_min", 30))
	}

	s.publishData(summary, zones)
	s.st.Record(s.factoryID, summary, zones, "")
	s.anomaly.Check(s.factoryID, summary, zones, daytime, time.Now())
	s.maybePublishDiscovery(zones)

	// 對應 Python _run_once 的 print_result：每輪成功都印出結果
	display.PrintResult(s.factoryID, summary, zones, true,
		s.cfg.GetString("mqtt_prefix", "solar"),
		s.cfg.GetString("mqtt_host", "localhost"),
		s.cfg.GetInt("mqtt_port", 1883))

	return true
}

// applyFactoryTotal 對應 Python _apply_factory_total：完整時算總量並寫入 summary，
// 不完整時省略 total_mwh 並發 WARN。回傳總量（不完整為 nil）。
func (s *FactoryService) applyFactoryTotal(summary *scraper.Summary, zones []scraper.Zone) *float64 {
	currentIDs := map[int]struct{}{}
	for _, z := range zones {
		currentIDs[z.ZoneID] = struct{}{}
	}

	var missingIDs []int
	for id := range s.lastCompleteZoneIDs {
		if _, ok := currentIDs[id]; !ok {
			missingIDs = append(missingIDs, id)
		}
	}

	var invalidIDs []int
	var totals []float64
	for _, z := range zones {
		if !isFinite(z.TotalMwh) {
			invalidIDs = append(invalidIDs, z.ZoneID)
		} else {
			totals = append(totals, *z.TotalMwh)
		}
	}

	if len(zones) == 0 || len(missingIDs) > 0 || len(invalidIDs) > 0 {
		summary.TotalMwh = nil
		affected := map[string]struct{}{}
		for _, id := range missingIDs {
			affected[fmt.Sprintf("%d", id)] = struct{}{}
		}
		for _, id := range invalidIDs {
			affected[fmt.Sprintf("%d", id)] = struct{}{}
		}
		keys := make([]string, 0, len(affected))
		for k := range affected {
			keys = append(keys, k)
		}
		sort.Strings(keys)
		detail := "zone list empty"
		if len(keys) > 0 {
			shown := keys
			suffix := ""
			if len(shown) > 10 {
				shown = shown[:10]
				suffix = fmt.Sprintf(" 等 %d 個 zone", len(keys))
			}
			parts := make([]string, 0, len(shown))
			for _, k := range shown {
				parts = append(parts, "zone "+k)
			}
			detail = strings.Join(parts, ", ") + suffix
		}
		s.onAlert(s.factoryID, "WARN", "廠區累積總量不完整: "+detail)
		return nil
	}

	sum := 0.0
	for _, v := range totals {
		sum += v
	}
	total := round3(sum)
	summary.TotalMwh = &total
	s.lastCompleteZoneIDs = currentIDs
	return &total
}

// publishData 對應 Python _publish_data：完整 topic 集發佈。
func (s *FactoryService) publishData(summary *scraper.Summary, zones []scraper.Zone) {
	prefix := s.cfg.GetString("mqtt_prefix", "solar")
	factory := s.factoryID
	ts := nowTS()
	base := prefix + "/" + factory

	retainSummary := s.cfg.GetBool("mqtt_retain_summary", true)
	retainZone := s.cfg.GetBool("mqtt_retain_zone", true)
	totalMwh := s.applyFactoryTotal(summary, zones)

	s.bus.PublishJSON(base+"/summary", summaryEnvelope{*summary, factory, ts}, retainSummary)
	s.bus.PublishJSON(base+"/total_power_kw", map[string]any{"value": summary.TotalPowerKw}, retainSummary)
	s.bus.PublishJSON(base+"/today_mwh", map[string]any{"value": summary.TodayMwh}, retainSummary)
	s.bus.PublishJSON(base+"/month_mwh", map[string]any{"value": summary.MonthMwh}, retainSummary)
	if totalMwh != nil {
		s.bus.PublishJSON(base+"/total_mwh", map[string]any{"value": *totalMwh}, retainSummary)
	}

	for _, z := range zones {
		s.bus.PublishJSON(fmt.Sprintf("%s/zone/%d", base, z.ZoneID), zoneEnvelope{z, factory, ts}, retainZone)
		for _, key := range []string{"power_kw", "today_kwh", "month_mwh", "total_mwh", "capacity_kwp", "today_hours"} {
			s.bus.PublishJSON(fmt.Sprintf("%s/zone/%d/%s", base, z.ZoneID, key),
				map[string]any{"value": zoneField(&z, key)}, retainZone)
		}
	}
}

// zoneField 取 zone 欄位值（*float64 → nil / float64）。
func zoneField(z *scraper.Zone, key string) any {
	var v *float64
	switch key {
	case "power_kw":
		v = z.PowerKw
	case "today_kwh":
		v = z.TodayKwh
	case "month_mwh":
		v = z.MonthMwh
	case "total_mwh":
		v = z.TotalMwh
	case "capacity_kwp":
		v = z.CapacityKwp
	case "today_hours":
		v = z.TodayHours
	}
	if v == nil {
		return nil
	}
	return *v
}

// publishStatus 對應 Python _publish_status。
func (s *FactoryService) publishStatus(status, message string) {
	s.bus.PublishJSON(
		fmt.Sprintf("%s/%s/status", s.cfg.GetString("mqtt_prefix", "solar"), s.factoryID),
		map[string]any{
			"status":    status,
			"message":   message,
			"timestamp": nowTS(),
		},
		s.cfg.GetBool("mqtt_retain_status", true),
	)
}

// maybePublishDiscovery 對應 Python _maybe_publish_discovery。
func (s *FactoryService) maybePublishDiscovery(zones []scraper.Zone) {
	if !s.cfg.GetBool("ha_discovery", false) {
		return
	}
	publishFn := func(topic, payload string, retain bool) bool {
		return s.bus.Publish(topic, payload, retain)
	}
	s.haTracker.MaybePublish(publishFn, s.cfg.GetString("mqtt_prefix", "solar"), zones)
}

// onAlert 對應 Python _on_alert：發 alert topic、寫 storage、印出。
func (s *FactoryService) onAlert(factoryID, level, message string) {
	s.bus.PublishJSON(
		fmt.Sprintf("%s/%s/alert", s.cfg.GetString("mqtt_prefix", "solar"), factoryID),
		map[string]any{
			"level":     level,
			"message":   message,
			"timestamp": nowTS(),
		},
		s.cfg.GetBool("mqtt_retain_alert", false),
	)
	s.st.RecordAlert(factoryID, level, message)
	fmt.Printf("[%s] %s: %s\n", factoryID, level, message)
}

// ── Manager ──

// FactoryServiceManager 多廠容器（對應 Python FactoryServiceManager）。
type FactoryServiceManager struct {
	cfg      *config.Config
	bus      *mqttbus.Bus
	st       *storage.Storage
	ctx      context.Context
	cancel   context.CancelFunc
	services map[string]*FactoryService
	zoneIDs  zoneIdentityResolver
	reasonMu sync.Mutex
	reason   StopReason

	ledgerPurgeOnce sync.Once
	ledgerPurgeDone chan struct{}
}

type purgeTicker interface {
	C() <-chan time.Time
	Stop()
}

type timePurgeTicker struct{ ticker *time.Ticker }

func (t timePurgeTicker) C() <-chan time.Time { return t.ticker.C }
func (t timePurgeTicker) Stop()               { t.ticker.Stop() }

var newPurgeTicker = func(interval time.Duration) purgeTicker {
	return timePurgeTicker{ticker: time.NewTicker(interval)}
}

const processedCommandPurgeInterval = time.Hour

// StopReason identifies why the manager stopped.
type StopReason uint8

const (
	StopReasonNone StopReason = iota
	StopReasonStop
)

// NewManager 建立多廠 manager。
func NewManager(cfg *config.Config, bus *mqttbus.Bus, st *storage.Storage) *FactoryServiceManager {
	ctx, cancel := context.WithCancel(context.Background())
	return &FactoryServiceManager{
		cfg:      cfg,
		bus:      bus,
		st:       st,
		ctx:      ctx,
		cancel:   cancel,
		services: map[string]*FactoryService{},
	}
}

// StartAll 啟動所有廠 worker。
func (m *FactoryServiceManager) StartAll() error {
	if err := m.recoverPendingConfig(); err != nil {
		fmt.Printf("警告：pending config recovery 失敗：%v，停止接收 control\n", err)
		m.cancel()
		return err
	}
	if m.zoneIDs == nil {
		resolver, err := prepareZoneIdentityResolver(m.cfg, m.st)
		if err != nil {
			fmt.Printf("警告：zone identity 初始化失敗：%v，停止資料擷取\n", err)
			m.cancel()
			return err
		}
		m.zoneIDs = resolver
	}
	m.startLedgerPurge()
	for _, fid := range m.cfg.FactoryIDs() {
		svc := newFactoryService(fid, m.cfg, m.bus, m.st, m.ctx)
		svc.zoneIDs = m.zoneIDs
		svc.stageConfig = func(factoryID, requestID string) (*config.StagedSave, error) {
			return m.cfg.StageRemoteSet(m.cfg.ConfigPath(), factoryID, requestID)
		}
		svc.failClosed = m.cancel
		svc.Start()
		m.services[fid] = svc
	}
	return nil
}

func (m *FactoryServiceManager) recoverPendingConfig() error {
	return m.cfg.RecoverPending(m.cfg.ConfigPath(), func(factoryID, requestID string) (string, bool, error) {
		if m.st == nil || !m.st.Enabled() {
			return "", false, fmt.Errorf("processed command ledger unavailable")
		}
		record, found, err := m.st.GetProcessedCommand(factoryID, requestID)
		if err != nil || !found || record == nil {
			return "", found, err
		}
		return record.Status, true, nil
	})
}

// StopAll 停止所有廠 worker。
func (m *FactoryServiceManager) StopAll() {
	m.cancel()
	for _, svc := range m.services {
		svc.Stop()
	}
	m.services = map[string]*FactoryService{}
	if m.ledgerPurgeDone != nil {
		<-m.ledgerPurgeDone
	}
	if m.bus != nil {
		m.bus.Disconnect()
	}
}

func (m *FactoryServiceManager) startLedgerPurge() {
	m.ledgerPurgeOnce.Do(func() {
		if m.st == nil || !m.st.Enabled() {
			return
		}
		done := make(chan struct{})
		m.ledgerPurgeDone = done
		go func() {
			ticker := newPurgeTicker(processedCommandPurgeInterval)
			defer ticker.Stop()
			defer close(done)
			for {
				select {
				case <-ticker.C():
					if err := m.st.PurgeProcessedCommands(controlNow().UTC().Add(-controlLedgerRetention)); err != nil {
						fmt.Printf("警告：processed command purge 失敗：%v\n", err)
					}
				case <-m.ctx.Done():
					return
				}
			}
		}()
	})
}

// requestStop records the first terminal reason and wakes the manager.
// It reports whether this call won the terminal transition.
func (m *FactoryServiceManager) requestStop(reason StopReason) bool {
	m.reasonMu.Lock()
	first := false
	if m.reason == StopReasonNone {
		m.reason = reason
		first = true
	}
	m.reasonMu.Unlock()
	m.cancel()
	return first
}

// RequestStop 觸發優雅正常停止（Ctrl+C 第一次 / SIGTERM）。
func (m *FactoryServiceManager) RequestStop() { m.requestStop(StopReasonStop) }

// StopReason returns the first terminal reason observed by this manager.
func (m *FactoryServiceManager) StopReason() StopReason {
	m.reasonMu.Lock()
	defer m.reasonMu.Unlock()
	return m.reason
}

// Wait 阻塞直到 stop context 被取消（Ctrl+C 或 restart 指令）。
func (m *FactoryServiceManager) Wait() {
	<-m.ctx.Done()
}
