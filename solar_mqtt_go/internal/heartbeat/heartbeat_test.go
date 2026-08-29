package heartbeat

import (
	"encoding/json"
	"strings"
	"sync"
	"testing"
	"time"
)

type fakePublisher struct {
	mu    sync.Mutex
	calls []pub
}

type pub struct {
	topic   string
	payload string
}

func (f *fakePublisher) publish(topic, payload string) bool {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.calls = append(f.calls, pub{topic, payload})
	return true
}

func (f *fakePublisher) all() []pub {
	f.mu.Lock()
	defer f.mu.Unlock()
	return append([]pub(nil), f.calls...)
}

func waitPublishes(f *fakePublisher, n int, within time.Duration) bool {
	deadline := time.Now().Add(within)
	for time.Now().Before(deadline) {
		if len(f.all()) >= n {
			return true
		}
		time.Sleep(5 * time.Millisecond)
	}
	return len(f.all()) >= n
}

func TestHeartbeatPublishesImmediately(t *testing.T) {
	f := &fakePublisher{}
	h := newWithDuration("KN", "solar", 50*time.Millisecond, f.publish)
	h.Start()
	defer h.Stop()

	if !waitPublishes(f, 1, 2*time.Second) {
		t.Fatal("first publish did not arrive quickly")
	}
	p := f.all()[0]
	if p.topic != "solar/KN/heartbeat" {
		t.Errorf("topic = %s", p.topic)
	}
	var payload map[string]any
	if err := json.Unmarshal([]byte(p.payload), &payload); err != nil {
		t.Fatalf("payload not json: %v", err)
	}
	if payload["factory"] != "KN" {
		t.Errorf("factory = %v", payload["factory"])
	}
	if _, ok := payload["ts"]; !ok {
		t.Error("payload missing ts")
	}
	if _, ok := payload["boot"]; !ok {
		t.Error("payload missing boot")
	}
}

func TestHeartbeatPublishLoop(t *testing.T) {
	f := &fakePublisher{}
	h := newWithDuration("KN", "solar", 50*time.Millisecond, f.publish)
	h.Start()
	defer h.Stop()

	if !waitPublishes(f, 3, 3*time.Second) {
		t.Fatalf("loop publishes = %d, want >=3", len(f.all()))
	}
	// boot 時戳在多次 publish 中恆定
	alls := f.all()
	var boot string
	for i, p := range alls {
		var payload map[string]any
		if err := json.Unmarshal([]byte(p.payload), &payload); err != nil {
			t.Fatal(err)
		}
		b, _ := payload["boot"].(string)
		if i == 0 {
			boot = b
			if boot == "" {
				t.Fatal("empty boot")
			}
		} else if b != boot {
			t.Errorf("boot changed: %s -> %s", boot, b)
		}
		// ts 欄位存在且為秒級 ISO 格式
		ts, _ := payload["ts"].(string)
		if len(ts) != 19 || strings.Count(ts, ":") != 2 {
			t.Errorf("ts format = %q", ts)
		}
	}
}

func TestHeartbeatStopWakesImmediately(t *testing.T) {
	f := &fakePublisher{}
	h := newWithDuration("KN", "solar", 10*time.Second, f.publish)
	h.Start()
	if !waitPublishes(f, 1, 2*time.Second) {
		t.Fatal("no first publish")
	}
	start := time.Now()
	h.Stop()
	if elapsed := time.Since(start); elapsed > time.Second {
		t.Errorf("Stop blocked %.2fs, want immediate wake", elapsed.Seconds())
	}
	n := len(f.all())
	time.Sleep(200 * time.Millisecond)
	if len(f.all()) != n {
		t.Error("publishes continued after Stop")
	}
	// Stop 後再 Start 可重啟
	h.Start()
	if !waitPublishes(f, n+1, 2*time.Second) {
		t.Error("restart did not publish")
	}
	h.Stop()
}

func TestHeartbeatUpdateWaitsForCurrentInterval(t *testing.T) {
	f := &fakePublisher{}
	h := newWithDuration("KN", "solar", 300*time.Millisecond, f.publish)
	h.Start()
	defer h.Stop()

	if !waitPublishes(f, 1, 2*time.Second) {
		t.Fatal("no first publish")
	}
	// 更新設定：新 prefix 不得喚醒目前 wait
	h.updateSettingsRaw("newsolar", 300*time.Millisecond)

	time.Sleep(100 * time.Millisecond) // 遠小於 300ms 的 wait
	for _, p := range f.all() {
		if strings.HasPrefix(p.topic, "newsolar/") {
			t.Error("update_settings woke the current wait early")
		}
	}
	// current wait 完成後，下一輪使用新 prefix
	if !waitPublishes(f, 2, 3*time.Second) {
		t.Fatal("second publish missing")
	}
	alls := f.all()
	last := alls[len(alls)-1]
	if last.topic != "newsolar/KN/heartbeat" {
		t.Errorf("next publish topic = %s, want newprefix", last.topic)
	}
}

func TestHeartbeatIntervalClamp(t *testing.T) {
	if got := clampInterval(2); got != 5 {
		t.Errorf("clampInterval(2) = %d, want 5", got)
	}
	if got := clampInterval(30); got != 30 {
		t.Errorf("clampInterval(30) = %d, want 30", got)
	}
	h := New("KN", "solar", 1, func(string, string) bool { return true })
	if got := h.IntervalSeconds(); got != 5 {
		t.Errorf("New(1) interval = %d, want 5", got)
	}
	// UpdateSettings 同樣有下限
	h.UpdateSettings("x", 0)
	if got := h.IntervalSeconds(); got != 5 {
		t.Errorf("UpdateSettings(0) interval = %d, want 5", got)
	}
	if h.Prefix() != "x" {
		t.Errorf("prefix = %s", h.Prefix())
	}
}
