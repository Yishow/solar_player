package service

import (
	"solar_mqtt_go/internal/scraper"
)

type zoneIdentityResolver interface {
	ResolveZones(factoryID string, zones []scraper.Zone) ([]scraper.Zone, error)
}
