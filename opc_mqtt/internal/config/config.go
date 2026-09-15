package config

import (
	"encoding/json"
	"fmt"
	"log"
	"os"
	"strconv"
	"sync"
)

var mutexInitMu sync.Mutex

type TagConfig struct {
	ID         string `json:"id"`
	DdeItem    string `json:"dde_item"`
	OpcAddress string `json:"opc_address,omitempty"` // legacy: migrated to dde_item on load
	Desc       string `json:"desc"`
	Unit       string `json:"unit"`
	Decimals   int    `json:"decimals"`
	Enabled    bool   `json:"enabled"`
}

type FormulaItem struct {
	Tag string `json:"tag"`
	Op  string `json:"op"` // "+" or "-"
}

type VirtualTag struct {
	Name     string        `json:"name"`
	Unit     string        `json:"unit"`
	Decimals int           `json:"decimals"`
	Enabled  bool          `json:"enabled"`
	Formula  []FormulaItem `json:"formula"`
}

type Config struct {
	Broker          string        `json:"broker"`
	BrokerPort      int           `json:"broker_port"`
	MqttPrefix      string        `json:"mqtt_prefix"`
	MqttQos         byte          `json:"mqtt_qos"`
	MqttRetain      bool          `json:"mqtt_retain"`
	PublishInterval int           `json:"publish_interval"`
	PublishRaw      bool          `json:"publish_raw"`
	PublishVirtual  bool          `json:"publish_virtual"`
	DdeService      string        `json:"dde_service"`
	DdeTopic        string        `json:"dde_topic"`
	DdeTimeoutMs    int           `json:"dde_timeout_ms"`
	OpcProgID       string        `json:"opc_prog_id,omitempty"`    // legacy
	OpcTimeoutMs    int           `json:"opc_timeout_ms,omitempty"` // legacy
	WebAddr         string        `json:"web_addr"`
	WebPort         int           `json:"web_port"`
	Tags            []TagConfig   `json:"tags"`
	VirtualTags     []VirtualTag  `json:"virtual_tags"`
	mu              *sync.RWMutex `json:"-"`
	path            string        `json:"-"`
}

// Load 從 path 讀取設定；檔案不存在時回傳預設值。
func Load(path string) (*Config, error) {
	c := &Config{
		Broker:          DefaultBroker,
		BrokerPort:      DefaultBrokerPort,
		MqttPrefix:      DefaultMqttPrefix,
		MqttQos:         DefaultMqttQos,
		MqttRetain:      DefaultMqttRetain,
		PublishInterval: DefaultPublishInterval,
		PublishRaw:      DefaultPublishRaw,
		PublishVirtual:  DefaultPublishVirtual,
		DdeService:      DefaultDdeService,
		DdeTopic:        DefaultDdeTopic,
		DdeTimeoutMs:    DefaultDdeTimeoutMs,
		WebAddr:         DefaultWebAddr,
		WebPort:         DefaultWebPort,
		Tags:            defaultTags(),
		VirtualTags:     defaultVirtualTags(),
		mu:              &sync.RWMutex{},
		path:            path,
	}
	data, err := os.ReadFile(path)
	if err != nil {
		if os.IsNotExist(err) {
			return c, nil
		}
		log.Printf("read config %q failed: %v", path, err)
		return nil, fmt.Errorf("read config %q: %w", path, err)
	}
	if err := json.Unmarshal(data, c); err != nil {
		return nil, fmt.Errorf("parse config %q: %w", path, err)
	}
	c.mu = &sync.RWMutex{}
	c.path = path
	// 補齊 JSON 中為零值的欄位
	if c.BrokerPort == 0 {
		c.BrokerPort = DefaultBrokerPort
	}
	if c.PublishInterval == 0 {
		c.PublishInterval = DefaultPublishInterval
	}
	if c.WebPort == 0 {
		c.WebPort = DefaultWebPort
	}
	if c.Broker == "" {
		c.Broker = DefaultBroker
	}
	if c.MqttPrefix == "" {
		c.MqttPrefix = DefaultMqttPrefix
	}
	if c.WebAddr == "" {
		c.WebAddr = DefaultWebAddr
	}
	NormalizeDDE(c)
	return c, nil
}

// NormalizeDDE applies direct-DDE defaults and migrates settings written by
// older OPC releases. It is safe to call on a detached Config value before
// validation or replacement.
func NormalizeDDE(c *Config) {
	if c.DdeService == "" {
		c.DdeService = DefaultDdeService
	}
	if c.DdeTopic == "" {
		c.DdeTopic = DefaultDdeTopic
	}
	if c.DdeTimeoutMs <= 0 {
		if c.OpcTimeoutMs > 0 {
			c.DdeTimeoutMs = c.OpcTimeoutMs
		} else {
			c.DdeTimeoutMs = DefaultDdeTimeoutMs
		}
	}
	for i := range c.Tags {
		if c.Tags[i].DdeItem == "" {
			// The working VB.NET client requests the InTouch tag ID directly.
			c.Tags[i].DdeItem = c.Tags[i].ID
		}
		c.Tags[i].OpcAddress = ""
	}
	c.OpcProgID = ""
	c.OpcTimeoutMs = 0
}

// Save 將目前設定寫回原始路徑。
func (c *Config) Save() error {
	mu := c.ensureMutex()
	mu.RLock()
	snap := c.snapshotLocked()
	path := c.path
	mu.RUnlock()
	data, err := json.MarshalIndent(snap, "", "  ")
	if err != nil {
		return fmt.Errorf("marshal config: %w", err)
	}
	if err := os.WriteFile(path, data, 0644); err != nil {
		log.Printf("write config %q failed: %v", path, err)
		return fmt.Errorf("write config %q: %w", path, err)
	}
	return nil
}

// Get 回傳目前設定的深拷貝快照（thread-safe）。
func (c *Config) Get() Config {
	mu := c.ensureMutex()
	mu.RLock()
	defer mu.RUnlock()
	return c.snapshotLocked()
}

// Replace 原子替換設定，保留內部 path。
func (c *Config) Replace(newCfg Config) {
	mu := c.ensureMutex()
	mu.Lock()
	defer mu.Unlock()
	path := c.path
	*c = cloneConfig(newCfg)
	c.mu = mu
	c.path = path
}

// ApplyCLI 以命令列參數覆蓋設定（非空字串才覆蓋）。
func (c *Config) ApplyCLI(broker, port, interval, webPort string) {
	mu := c.ensureMutex()
	mu.Lock()
	defer mu.Unlock()
	if broker != "" {
		c.Broker = broker
	}
	if port != "" {
		if v, err := strconv.Atoi(port); err == nil {
			c.BrokerPort = v
		}
	}
	if interval != "" {
		if v, err := strconv.Atoi(interval); err == nil {
			c.PublishInterval = v
		}
	}
	if webPort != "" {
		if v, err := strconv.Atoi(webPort); err == nil {
			c.WebPort = v
		}
	}
}

func (c *Config) ensureMutex() *sync.RWMutex {
	mutexInitMu.Lock()
	defer mutexInitMu.Unlock()
	if c.mu == nil {
		c.mu = &sync.RWMutex{}
	}
	return c.mu
}

func (c *Config) snapshotLocked() Config {
	return cloneConfig(*c)
}

func cloneConfig(c Config) Config {
	return Config{
		Broker:          c.Broker,
		BrokerPort:      c.BrokerPort,
		MqttPrefix:      c.MqttPrefix,
		MqttQos:         c.MqttQos,
		MqttRetain:      c.MqttRetain,
		PublishInterval: c.PublishInterval,
		PublishRaw:      c.PublishRaw,
		PublishVirtual:  c.PublishVirtual,
		DdeService:      c.DdeService,
		DdeTopic:        c.DdeTopic,
		DdeTimeoutMs:    c.DdeTimeoutMs,
		OpcProgID:       c.OpcProgID,
		OpcTimeoutMs:    c.OpcTimeoutMs,
		WebAddr:         c.WebAddr,
		WebPort:         c.WebPort,
		Tags:            cloneTags(c.Tags),
		VirtualTags:     cloneVirtualTags(c.VirtualTags),
		mu:              &sync.RWMutex{},
		path:            c.path,
	}
}

func cloneTags(tags []TagConfig) []TagConfig {
	if tags == nil {
		return nil
	}
	return append([]TagConfig(nil), tags...)
}

func cloneVirtualTags(tags []VirtualTag) []VirtualTag {
	if tags == nil {
		return nil
	}
	cloned := make([]VirtualTag, len(tags))
	for i, tag := range tags {
		cloned[i] = tag
		if tag.Formula != nil {
			cloned[i].Formula = append([]FormulaItem(nil), tag.Formula...)
		}
	}
	return cloned
}
