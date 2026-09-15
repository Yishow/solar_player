//go:build windows

package dde

import (
	"fmt"
	"runtime"
	"strings"
	"sync"
	"syscall"
	"unsafe"

	"golang.org/x/sys/windows"
)

const (
	cpWinUnicode     = 1200
	appCmdClientOnly = 0x00000010
	cfText           = 1
	xtypRequest      = 0x20B0
)

var (
	user32                     = windows.NewLazySystemDLL("user32.dll")
	procDdeInitializeW         = user32.NewProc("DdeInitializeW")
	procDdeUninitialize        = user32.NewProc("DdeUninitialize")
	procDdeCreateStringHandleW = user32.NewProc("DdeCreateStringHandleW")
	procDdeFreeStringHandle    = user32.NewProc("DdeFreeStringHandle")
	procDdeConnect             = user32.NewProc("DdeConnect")
	procDdeDisconnect          = user32.NewProc("DdeDisconnect")
	procDdeClientTransaction   = user32.NewProc("DdeClientTransaction")
	procDdeGetData             = user32.NewProc("DdeGetData")
	procDdeFreeDataHandle      = user32.NewProc("DdeFreeDataHandle")
	procDdeGetLastError        = user32.NewProc("DdeGetLastError")
	ddeCallback                = syscall.NewCallback(func(uint32, uint32, uintptr, uintptr, uintptr, uintptr, uintptr, uintptr) uintptr {
		return 0
	})
)

type commandKind int

const (
	commandConnect commandKind = iota
	commandRead
	commandDisconnect
)

type command struct {
	kind      commandKind
	service   string
	topic     string
	timeoutMs int
	items     []string
	response  chan response
}

type response struct {
	values map[string]float64
	errs   map[string]error
	err    error
}

type windowsReader struct {
	commands chan command
	done     chan struct{}
	stopOnce sync.Once
}

type session struct {
	instance uint32
	conv     uintptr
	timeout  uint32
}

func NewWindowsReader() (Reader, error) {
	reader := &windowsReader{
		commands: make(chan command),
		done:     make(chan struct{}),
	}
	go reader.run()
	return reader, nil
}

func (r *windowsReader) Connect(service, topic string, timeoutMs int) error {
	result, err := r.send(command{kind: commandConnect, service: service, topic: topic, timeoutMs: timeoutMs})
	if err != nil {
		return err
	}
	return result.err
}

func (r *windowsReader) ReadTags(items []string) (map[string]float64, map[string]error) {
	requested := append([]string(nil), items...)
	result, err := r.send(command{kind: commandRead, items: requested})
	if err != nil {
		return allItemErrors(items, err)
	}
	if result.err != nil {
		return allItemErrors(items, result.err)
	}
	return result.values, result.errs
}

func (r *windowsReader) Disconnect() {
	r.stopOnce.Do(func() {
		result := make(chan response, 1)
		select {
		case <-r.done:
			return
		case r.commands <- command{kind: commandDisconnect, response: result}:
		}
		select {
		case <-r.done:
		case <-result:
		}
	})
}

func (r *windowsReader) send(cmd command) (response, error) {
	cmd.response = make(chan response, 1)
	select {
	case <-r.done:
		return response{}, fmt.Errorf("DDE reader is closed")
	case r.commands <- cmd:
	}
	select {
	case <-r.done:
		return response{}, fmt.Errorf("DDE reader is closed")
	case result := <-cmd.response:
		return result, nil
	}
}

func (r *windowsReader) run() {
	runtime.LockOSThread()
	defer runtime.UnlockOSThread()
	defer close(r.done)

	s := &session{}
	defer s.disconnect()
	for cmd := range r.commands {
		switch cmd.kind {
		case commandConnect:
			cmd.response <- response{err: s.connect(cmd.service, cmd.topic, cmd.timeoutMs)}
		case commandRead:
			values, errs := s.read(cmd.items)
			cmd.response <- response{values: values, errs: errs}
		case commandDisconnect:
			s.disconnect()
			cmd.response <- response{}
			return
		}
	}
}

func (s *session) connect(service, topic string, timeoutMs int) error {
	s.disconnect()
	if strings.TrimSpace(service) == "" || strings.TrimSpace(topic) == "" {
		return fmt.Errorf("DDE service and topic must not be empty")
	}
	if timeoutMs <= 0 {
		timeoutMs = 10000
	}

	result, _, _ := procDdeInitializeW.Call(
		uintptr(unsafe.Pointer(&s.instance)),
		ddeCallback,
		appCmdClientOnly,
		0,
	)
	if result != 0 {
		s.instance = 0
		return fmt.Errorf("DdeInitializeW: DMLERR 0x%04X", result)
	}

	serviceHandle, err := s.stringHandle(service)
	if err != nil {
		s.disconnect()
		return err
	}
	topicHandle, err := s.stringHandle(topic)
	if err != nil {
		s.freeStringHandle(serviceHandle)
		s.disconnect()
		return err
	}

	s.conv, _, _ = procDdeConnect.Call(uintptr(s.instance), serviceHandle, topicHandle, 0)
	s.freeStringHandle(topicHandle)
	s.freeStringHandle(serviceHandle)
	if s.conv == 0 {
		err := s.lastError("DdeConnect(" + service + "/" + topic + ")")
		s.disconnect()
		return err
	}
	s.timeout = uint32(timeoutMs)
	return nil
}

func (s *session) read(items []string) (map[string]float64, map[string]error) {
	values := make(map[string]float64, len(items))
	errs := make(map[string]error)
	if s.conv == 0 {
		return values, allErrors(items, fmt.Errorf("DDE conversation is not connected"))
	}
	for _, item := range items {
		value, err := s.request(item)
		if err != nil {
			errs[item] = err
			continue
		}
		values[item] = value
	}
	return values, errs
}

func (s *session) request(item string) (float64, error) {
	itemHandle, err := s.stringHandle(item)
	if err != nil {
		return 0, err
	}
	defer s.freeStringHandle(itemHandle)

	var transactionResult uint32
	dataHandle, _, _ := procDdeClientTransaction.Call(
		0,
		0,
		s.conv,
		itemHandle,
		cfText,
		xtypRequest,
		uintptr(s.timeout),
		uintptr(unsafe.Pointer(&transactionResult)),
	)
	if dataHandle == 0 {
		return 0, s.lastError("DDE request " + item)
	}
	defer procDdeFreeDataHandle.Call(dataHandle)

	size, _, _ := procDdeGetData.Call(dataHandle, 0, 0, 0)
	if size == 0 {
		return 0, fmt.Errorf("DDE request %s returned empty data", item)
	}
	buffer := make([]byte, int(size))
	copied, _, _ := procDdeGetData.Call(
		dataHandle,
		uintptr(unsafe.Pointer(&buffer[0])),
		uintptr(len(buffer)),
		0,
	)
	if copied == 0 {
		return 0, s.lastError("DdeGetData " + item)
	}
	return parseTextValue(item, string(buffer[:int(copied)]))
}

func (s *session) stringHandle(value string) (uintptr, error) {
	ptr, err := windows.UTF16PtrFromString(value)
	if err != nil {
		return 0, fmt.Errorf("DDE string %q: %w", value, err)
	}
	handle, _, _ := procDdeCreateStringHandleW.Call(
		uintptr(s.instance),
		uintptr(unsafe.Pointer(ptr)),
		cpWinUnicode,
	)
	if handle == 0 {
		return 0, s.lastError("DdeCreateStringHandleW")
	}
	return handle, nil
}

func (s *session) freeStringHandle(handle uintptr) {
	if handle != 0 && s.instance != 0 {
		procDdeFreeStringHandle.Call(uintptr(s.instance), handle)
	}
}

func (s *session) lastError(operation string) error {
	code, _, _ := procDdeGetLastError.Call(uintptr(s.instance))
	return fmt.Errorf("%s: DMLERR 0x%04X", operation, code)
}

func (s *session) disconnect() {
	if s.conv != 0 {
		procDdeDisconnect.Call(s.conv)
		s.conv = 0
	}
	if s.instance != 0 {
		procDdeUninitialize.Call(uintptr(s.instance))
		s.instance = 0
	}
	s.timeout = 0
}

func allItemErrors(items []string, err error) (map[string]float64, map[string]error) {
	return map[string]float64{}, allErrors(items, err)
}

func allErrors(items []string, err error) map[string]error {
	errs := make(map[string]error, len(items))
	for _, item := range items {
		errs[item] = err
	}
	return errs
}
