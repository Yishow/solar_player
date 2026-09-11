package config

import (
	"encoding/json"
	"fmt"
	"net/url"
	"os"
	"strings"
)

// ValidateDataPlaneFile checks the on-disk collector configuration before any
// Solar HTTP or MQTT data-plane work is allowed to start. It intentionally
// validates what is explicitly persisted instead of the Config object after
// defaults have been merged, so a missing field cannot be filled silently by
// built-in compatibility defaults.
func ValidateDataPlaneFile(path string) error {
	data, err := os.ReadFile(path)
	if err != nil {
		if os.IsNotExist(err) {
			return fmt.Errorf("Solar 設定檔不存在：%s", path)
		}
		return fmt.Errorf("無法讀取 Solar 設定檔：%w", err)
	}

	var raw map[string]any
	if err := json.Unmarshal(data, &raw); err != nil {
		return fmt.Errorf("Solar 設定檔 JSON 無效：%w", err)
	}

	factories, err := explicitFactories(raw)
	if err != nil {
		return err
	}
	seen := make(map[string]struct{}, len(factories))
	for i, fac := range factories {
		id, err := requiredFactoryString(fac, "factory_id", i)
		if err != nil {
			return err
		}
		if _, exists := seen[id]; exists {
			return fmt.Errorf("factories[%d].factory_id 重複：%s", i, id)
		}
		seen[id] = struct{}{}

		baseURL, err := requiredFactoryString(fac, "base_url", i)
		if err != nil {
			return err
		}
		parsed, err := url.Parse(baseURL)
		if err != nil || (parsed.Scheme != "http" && parsed.Scheme != "https") || parsed.Host == "" {
			return fmt.Errorf("factories[%d].base_url 必須是完整的 http/https URL", i)
		}
		if _, err := requiredFactoryString(fac, "login_user", i); err != nil {
			return err
		}
		if _, err := requiredFactoryString(fac, "login_pass", i); err != nil {
			return err
		}
	}
	return nil
}

func explicitFactories(raw map[string]any) ([]map[string]any, error) {
	if value, exists := raw["factories"]; exists {
		items, ok := value.([]any)
		if !ok || len(items) == 0 {
			return nil, fmt.Errorf("factories 必須是非空陣列")
		}
		factories := make([]map[string]any, 0, len(items))
		for i, item := range items {
			fac, ok := item.(map[string]any)
			if !ok {
				return nil, fmt.Errorf("factories[%d] 必須是物件", i)
			}
			factories = append(factories, fac)
		}
		return factories, nil
	}

	legacy := make(map[string]any, len(factorySchemaKeys))
	found := false
	for _, key := range factorySchemaKeys {
		if value, ok := raw[key]; ok {
			legacy[key] = value
			found = true
		}
	}
	if !found {
		return nil, fmt.Errorf("設定檔缺少 factories")
	}
	return []map[string]any{legacy}, nil
}

func requiredFactoryString(factory map[string]any, key string, index int) (string, error) {
	value, exists := factory[key]
	if !exists {
		return "", fmt.Errorf("factories[%d].%s 為必填", index, key)
	}
	text, ok := value.(string)
	if !ok || strings.TrimSpace(text) == "" {
		return "", fmt.Errorf("factories[%d].%s 必須是非空字串", index, key)
	}
	return strings.TrimSpace(text), nil
}
