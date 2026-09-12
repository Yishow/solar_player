package zoneidentity

import (
	"fmt"

	"solar_mqtt_go/internal/config"
	"solar_mqtt_go/internal/storage"
)

// Prepare opens the collector-owned identity state and bootstraps factories
// that are not already authoritative in the sidecar from the latest history.
func Prepare(cfg *config.Config, st *storage.Storage) (*Store, error) {
	store, err := Open(PathForConfig(cfg.ConfigPath()))
	if err != nil {
		return nil, err
	}
	for _, factoryID := range cfg.FactoryIDs() {
		if store.HasAuthoritativeFactory(factoryID) {
			continue
		}
		bindings, nextFloor, err := st.LatestZoneIdentitySnapshot(factoryID)
		if err != nil {
			return nil, fmt.Errorf("[%s] 讀取 zone identity bootstrap snapshot 失敗: %w", factoryID, err)
		}
		if err := store.Bootstrap(factoryID, bindings, nextFloor); err != nil {
			return nil, fmt.Errorf("[%s] 初始化 zone identity state 失敗: %w", factoryID, err)
		}
	}
	return store, nil
}
