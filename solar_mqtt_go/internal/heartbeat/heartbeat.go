// Package heartbeat 實作週期 watchdog 心跳發佈（對應 Python solar/heartbeat.py）。
// goroutine 啟動後立即發佈一次，之後每 interval 秒一次；
// Stop 即時喚醒；UpdateSettings 只影響「目前 wait 結束後」的下一輪。
package heartbeat

import (
	"encoding/json"
	"fmt"
	"sync"
	"time"
)

// Publisher 發佈 callback（retain 由 service 層閉包處理）。
type Publisher func(topic, payload string) bool

// Heartbeat 心跳發佈器。
type Heartbeat struct {
	mu        sync.Mutex
	factoryID string
	prefix    string
	interval  time.Duration
	publish   Publisher
	stop      chan struct{}
	done      chan struct{}
	running   bool
	boot      string
}

// clampInterval 對應 Python max(5, interval)。
func clampInterval(seconds int) int {
	if seconds < 5 {
		return 5
	}
	return seconds
}

// New 建立心跳（interval 單位秒，下限 5）。
func New(factoryID, prefix string, interval int, publish Publisher) *Heartbeat {
	return &Heartbeat{
		factoryID: factoryID,
		prefix:    prefix,
		interval:  time.Duration(clampInterval(interval)) * time.Second,
		publish:   publish,
		boot:      time.Now().Format("2006-01-02T15:04:05"),
	}
}

// newWithDuration 測試用：直接指定 wait 時距，繞過秒級下限。
func newWithDuration(factoryID, prefix string, interval time.Duration, publish Publisher) *Heartbeat {
	return &Heartbeat{
		factoryID: factoryID,
		prefix:    prefix,
		interval:  interval,
		publish:   publish,
		boot:      time.Now().Format("2006-01-02T15:04:05"),
	}
}

// Start 啟動心跳 goroutine（重複呼叫冪等）。
func (h *Heartbeat) Start() {
	h.mu.Lock()
	if h.running {
		h.mu.Unlock()
		return
	}
	h.stop = make(chan struct{})
	h.done = make(chan struct{})
	h.running = true
	stop := h.stop
	interval := h.interval
	h.mu.Unlock()

	go func() {
		defer close(h.done)
		h.loop(stop, interval)
	}()
}

// Stop 停止心跳並等待 goroutine 結束（即時喚醒，最多等 2 秒；對應 Python join(timeout=2)）。
func (h *Heartbeat) Stop() {
	h.mu.Lock()
	if !h.running {
		h.mu.Unlock()
		return
	}
	stop := h.stop
	done := h.done
	h.running = false
	h.mu.Unlock()
	close(stop)

	select {
	case <-done:
	case <-time.After(2 * time.Second):
	}
}

// loop 發佈迴圈：先立即發佈，再 wait；interval 於進入 wait 前快取，
// UpdateSettings 的變更自然地從下一輪生效（不喚醒目前 wait）。
func (h *Heartbeat) loop(stop <-chan struct{}, interval time.Duration) {
	for {
		h.publishOnce()

		h.mu.Lock()
		interval = h.interval
		h.mu.Unlock()

		select {
		case <-stop:
			return
		case <-time.After(interval):
		}
	}
}

func (h *Heartbeat) publishOnce() {
	h.mu.Lock()
	prefix := h.prefix
	factoryID := h.factoryID
	boot := h.boot
	publish := h.publish
	h.mu.Unlock()

	payload, err := json.Marshal(map[string]any{
		"ts":      time.Now().Format("2006-01-02T15:04:05"),
		"boot":    boot,
		"factory": factoryID,
	})
	if err != nil {
		fmt.Printf("[%s] heartbeat 發佈失敗：%v\n", factoryID, err)
		return
	}
	topic := prefix + "/" + factoryID + "/heartbeat"
	if !publish(topic, string(payload)) {
		// 失敗安靜（對應 Python：失敗 callback 安靜回 False）
		fmt.Printf("[%s] heartbeat 發佈失敗\n", factoryID)
	}
}

// UpdateSettings 熱更新 prefix 與 interval（秒，下限 5）。
// concurrency-safe；不喚醒目前 wait，新設定於下一輪生效。
func (h *Heartbeat) UpdateSettings(prefix string, interval int) {
	h.mu.Lock()
	defer h.mu.Unlock()
	h.prefix = prefix
	h.interval = time.Duration(clampInterval(interval)) * time.Second
}

// updateSettingsRaw 測試用：不套用秒級下限。
func (h *Heartbeat) updateSettingsRaw(prefix string, interval time.Duration) {
	h.mu.Lock()
	defer h.mu.Unlock()
	h.prefix = prefix
	h.interval = interval
}

// IntervalSeconds 目前 interval（秒）。
func (h *Heartbeat) IntervalSeconds() int {
	h.mu.Lock()
	defer h.mu.Unlock()
	return int(h.interval / time.Second)
}

// Prefix 目前 prefix。
func (h *Heartbeat) Prefix() string {
	h.mu.Lock()
	defer h.mu.Unlock()
	return h.prefix
}
