// Package mqttbus 提供單一 broker 連線與多廠 control 指令路由
// （對應 Python solar/mqtt_bus.py）。MQTT client 採 eclipse/paho.mqtt.golang，
// broker 操作抽象為 BrokerClient 介面以便測試替換。
package mqttbus

import (
	"crypto/tls"
	"crypto/x509"
	"encoding/json"
	"fmt"
	"net"
	"os"
	"strconv"
	"strings"
	"sync"
	"time"

	mqtt "github.com/eclipse/paho.mqtt.golang"
)

// ControlHandler 處理 {prefix}/{factory}/cmd/{get-config,set} 訊息。
// command 只會是 get-config 或 set；state topic 不會進入此 handler。
type ControlHandler func(command string, payload map[string]any)

// ConnectionOptions contains broker transport/authentication supplied by the
// deployment environment. Credentials are intentionally not part of Config.
type ConnectionOptions struct {
	Host      string
	Port      int
	Prefix    string
	Username  string
	Password  string
	TLSConfig *tls.Config
}

// Validate enforces authenticated local transport or verified TLS remotely.
// A missing credential or unsafe TLS option fails closed before paho connects.
func (o ConnectionOptions) Validate() error {
	host := strings.TrimSpace(o.Host)
	if host == "" {
		return fmt.Errorf("mqtt host is required")
	}
	if o.Port < 1 || o.Port > 65535 {
		return fmt.Errorf("mqtt port is invalid")
	}
	if strings.TrimSpace(o.Prefix) == "" {
		return fmt.Errorf("mqtt prefix is required")
	}
	if strings.TrimSpace(o.Username) == "" || o.Password == "" {
		return fmt.Errorf("external mqtt credentials are required")
	}
	if o.TLSConfig != nil && o.TLSConfig.InsecureSkipVerify {
		return fmt.Errorf("mqtt TLS certificate verification is required")
	}
	if !isLoopbackHost(host) {
		if o.TLSConfig == nil {
			return fmt.Errorf("remote mqtt transport requires TLS")
		}
		if strings.TrimSpace(o.TLSConfig.ServerName) == "" {
			return fmt.Errorf("remote mqtt TLS server name is required")
		}
	}
	return nil
}

// ConnectionOptionsFromEnv loads only external broker credentials/transport
// settings. It never writes them to collector Config or MQTT state.
func ConnectionOptionsFromEnv(host string, port int, prefix string) (ConnectionOptions, error) {
	options := ConnectionOptions{
		Host:     host,
		Port:     port,
		Prefix:   prefix,
		Username: strings.TrimSpace(os.Getenv("SOLAR_MQTT_USERNAME")),
		Password: os.Getenv("SOLAR_MQTT_PASSWORD"),
	}
	caFile := strings.TrimSpace(os.Getenv("SOLAR_MQTT_TLS_CA_FILE"))
	serverName := strings.TrimSpace(os.Getenv("SOLAR_MQTT_TLS_SERVER_NAME"))
	if caFile != "" || serverName != "" {
		if serverName == "" && !isLoopbackHost(host) {
			serverName = strings.Trim(strings.TrimSpace(host), "[]")
		}
		tlsConfig, err := TLSConfigFromCAFile(caFile, serverName)
		if err != nil {
			return ConnectionOptions{}, err
		}
		options.TLSConfig = tlsConfig
	}
	return options, nil
}

// TLSConfigFromCAFile creates a TLS config with certificate verification left
// enabled. An empty CA path uses the platform trust store.
func TLSConfigFromCAFile(caFile, serverName string) (*tls.Config, error) {
	config := &tls.Config{
		MinVersion: tls.VersionTLS12,
		ServerName: strings.TrimSpace(serverName),
	}
	if strings.TrimSpace(caFile) == "" {
		return config, nil
	}
	pemData, err := os.ReadFile(caFile)
	if err != nil {
		return nil, fmt.Errorf("mqtt CA file unavailable: %w", err)
	}
	roots, err := x509.SystemCertPool()
	if err != nil || roots == nil {
		roots = x509.NewCertPool()
	}
	if !roots.AppendCertsFromPEM(pemData) {
		return nil, fmt.Errorf("mqtt CA file contains no certificates")
	}
	config.RootCAs = roots
	return config, nil
}

func isLoopbackHost(host string) bool {
	host = strings.TrimSuffix(strings.ToLower(strings.TrimSpace(host)), ".")
	if host == "localhost" {
		return true
	}
	ip := net.ParseIP(host)
	return ip != nil && ip.IsLoopback()
}

// BrokerClient 抽象 broker 的基本操作（paho client 的薄包裝）。
type BrokerClient interface {
	Publish(topic string, payload string, qos int, retain bool)
	Subscribe(topic string, qos int)
	Unsubscribe(topic string)
	Disconnect()
}

// Bus 單一 broker 連線、多廠路由（對應 Python MqttBus）。
type Bus struct {
	mu                sync.Mutex
	client            BrokerClient
	host              string
	port              int
	prefix            string
	connectionOptions ConnectionOptions

	controlHandlers map[string]ControlHandler
	// subscribed 記錄 (prefix, factory_id) 已訂閱組合，key 為 prefix+"\x00"+factory
	subscribed map[string]struct{}

	// connectFn 供 reconnect 注入測試替換；預設為 b.connectPaho
	connectFn func(ConnectionOptions) bool
}

// New 建立未連線的 Bus。
func New() *Bus {
	b := &Bus{
		host:            "localhost",
		port:            1883,
		prefix:          "solar",
		controlHandlers: map[string]ControlHandler{},
		subscribed:      map[string]struct{}{},
	}
	b.connectFn = b.connectPaho
	return b
}

// Attach 注入 broker client 並設定連線參數（測試與 paho 連線共用）。
func (b *Bus) Attach(c BrokerClient, host string, port int, prefix string) {
	b.mu.Lock()
	defer b.mu.Unlock()
	b.client = c
	b.host = host
	b.port = port
	b.prefix = prefix
	b.connectionOptions.Host = host
	b.connectionOptions.Port = port
	b.connectionOptions.Prefix = prefix
	b.subscribed = map[string]struct{}{}
}

// ClientHost 回傳目前連線的 host（測試用）。
func (b *Bus) ClientHost() string {
	b.mu.Lock()
	defer b.mu.Unlock()
	return b.host
}

// ── paho 包裝 ──

type pahoBroker struct {
	c mqtt.Client
}

// newPahoClientFn keeps the production constructor in one seam so callback
// ordering can be exercised without replacing the bus connection path.
var newPahoClientFn = mqtt.NewClient

func (p *pahoBroker) Publish(topic string, payload string, qos int, retain bool) {
	p.c.Publish(topic, byte(qos), retain, payload)
}

func (p *pahoBroker) Subscribe(topic string, qos int) {
	p.c.Subscribe(topic, byte(qos), nil)
	fmt.Printf("訂閱: %s\n", topic)
}

func (p *pahoBroker) Unsubscribe(topic string) {
	if token := p.c.Unsubscribe(topic); token.Wait() && token.Error() != nil {
		// 靜默（對應 Python except: pass）
	}
	fmt.Printf("取消訂閱: %s\n", topic)
}

func (p *pahoBroker) Disconnect() {
	p.c.Disconnect(250)
}

// ── 註冊 / 註銷 ──

// RegisterFactory 註冊廠別 control handler 並訂閱 command topics。
func (b *Bus) RegisterFactory(factoryID string, handler ControlHandler) {
	b.mu.Lock()
	b.controlHandlers[factoryID] = handler
	prefix := b.prefix
	b.mu.Unlock()
	b.resubscribeFactory(prefix, factoryID)
}

// UnregisterFactory 註銷廠別 handler 並退訂。
func (b *Bus) UnregisterFactory(factoryID string) {
	b.mu.Lock()
	delete(b.controlHandlers, factoryID)
	prefix := b.prefix
	b.mu.Unlock()
	b.unsubscribeFactory(prefix, factoryID)
}

// ── 連線 ──

// ConnectWithOptions connects using externally provisioned auth and transport.
func (b *Bus) ConnectWithOptions(options ConnectionOptions) bool {
	if err := options.Validate(); err != nil {
		fmt.Printf("MQTT connection options rejected: %s\n", err)
		return false
	}
	scheme := "tcp"
	if options.TLSConfig != nil {
		scheme = "ssl"
	}
	broker := fmt.Sprintf("%s://%s", scheme, net.JoinHostPort(options.Host, strconv.Itoa(options.Port)))
	pahoOptions := mqtt.NewClientOptions().
		AddBroker(broker).
		SetUsername(options.Username).
		SetPassword(options.Password).
		SetKeepAlive(60 * time.Second).
		SetAutoReconnect(true).
		SetCleanSession(true).
		SetOnConnectHandler(func(c mqtt.Client) {
			b.OnConnectSuccess()
		}).
		SetDefaultPublishHandler(func(c mqtt.Client, m mqtt.Message) {
			b.HandleMessage(m.Topic(), m.Payload())
		})
	if options.TLSConfig != nil {
		pahoOptions.SetTLSConfig(options.TLSConfig)
	}
	client := newPahoClientFn(pahoOptions)
	pb := &pahoBroker{c: client}
	// paho may invoke OnConnect synchronously from Connect. Attach first so
	// that callback can resubscribe against the live client and current prefix.
	b.Attach(pb, options.Host, options.Port, options.Prefix)
	b.mu.Lock()
	b.connectionOptions = options
	b.mu.Unlock()
	token := client.Connect()
	if !token.WaitTimeout(30*time.Second) || token.Error() != nil {
		errStr := "timeout"
		if token.Error() != nil {
			errStr = token.Error().Error()
		}
		b.mu.Lock()
		if b.client == pb {
			b.client = nil
		}
		b.mu.Unlock()
		fmt.Printf("MQTT 連線失敗: %s\n", errStr)
		return false
	}

	return true
}

// connectPaho 是 ConnectWithOptions 的別名（作為 connectFn 預設值）。
func (b *Bus) connectPaho(options ConnectionOptions) bool {
	return b.ConnectWithOptions(options)
}

// Reconnect 在獨立 goroutine 重連（broker 位址變更後呼叫；對應 Python reconnect）。
func (b *Bus) Reconnect(host string, port int, prefix string) {
	go func() {
		b.mu.Lock()
		old := b.client
		options := b.connectionOptions
		options.Host = host
		options.Port = port
		options.Prefix = prefix
		b.client = nil
		b.mu.Unlock()

		if old != nil {
			old.Disconnect()
		}
		b.connectFn(options)
	}()
}

// Disconnect 中斷連線。
func (b *Bus) Disconnect() {
	b.mu.Lock()
	c := b.client
	b.client = nil
	b.mu.Unlock()
	if c == nil {
		return
	}
	c.Disconnect()
}

// ── 發佈 ──

// Publish 發佈字串 payload（預設 qos=1；對應 Python publish）。
func (b *Bus) Publish(topic string, payload string, retain bool) bool {
	return b.PublishQoS(topic, payload, retain, 1)
}

// PublishQoS 指定 qos 的發佈。
func (b *Bus) PublishQoS(topic string, payload string, retain bool, qos int) bool {
	b.mu.Lock()
	c := b.client
	b.mu.Unlock()
	if c == nil {
		return false
	}
	c.Publish(topic, payload, qos, retain)
	return true
}

// PublishJSON 發佈 JSON payload（ensure_ascii=False 對齊：不跳脫中文與 HTML 字元）。
func (b *Bus) PublishJSON(topic string, data any, retain bool) bool {
	var sb strings.Builder
	enc := json.NewEncoder(&sb)
	enc.SetEscapeHTML(false)
	if err := enc.Encode(data); err != nil {
		fmt.Printf("MQTT publish 失敗 %s: %v\n", topic, err)
		return false
	}
	payload := strings.TrimSuffix(sb.String(), "\n")
	return b.Publish(topic, payload, retain)
}

// ── 訂閱管理 ──

// UpdatePrefix 明確切換 prefix：退訂舊 topic、全廠重訂（對應 Python update_prefix）。
// Bus 不主動感知 CONFIG 變更；此 API 由呼叫端（指令協調層）明確呼叫。
func (b *Bus) UpdatePrefix(newPrefix string) {
	b.mu.Lock()
	if newPrefix == b.prefix {
		b.mu.Unlock()
		return
	}
	oldPrefix := b.prefix
	b.prefix = newPrefix
	factories := make([]string, 0, len(b.controlHandlers))
	for fid := range b.controlHandlers {
		factories = append(factories, fid)
	}
	c := b.client
	b.mu.Unlock()

	if c == nil {
		return
	}
	for _, fid := range factories {
		b.unsubscribeTopics(c, oldPrefix, fid)
		b.resubscribeFactory(newPrefix, fid)
	}
}

// subKey 訂閱集合的 key。
func subKey(prefix, factoryID string) string {
	return prefix + "\x00" + factoryID
}

func (b *Bus) resubscribeFactory(prefix, factoryID string) {
	b.mu.Lock()
	c := b.client
	if c == nil {
		b.mu.Unlock()
		return
	}
	key := subKey(prefix, factoryID)
	if _, ok := b.subscribed[key]; ok {
		b.mu.Unlock()
		return
	}
	b.subscribed[key] = struct{}{}
	b.mu.Unlock()

	for _, suffix := range []string{"cmd/get-config", "cmd/set"} {
		t := prefix + "/" + factoryID + "/" + suffix
		c.Subscribe(t, 1)
	}
}

func (b *Bus) unsubscribeFactory(prefix, factoryID string) {
	b.mu.Lock()
	c := b.client
	b.mu.Unlock()
	if c == nil {
		return
	}
	b.unsubscribeTopics(c, prefix, factoryID)
}

func (b *Bus) unsubscribeTopics(c BrokerClient, prefix, factoryID string) {
	b.mu.Lock()
	delete(b.subscribed, subKey(prefix, factoryID))
	b.mu.Unlock()
	for _, suffix := range []string{"cmd/get-config", "cmd/set"} {
		t := prefix + "/" + factoryID + "/" + suffix
		c.Unsubscribe(t)
	}
}

// ── paho callbacks ──

// OnConnectSuccess 連線成功後清空訂閱紀錄並重訂所有已註冊廠。
func (b *Bus) OnConnectSuccess() {
	b.mu.Lock()
	host, port := b.host, b.port
	b.subscribed = map[string]struct{}{}
	factories := make([]string, 0, len(b.controlHandlers))
	for fid := range b.controlHandlers {
		factories = append(factories, fid)
	}
	b.mu.Unlock()

	fmt.Printf("MQTT 已連線到 %s:%d\n", host, port)
	for _, fid := range factories {
		b.resubscribeFactory(b.currentPrefix(), fid)
	}
}

func (b *Bus) currentPrefix() string {
	b.mu.Lock()
	defer b.mu.Unlock()
	return b.prefix
}

// HandleMessage 訊息分派（對應 Python _on_message）。
func (b *Bus) HandleMessage(topic string, payloadBytes []byte) {
	var payload map[string]any
	if err := json.Unmarshal(payloadBytes, &payload); err != nil {
		fmt.Printf("無效的 JSON: %s\n", topic)
		return
	}
	parts := strings.Split(topic, "/")
	if len(parts) < 4 || parts[len(parts)-2] != "cmd" {
		return
	}
	kind := parts[len(parts)-1]
	if kind != "get-config" && kind != "set" {
		return
	}
	factoryID := parts[len(parts)-3]
	b.mu.Lock()
	prefix := b.prefix
	h := b.controlHandlers[factoryID]
	b.mu.Unlock()
	if strings.Join(parts[:len(parts)-3], "/") != prefix || h == nil {
		return
	}
	b.safeCall(factoryID, kind, func() { h(kind, payload) })
}

// safeCall 保護 handler panic（對應 Python except Exception）。
func (b *Bus) safeCall(factoryID, kind string, fn func()) {
	defer func() {
		if r := recover(); r != nil {
			// Handler errors must not echo command payloads or panic values.
			fmt.Printf("[%s] %s handler panic\n", factoryID, kind)
		}
	}()
	fn()
}
