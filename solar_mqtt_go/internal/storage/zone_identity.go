package storage

import (
	"database/sql"
	"fmt"
	"strings"
)

// LatestZoneIdentitySnapshot returns the newest single-timestamp serial→zone_id
// snapshot plus the next numeric floor above every historically used zone id.
// It is read-only bootstrap evidence; the durable identity registry lives in
// the collector-owned sidecar, not SQLite.
func (s *Storage) LatestZoneIdentitySnapshot(factoryID string) (map[string]int, int, error) {
	if s == nil {
		return map[string]int{}, 1, nil
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	if !s.enabled || s.db == nil {
		return map[string]int{}, 1, nil
	}

	var latest sql.NullString
	var maxID int
	if err := s.db.QueryRow(
		"SELECT MAX(ts), COALESCE(MAX(zone_id), 0) FROM zone WHERE factory_id = ?",
		factoryID,
	).Scan(&latest, &maxID); err != nil {
		return nil, 0, err
	}
	nextFloor := maxID + 1
	if nextFloor < 1 {
		nextFloor = 1
	}
	if !latest.Valid || latest.String == "" {
		return map[string]int{}, nextFloor, nil
	}

	rows, err := s.db.Query(
		`SELECT serial, zone_id
		 FROM zone
		 WHERE factory_id = ? AND ts = ? AND TRIM(COALESCE(serial, '')) <> ''
		 ORDER BY zone_id ASC`,
		factoryID,
		latest.String,
	)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	bindings := map[string]int{}
	usedIDs := map[int]string{}
	for rows.Next() {
		var serial string
		var zoneID int
		if err := rows.Scan(&serial, &zoneID); err != nil {
			return nil, 0, err
		}
		serial = strings.TrimSpace(serial)
		if serial == "" || zoneID <= 0 {
			return nil, 0, fmt.Errorf("factory %s 最新 zone snapshot 含無效 serial/zone_id", factoryID)
		}
		if _, exists := bindings[serial]; exists {
			return nil, 0, fmt.Errorf("factory %s 最新 zone snapshot 有重複 serial=%s", factoryID, serial)
		}
		if other, exists := usedIDs[zoneID]; exists {
			return nil, 0, fmt.Errorf("factory %s 最新 zone snapshot 的 zone_id=%d 同時綁定 %s 與 %s", factoryID, zoneID, other, serial)
		}
		bindings[serial] = zoneID
		usedIDs[zoneID] = serial
	}
	if err := rows.Err(); err != nil {
		return nil, 0, err
	}
	return bindings, nextFloor, nil
}
