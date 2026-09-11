package service

import (
	"fmt"

	"solar_mqtt_go/internal/config"
	"solar_mqtt_go/internal/scraper"
	"solar_mqtt_go/internal/storage"
	"solar_mqtt_go/internal/zoneidentity"
)

type zoneIdentityResolver interface {
	ResolveZones(factoryID string, zones []scraper.Zone) ([]scraper.Zone, error)
}

func prepareZoneIdentityResolver(cfg *config.Config, st *storage.Storage) (zoneIdentityResolver, error) {
	store, err := zoneidentity.Open(zoneidentity.PathForConfig(cfg.ConfigPath()))
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
