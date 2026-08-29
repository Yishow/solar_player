package tray

import (
	"errors"
	"sync"
)

// 選單動作的相依介面——systray 呼叫集中在不可測薄層，此層可測。

// ServiceController 控制進程內服務（暫停 = Stop；恢復 = Start）。
type ServiceController interface {
	Start() // 建立 manager、連線 broker、啟動全部 worker
	Stop()  // 優雅停止 manager（status stopped、斷線）
}

// Quitter 結束 systray 訊息迴圈。
type Quitter func()

// Deps tray 應用相依。
type Deps struct {
	Controller ServiceController
	WebURL     string
	ExeDir     string
	OpenURL    func(url string) error
	OpenFolder func(dir string) error
	WebStop    func()
	Quit       Quitter
}

// App tray 狀態機（選單動作的實際語意，可測）。
type App struct {
	deps Deps

	mu     sync.Mutex
	paused bool
	quit   bool
}

// New 建立 App。
func New(deps Deps) *App {
	return &App{deps: deps}
}

// Paused 回傳目前暫停狀態。
func (a *App) Paused() bool {
	a.mu.Lock()
	defer a.mu.Unlock()
	return a.paused
}

// OnOpenWeb 以系統瀏覽器開啟 embedded dashboard。
func (a *App) OnOpenWeb() error {
	if a.deps.OpenURL == nil {
		return errors.New("tray: OpenURL 未設定")
	}
	return a.deps.OpenURL(a.deps.WebURL)
}

// OnOpenFolder 開啟 exe 目錄。
func (a *App) OnOpenFolder() error {
	if a.deps.OpenFolder == nil {
		return errors.New("tray: OpenFolder 未設定")
	}
	return a.deps.OpenFolder(a.deps.ExeDir)
}

// OnTogglePause 切換暫停／恢復，回傳切換後的 paused 狀態。
// 暫停 → Controller.Stop()；恢復 → Controller.Start()。
func (a *App) OnTogglePause() bool {
	a.mu.Lock()
	if a.quit {
		a.mu.Unlock()
		return a.paused
	}
	newState := !a.paused
	a.paused = newState
	a.mu.Unlock()

	if newState {
		if a.deps.Controller != nil {
			a.deps.Controller.Stop()
		}
	} else {
		if a.deps.Controller != nil {
			a.deps.Controller.Start()
		}
	}
	return newState
}

// OnQuit 依序：停止服務 → 停止 web server → Quit systray。
// 僅第一次呼叫生效。
func (a *App) OnQuit() {
	a.mu.Lock()
	if a.quit {
		a.mu.Unlock()
		return
	}
	a.quit = true
	a.mu.Unlock()

	if a.deps.Controller != nil {
		a.deps.Controller.Stop()
	}
	if a.deps.WebStop != nil {
		a.deps.WebStop()
	}
	if a.deps.Quit != nil {
		a.deps.Quit()
	}
}
