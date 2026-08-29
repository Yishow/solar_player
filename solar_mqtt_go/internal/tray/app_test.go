package tray

import (
	"sync"
	"testing"
)

// ── fakes ──

type recorder struct {
	mu     sync.Mutex
	events []string
}

func (r *recorder) add(e string) {
	r.mu.Lock()
	r.events = append(r.events, e)
	r.mu.Unlock()
}

func (r *recorder) list() []string {
	r.mu.Lock()
	defer r.mu.Unlock()
	return append([]string(nil), r.events...)
}

// recordingController：計數並將動作寫入事件序列。
type recordingController struct {
	rec *recorder
	mu  sync.Mutex
	s   int
	st  int
}

func (f *recordingController) Start() {
	f.mu.Lock()
	f.s++
	f.mu.Unlock()
	f.rec.add("service-start")
}

func (f *recordingController) Stop() {
	f.mu.Lock()
	f.st++
	f.mu.Unlock()
	f.rec.add("service-stop")
}

func (f *recordingController) counts() (int, int) {
	f.mu.Lock()
	defer f.mu.Unlock()
	return f.s, f.st
}

func newTestApp() (*App, *recordingController, *recorder) {
	ctrl := &recordingController{}
	rec := &recorder{}
	ctrl.rec = rec
	app := New(Deps{
		Controller: ctrl,
		WebURL:     "http://127.0.0.1:18868/",
		ExeDir:     "/tmp/exe",
		OpenURL:    func(string) error { rec.add("open-web"); return nil },
		OpenFolder: func(string) error { rec.add("open-folder"); return nil },
		WebStop:    func() { rec.add("web-stop") },
		Quit:       func() { rec.add("quit") },
	})
	return app, ctrl, rec
}

func TestPauseResumeTogglesService(t *testing.T) {
	app, ctrl, _ := newTestApp()

	if app.Paused() {
		t.Fatal("initial state must not be paused")
	}
	// 暫停：Start 未被呼叫過（服務由外部先啟動），Stop 停止 workers
	if paused := app.OnTogglePause(); !paused {
		t.Error("first toggle should pause")
	}
	if s, st := ctrl.counts(); st != 1 || s != 0 {
		t.Errorf("after pause: start=%d stop=%d, want start=0 stop=1", s, st)
	}
	// 恢復：重建 manager（Start）
	if paused := app.OnTogglePause(); paused {
		t.Error("second toggle should resume")
	}
	if s, st := ctrl.counts(); s != 1 || st != 1 {
		t.Errorf("after resume: start=%d stop=%d, want start=1 stop=1", s, st)
	}
	// 再暫停一次
	app.OnTogglePause()
	if s, st := ctrl.counts(); s != 1 || st != 2 {
		t.Errorf("after second pause: start=%d stop=%d, want start=1 stop=2", s, st)
	}
	if !app.Paused() {
		t.Error("state should be paused")
	}
}

func TestQuitStopsInOrder(t *testing.T) {
	app, ctrl, rec := newTestApp()

	app.OnQuit()
	events := rec.list()
	if len(events) != 3 {
		t.Fatalf("events = %v, want [service-stop web-stop quit]", events)
	}
	if events[0] != "service-stop" || events[1] != "web-stop" || events[2] != "quit" {
		t.Errorf("quit order = %v, want service-stop, web-stop, quit", events)
	}
	if _, st := ctrl.counts(); st != 1 {
		t.Errorf("service stop count = %d", st)
	}
	// 重複 quit → 冪等
	app.OnQuit()
	if got := len(rec.list()); got != 3 {
		t.Errorf("second quit emitted more events: %v", rec.list())
	}
}

func TestQuitWhilePausedDoesNotDoubleStop(t *testing.T) {
	app, ctrl, rec := newTestApp()
	app.OnTogglePause() // 暫停（已 Stop 一次）
	app.OnQuit()
	if _, st := ctrl.counts(); st != 2 {
		t.Errorf("stop count = %d (pause + quit), want 2", st)
	}
	// 暫停的 Stop + 離開的 Stop + web-stop + quit
	events := rec.list()
	if len(events) != 4 || events[0] != "service-stop" || events[2] != "web-stop" || events[3] != "quit" {
		t.Errorf("events = %v", events)
	}
}

func TestOpenActions(t *testing.T) {
	app, _, rec := newTestApp()

	if err := app.OnOpenWeb(); err != nil {
		t.Fatal(err)
	}
	if err := app.OnOpenFolder(); err != nil {
		t.Fatal(err)
	}
	events := rec.list()
	if len(events) != 2 || events[0] != "open-web" || events[1] != "open-folder" {
		t.Errorf("events = %v", events)
	}
}
