//go:build windows

package winsvc

import (
	"fmt"
	"strings"
	"sync"
	"time"

	"golang.org/x/sys/windows/svc"
	"golang.org/x/sys/windows/svc/mgr"
)

const (
	ServiceName    = "OpcMqttBridge"
	ServiceDisplay = "OPC MQTT Bridge"
	ServiceDesc    = "讀取 OPC DA 並發布到 MQTT Broker"
)

type RunFunc func(stop <-chan struct{})

type handler struct {
	run RunFunc
}

func (h *handler) Execute(_ []string, requests <-chan svc.ChangeRequest, changes chan<- svc.Status) (bool, uint32) {
	const acceptedCommands = svc.AcceptStop | svc.AcceptShutdown

	changes <- svc.Status{State: svc.StartPending}

	stop := make(chan struct{})
	done := make(chan struct{})
	var closeOnce sync.Once

	go func() {
		h.run(stop)
		close(done)
	}()

	current := svc.Status{State: svc.Running, Accepts: acceptedCommands}
	changes <- current

	for request := range requests {
		switch request.Cmd {
		case svc.Interrogate:
			changes <- current
		case svc.Stop, svc.Shutdown:
			current = svc.Status{State: svc.StopPending}
			changes <- current
			closeOnce.Do(func() { close(stop) })
			select {
			case <-done:
			case <-time.After(10 * time.Second):
			}
			return false, 0
		}
	}

	closeOnce.Do(func() { close(stop) })
	select {
	case <-done:
	case <-time.After(10 * time.Second):
	}
	return false, 0
}

func RunAsService(run RunFunc) error {
	return svc.Run(ServiceName, &handler{run: run})
}

func IsService() bool {
	ok, _ := svc.IsWindowsService()
	return ok
}

func Install(exePath string) error {
	manager, err := mgr.Connect()
	if err != nil {
		return fmt.Errorf("connect SCM: %w", err)
	}
	defer manager.Disconnect()

	existing, err := manager.OpenService(ServiceName)
	if err == nil {
		existing.Close()
		return fmt.Errorf("服務 %q 已存在", ServiceName)
	}

	service, err := manager.CreateService(ServiceName, quotedBinaryPath(exePath), mgr.Config{
		DisplayName:  ServiceDisplay,
		Description:  ServiceDesc,
		StartType:    mgr.StartAutomatic,
		ErrorControl: mgr.ErrorNormal,
	})
	if err != nil {
		return fmt.Errorf("create service: %w", err)
	}
	defer service.Close()

	actions := []mgr.RecoveryAction{
		{Type: mgr.ServiceRestart, Delay: 5 * time.Second},
		{Type: mgr.ServiceRestart, Delay: 5 * time.Second},
		{Type: mgr.NoAction},
	}
	if err := service.SetRecoveryActions(actions, 0); err != nil {
		fmt.Printf("警告：設定重啟策略失敗: %v\n", err)
	}

	fmt.Printf("服務 %q 安裝成功。\n", ServiceName)
	fmt.Println("啟動服務：sc start", ServiceName)
	return nil
}

func Uninstall() error {
	manager, err := mgr.Connect()
	if err != nil {
		return fmt.Errorf("connect SCM: %w", err)
	}
	defer manager.Disconnect()

	service, err := manager.OpenService(ServiceName)
	if err != nil {
		return fmt.Errorf("服務 %q 不存在", ServiceName)
	}
	defer service.Close()

	if err := service.Delete(); err != nil {
		return fmt.Errorf("delete service: %w", err)
	}

	fmt.Printf("服務 %q 已移除。\n", ServiceName)
	return nil
}

func quotedBinaryPath(path string) string {
	if path == "" {
		return path
	}
	if strings.HasPrefix(path, "\"") && strings.HasSuffix(path, "\"") {
		return path
	}
	if strings.ContainsAny(path, " \t") {
		return `"` + path + `"`
	}
	return path
}
