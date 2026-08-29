package mqttbus

import (
	"crypto/tls"
	"encoding/json"
	"strings"
	"sync"
	"testing"
	"time"

	mqtt "github.com/eclipse/paho.mqtt.golang"
)

func TestConnectionOptionsFailClosedForControlTransport(t *testing.T) {
	if err := (ConnectionOptions{
		Host: "127.0.0.1", Port: 1883, Prefix: "solar",
	}).Validate(); err == nil {
		t.Fatal("missing external broker credentials must be rejected")
	}
	if err := (ConnectionOptions{
		Host: "broker.example", Port: 1883, Prefix: "solar",
		Username: "solar-control", Password: "fixture-password",
	}).Validate(); err == nil {
		t.Fatal("remote plaintext control transport must be rejected")
	}
	if err := (ConnectionOptions{
		Host: "broker.example", Port: 8883, Prefix: "solar",
		Username: "solar-control", Password: "fixture-password",
		TLSConfig: &tls.Config{InsecureSkipVerify: true}, //nolint:gosec -- rejection test
	}).Validate(); err == nil {
		t.Fatal("TLS with disabled certificate verification must be rejected")
	}
	if err := (ConnectionOptions{
		Host: "broker.example", Port: 8883, Prefix: "solar",
		Username: "solar-control", Password: "fixture-password",
		TLSConfig: &tls.Config{},
	}).Validate(); err == nil {
		t.Fatal("remote TLS without a server name must be rejected")
	}
	if err := (ConnectionOptions{
		Host: "broker.example", Port: 8883, Prefix: "solar",
		Username: "solar-control", Password: "fixture-password",
		TLSConfig: &tls.Config{ServerName: "broker.example"},
	}).Validate(); err != nil {
		t.Fatalf("verified remote TLS should be accepted: %v", err)
	}
}

func TestConnectionOptionsCanBeProvisionedOutsideConfig(t *testing.T) {
	t.Setenv("SOLAR_MQTT_USERNAME", "solar-control")
	t.Setenv("SOLAR_MQTT_PASSWORD", "fixture-password")
	t.Setenv("SOLAR_MQTT_TLS_SERVER_NAME", "broker.example")
	options, err := ConnectionOptionsFromEnv("broker.example", 8883, "solar")
	if err != nil {
		t.Fatal(err)
	}
	if options.Username != "solar-control" || options.Password != "fixture-password" {
		t.Fatalf("external credentials not loaded: %+v", options)
	}
	if options.TLSConfig == nil || options.TLSConfig.InsecureSkipVerify {
		t.Fatalf("remote options must enable certificate verification: %+v", options.TLSConfig)
	}
	if err := options.Validate(); err != nil {
		t.Fatalf("provisioned options rejected: %v", err)
	}
}

// fakeBroker 記錄所有 broker 操作。
type fakeBroker struct {
	mu           sync.Mutex
	published    []pubCall
	subscribed   []string
	unsubscribed []string
	disconnected bool
}

// callbackBeforeConnectReturnClient models paho's production ordering: the
// OnConnect callback can run from Connect before Connect returns to the caller.
type callbackBeforeConnectReturnClient struct {
	mu           sync.Mutex
	onConnect    mqtt.OnConnectHandler
	subscribed   []string
	disconnected bool
}

func (c *callbackBeforeConnectReturnClient) IsConnected() bool      { return true }
func (c *callbackBeforeConnectReturnClient) IsConnectionOpen() bool { return true }
func (c *callbackBeforeConnectReturnClient) Connect() mqtt.Token {
	if c.onConnect != nil {
		c.onConnect(c)
	}
	return immediateToken{}
}
func (c *callbackBeforeConnectReturnClient) Disconnect(uint) {
	c.mu.Lock()
	c.disconnected = true
	c.mu.Unlock()
}
func (c *callbackBeforeConnectReturnClient) Publish(string, byte, bool, interface{}) mqtt.Token {
	return immediateToken{}
}
func (c *callbackBeforeConnectReturnClient) Subscribe(topic string, _ byte, _ mqtt.MessageHandler) mqtt.Token {
	c.mu.Lock()
	c.subscribed = append(c.subscribed, topic)
	c.mu.Unlock()
	return immediateToken{}
}
func (c *callbackBeforeConnectReturnClient) SubscribeMultiple(map[string]byte, mqtt.MessageHandler) mqtt.Token {
	return immediateToken{}
}
func (c *callbackBeforeConnectReturnClient) Unsubscribe(...string) mqtt.Token {
	return immediateToken{}
}
func (c *callbackBeforeConnectReturnClient) AddRoute(string, mqtt.MessageHandler) {}
func (c *callbackBeforeConnectReturnClient) OptionsReader() mqtt.ClientOptionsReader {
	return mqtt.NewOptionsReader(mqtt.NewClientOptions())
}

type immediateToken struct{}

func (immediateToken) Wait() bool                     { return true }
func (immediateToken) WaitTimeout(time.Duration) bool { return true }
func (immediateToken) Done() <-chan struct{}          { done := make(chan struct{}); close(done); return done }
func (immediateToken) Error() error                   { return nil }

type pubCall struct {
	topic   string
	payload string
	qos     int
	retain  bool
}

func (f *fakeBroker) Publish(topic string, payload string, qos int, retain bool) {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.published = append(f.published, pubCall{topic, payload, qos, retain})
}

func (f *fakeBroker) Subscribe(topic string, qos int) {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.subscribed = append(f.subscribed, topic)
}

func (f *fakeBroker) Unsubscribe(topic string) {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.unsubscribed = append(f.unsubscribed, topic)
}

func (f *fakeBroker) Disconnect() {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.disconnected = true
}

func contains(list []string, s string) bool {
	for _, v := range list {
		if v == s {
			return true
		}
	}
	return false
}

func TestBusRetainFlags(t *testing.T) {
	fb := &fakeBroker{}
	b := New()
	b.Attach(fb, "localhost", 1883, "solar")

	// retain 預設語意：由呼叫端決定；payload JSON 不跳脫中文/HTML
	ok := b.PublishJSON("solar/KN/summary", map[string]any{"a": "<b>電</b>"}, true)
	if !ok {
		t.Fatal("publish should succeed")
	}
	// retain=false 的訊息
	b.PublishJSON("solar/KN/alert", map[string]any{"m": "x"}, false)
	// 純字串 publish
	b.Publish("solar/KN/raw", "hello", true)

	fb.mu.Lock()
	defer fb.mu.Unlock()
	if len(fb.published) != 3 {
		t.Fatalf("published = %d", len(fb.published))
	}
	if !fb.published[0].retain {
		t.Error("summary retain should be true")
	}
	if fb.published[1].retain {
		t.Error("alert retain should be false")
	}
	if !fb.published[2].retain {
		t.Error("raw retain should be true")
	}
	for _, p := range fb.published {
		if p.qos != 1 {
			t.Errorf("qos = %d, want 1", p.qos)
		}
	}
	// 中文與 HTML 字元不得被跳脫（對應 ensure_ascii=False）
	if !strings.Contains(fb.published[0].payload, "<b>電</b>") {
		t.Errorf("payload escaped: %s", fb.published[0].payload)
	}
}

func TestBusRouteSetConfig(t *testing.T) {
	fb := &fakeBroker{}
	b := New()
	b.Attach(fb, "localhost", 1883, "solar")

	setCalls := make(chan map[string]any, 4)
	configCalls := make(chan struct{}, 4)
	b.RegisterFactory("KN", func(kind string, p map[string]any) {
		if kind == "set" {
			setCalls <- p
			return
		}
		configCalls <- struct{}{}
	})

	// 訂閱應已發出：cmd/get-config + cmd/set
	fb.mu.Lock()
	if !contains(fb.subscribed, "solar/KN/cmd/get-config") || !contains(fb.subscribed, "solar/KN/cmd/set") {
		t.Errorf("subscribed = %v", fb.subscribed)
	}
	fb.mu.Unlock()

	// set 路由
	b.HandleMessage("solar/KN/cmd/set", []byte(`{"interval": 5, "restart": true}`))
	select {
	case p := <-setCalls:
		if p["interval"] != float64(5) || p["restart"] != true {
			t.Errorf("set payload = %v", p)
		}
	case <-time.After(time.Second):
		t.Fatal("set handler not called")
	}
	// config 路由
	b.HandleMessage("solar/KN/cmd/get-config", []byte(`{}`))
	select {
	case <-configCalls:
	case <-time.After(time.Second):
		t.Fatal("config handler not called")
	}
	// 無效 JSON → 不分派
	b.HandleMessage("solar/KN/cmd/set", []byte(`not json`))
	select {
	case p := <-setCalls:
		t.Errorf("invalid json dispatched: %v", p)
	default:
	}
	// 其他廠 / 其他 topic → 不分派
	b.HandleMessage("solar/CL/cmd/set", []byte(`{}`))
	b.HandleMessage("solar/KN/summary", []byte(`{}`))
	select {
	case p := <-setCalls:
		t.Errorf("wrong topic dispatched: %v", p)
	default:
	}
	// handler panic → 不得擴散
	b.RegisterFactory("PANIC", func(string, map[string]any) { panic("boom") })
	b.HandleMessage("solar/PANIC/cmd/set", []byte(`{}`))

	// unregister → 不再分派
	b.UnregisterFactory("KN")
	b.HandleMessage("solar/KN/cmd/set", []byte(`{}`))
	select {
	case p := <-setCalls:
		t.Errorf("dispatch after unregister: %v", p)
	default:
	}
	// unregister 應退訂
	fb.mu.Lock()
	if !contains(fb.unsubscribed, "solar/KN/cmd/get-config") || !contains(fb.unsubscribed, "solar/KN/cmd/set") {
		t.Errorf("unsubscribed = %v", fb.unsubscribed)
	}
	fb.mu.Unlock()
}

func TestBusExplicitPrefixResubscribe(t *testing.T) {
	fb := &fakeBroker{}
	b := New()
	b.Attach(fb, "localhost", 1883, "solar")
	b.RegisterFactory("KN", nil)
	b.RegisterFactory("CL", nil)

	// 明確 update_prefix：舊 topic 退訂 + 全廠重訂（Python update_prefix 行為）
	b.UpdatePrefix("solar2")

	fb.mu.Lock()
	for _, fac := range []string{"KN", "CL"} {
		if !contains(fb.unsubscribed, "solar/"+fac+"/cmd/get-config") || !contains(fb.unsubscribed, "solar/"+fac+"/cmd/set") {
			t.Errorf("old topics not unsubscribed for %s: %v", fac, fb.unsubscribed)
		}
		if !contains(fb.subscribed, "solar2/"+fac+"/cmd/get-config") || !contains(fb.subscribed, "solar2/"+fac+"/cmd/set") {
			t.Errorf("new topics not subscribed for %s: %v", fac, fb.subscribed)
		}
	}
	fb.mu.Unlock()
	// 相同 prefix → no-op
	fb.mu.Lock()
	n1 := len(fb.subscribed)
	fb.mu.Unlock()
	b.UpdatePrefix("solar2")
	fb.mu.Lock()
	n2 := len(fb.subscribed)
	fb.mu.Unlock()
	if n1 != n2 {
		t.Errorf("same prefix resubscribed: %d -> %d", n1, n2)
	}
}

func TestBusOnConnectResubscribes(t *testing.T) {
	fb := &fakeBroker{}
	b := New()
	b.RegisterFactory("KN", nil)
	b.Attach(fb, "localhost", 1883, "solar")
	// 模擬 broker 連線成功後的 callback：清空訂閱並重訂所有已註冊廠
	b.OnConnectSuccess()

	fb.mu.Lock()
	defer fb.mu.Unlock()
	if !contains(fb.subscribed, "solar/KN/cmd/get-config") || !contains(fb.subscribed, "solar/KN/cmd/set") {
		t.Errorf("resubscribe missing: %v", fb.subscribed)
	}
}

func TestBusConnectWithOptionsCapturesPahoCallbackBeforeConnectReturns(t *testing.T) {
	original := newPahoClientFn
	t.Cleanup(func() { newPahoClientFn = original })

	client := &callbackBeforeConnectReturnClient{}
	newPahoClientFn = func(options *mqtt.ClientOptions) mqtt.Client {
		client.onConnect = options.OnConnect
		return client
	}

	b := New()
	b.RegisterFactory("KN", nil)
	if !b.ConnectWithOptions(ConnectionOptions{
		Host: "localhost", Port: 1883, Prefix: "solar",
		Username: "collector", Password: "secret",
	}) {
		t.Fatal("ConnectWithOptions should succeed")
	}

	client.mu.Lock()
	defer client.mu.Unlock()
	if !contains(client.subscribed, "solar/KN/cmd/get-config") || !contains(client.subscribed, "solar/KN/cmd/set") {
		t.Fatalf("subscriptions lost when OnConnect ran before Connect returned: %v", client.subscribed)
	}
}

func TestBusReconnectWithOptionsResubscribesFromCurrentPrefix(t *testing.T) {
	original := newPahoClientFn
	t.Cleanup(func() { newPahoClientFn = original })

	first := &callbackBeforeConnectReturnClient{}
	second := &callbackBeforeConnectReturnClient{}
	var calls int
	newPahoClientFn = func(options *mqtt.ClientOptions) mqtt.Client {
		calls++
		client := first
		if calls > 1 {
			client = second
		}
		client.onConnect = options.OnConnect
		return client
	}

	b := New()
	b.RegisterFactory("KN", nil)
	options := ConnectionOptions{
		Host: "localhost", Port: 1883, Prefix: "solar",
		Username: "collector", Password: "secret",
	}
	if !b.ConnectWithOptions(options) {
		t.Fatal("initial ConnectWithOptions should succeed")
	}
	b.Reconnect("localhost", 1884, "solar2")

	deadline := time.After(2 * time.Second)
	for {
		second.mu.Lock()
		subscribed := append([]string(nil), second.subscribed...)
		second.mu.Unlock()
		if contains(subscribed, "solar2/KN/cmd/get-config") && contains(subscribed, "solar2/KN/cmd/set") {
			break
		}
		select {
		case <-deadline:
			t.Fatalf("reconnect subscriptions = %v", subscribed)
		case <-time.After(10 * time.Millisecond):
		}
	}
	second.mu.Lock()
	defer second.mu.Unlock()
	if len(second.subscribed) != 2 {
		t.Fatalf("reconnect should subscribe each control topic once, got %v", second.subscribed)
	}
}

func TestBusExplicitReconnect(t *testing.T) {
	fb1 := &fakeBroker{}
	b := New()
	b.Attach(fb1, "localhost", 1883, "solar")
	b.RegisterFactory("KN", nil)

	// 注入假的「重新連線」行為：attach 新的 fake broker
	fb2 := &fakeBroker{}
	var mu sync.Mutex
	b.connectFn = func(options ConnectionOptions) bool {
		mu.Lock()
		defer mu.Unlock()
		b.Attach(fb2, options.Host, options.Port, options.Prefix)
		b.OnConnectSuccess() // 對應 paho on_connect 的重訂
		return true
	}
	b.Reconnect("broker2", 1884, "newprefix")

	// 等 goroutine 完成
	deadline := time.After(2 * time.Second)
	for {
		mu.Lock()
		done := b.ClientHost() == "broker2"
		mu.Unlock()
		if done {
			break
		}
		select {
		case <-deadline:
			t.Fatal("reconnect did not complete")
		case <-time.After(10 * time.Millisecond):
		}
	}
	if !fb1.disconnected {
		t.Error("old broker not disconnected")
	}
	fb2.mu.Lock()
	defer fb2.mu.Unlock()
	if !contains(fb2.subscribed, "newprefix/KN/cmd/get-config") || !contains(fb2.subscribed, "newprefix/KN/cmd/set") {
		t.Errorf("reconnect did not resubscribe under new prefix: %v", fb2.subscribed)
	}
}

func TestBusPublishWithoutClient(t *testing.T) {
	b := New()
	if b.Publish("solar/KN/x", "{}", true) {
		t.Error("publish without client should return false")
	}
	if b.PublishJSON("solar/KN/x", map[string]any{}, true) {
		t.Error("publishJSON without client should return false")
	}
}

func TestBusPublishJSONShape(t *testing.T) {
	fb := &fakeBroker{}
	b := New()
	b.Attach(fb, "localhost", 1883, "solar")
	data := map[string]any{"value": 12.5, "ts": "2026-08-28T10:00:00"}
	b.PublishJSON("solar/KN/total_power_kw", data, true)

	fb.mu.Lock()
	defer fb.mu.Unlock()
	var parsed map[string]any
	if err := json.Unmarshal([]byte(fb.published[0].payload), &parsed); err != nil {
		t.Fatalf("payload not valid json: %v (%s)", err, fb.published[0].payload)
	}
	if parsed["value"] != 12.5 {
		t.Errorf("value = %v", parsed["value"])
	}
	// payload 不含換行尾碼
	if strings.HasSuffix(fb.published[0].payload, "\n") {
		t.Error("payload has trailing newline")
	}
}
