//go:build windows

package opc

import (
	"fmt"
	"runtime"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/go-ole/go-ole"
	"github.com/go-ole/go-ole/oleutil"
)

const (
	coInitSFalse      = uintptr(0x00000001)
	coInitChangedMode = uintptr(0x80010106)
)

type readerCommandKind int

const (
	readerConnect readerCommandKind = iota
	readerRead
	readerDisconnect
)

type readerCommand struct {
	kind      readerCommandKind
	progID    string
	timeoutMs int
	addresses []string
	response  chan readerResponse
}

type readerResponse struct {
	values map[string]float64
	errs   map[string]error
	err    error
}

// windowsReader routes every COM operation through one locked OS thread.
// OPC DA custom interfaces are apartment-bound and must not be invoked from
// arbitrary Go scheduler threads or concurrent Web UI handlers.
type windowsReader struct {
	commands chan readerCommand
	done     chan struct{}
	stopOnce sync.Once
}

type windowsSession struct {
	unknown            *ole.IUnknown
	client             *opcDAClient
	progID             string
	timeout            time.Duration
	shouldUninit       bool
	addresses          []string
	readAddresses      []string
	handles            []uint32
	registrationErrors map[string]error
}

func newWindowsReaderImpl() (Reader, error) {
	reader := &windowsReader{
		commands: make(chan readerCommand),
		done:     make(chan struct{}),
	}
	go reader.run()
	return reader, nil
}

func (r *windowsReader) Connect(progID string, timeoutMs int) error {
	response, err := r.send(readerCommand{
		kind:      readerConnect,
		progID:    progID,
		timeoutMs: timeoutMs,
	})
	if err != nil {
		return err
	}
	return response.err
}

func (r *windowsReader) ReadTags(addresses []string) (map[string]float64, map[string]error) {
	requested := append([]string(nil), addresses...)
	response, err := r.send(readerCommand{kind: readerRead, addresses: requested})
	if err != nil {
		return allAddressErrors(addresses, err)
	}
	if response.err != nil {
		return allAddressErrors(addresses, response.err)
	}
	return response.values, response.errs
}

func (r *windowsReader) Disconnect() {
	r.stopOnce.Do(func() {
		response := make(chan readerResponse, 1)
		command := readerCommand{kind: readerDisconnect, response: response}
		select {
		case <-r.done:
			return
		case r.commands <- command:
		}
		select {
		case <-r.done:
		case <-response:
		}
	})
}

func (r *windowsReader) send(command readerCommand) (readerResponse, error) {
	command.response = make(chan readerResponse, 1)
	select {
	case <-r.done:
		return readerResponse{}, fmt.Errorf("OPC reader is closed")
	case r.commands <- command:
	}

	select {
	case <-r.done:
		return readerResponse{}, fmt.Errorf("OPC reader is closed")
	case response := <-command.response:
		return response, nil
	}
}

func (r *windowsReader) run() {
	runtime.LockOSThread()
	defer runtime.UnlockOSThread()
	defer close(r.done)

	session := &windowsSession{}
	defer session.disconnect()
	for command := range r.commands {
		switch command.kind {
		case readerConnect:
			command.response <- readerResponse{err: session.connect(command.progID, command.timeoutMs)}
		case readerRead:
			values, errs := session.readTags(command.addresses)
			command.response <- readerResponse{values: values, errs: errs}
		case readerDisconnect:
			session.disconnect()
			command.response <- readerResponse{}
			return
		}
	}
}

func (s *windowsSession) connect(progID string, timeoutMs int) error {
	s.disconnect()

	coInitErr := ole.CoInitializeEx(0, ole.COINIT_APARTMENTTHREADED)
	if coInitErr != nil && !isAllowedCoInitError(coInitErr) {
		return fmt.Errorf("CoInitializeEx: %w", coInitErr)
	}
	s.shouldUninit = coInitErr == nil || isCoInitSFalse(coInitErr)
	s.timeout = time.Duration(timeoutMs) * time.Millisecond
	s.progID = progID

	unknown, err := oleutil.CreateObject(progID)
	if err != nil {
		s.cleanupCom()
		return fmt.Errorf("CreateObject(%s): %w", progID, err)
	}

	client, err := newOPCDAClient(unknown)
	if err != nil {
		unknown.Release()
		s.cleanupCom()
		return err
	}
	s.unknown = unknown
	s.client = client
	return nil
}

func (s *windowsSession) readTags(addresses []string) (map[string]float64, map[string]error) {
	if s.client == nil {
		return allAddressErrors(addresses, fmt.Errorf("OPC server is not connected"))
	}
	if !sameAddresses(s.addresses, addresses) {
		if err := s.rebuildItems(addresses); err != nil {
			return allAddressErrors(addresses, err)
		}
	}

	values := make(map[string]float64)
	errs := cloneErrors(s.registrationErrors)
	if len(s.handles) == 0 {
		return values, errs
	}

	batch, err := s.client.Read(s.handles)
	if err != nil {
		for _, address := range s.readAddresses {
			errs[address] = err
		}
		return values, errs
	}
	defer batch.Close()

	readValues, readErrors := decodeReadResults(s.readAddresses, batch.states, batch.errors)
	for address, value := range readValues {
		values[address] = value
	}
	for address, readErr := range readErrors {
		errs[address] = readErr
	}
	return values, errs
}

func (s *windowsSession) rebuildItems(addresses []string) error {
	if len(addresses) == 0 {
		s.client.closeGroup()
		s.addresses = []string{}
		s.readAddresses = []string{}
		s.handles = []uint32{}
		s.registrationErrors = map[string]error{}
		return nil
	}

	updateRate := uint32(s.timeout / time.Millisecond)
	if updateRate == 0 {
		updateRate = 1000
	}
	if err := s.client.CreateGroup(updateRate); err != nil {
		return err
	}
	handles, addErrors, err := s.client.AddItems(addresses)
	if err != nil {
		s.client.closeGroup()
		return err
	}

	readAddresses, readHandles, registrationErrors := selectReadableItems(addresses, handles, addErrors)
	s.addresses = append([]string(nil), addresses...)
	s.readAddresses = readAddresses
	s.handles = readHandles
	s.registrationErrors = registrationErrors
	return nil
}

func (s *windowsSession) disconnect() {
	if s.client != nil {
		s.client.Close()
		s.client = nil
	}
	if s.unknown != nil {
		s.unknown.Release()
		s.unknown = nil
	}
	s.cleanupCom()
	s.progID = ""
	s.timeout = 0
	s.addresses = nil
	s.readAddresses = nil
	s.handles = nil
	s.registrationErrors = nil
}

func (s *windowsSession) cleanupCom() {
	if s.shouldUninit {
		ole.CoUninitialize()
		s.shouldUninit = false
	}
}

func allAddressErrors(addresses []string, err error) (map[string]float64, map[string]error) {
	errs := make(map[string]error, len(addresses))
	for _, address := range addresses {
		errs[address] = err
	}
	return map[string]float64{}, errs
}

func anyToFloat64(value any) (float64, error) {
	switch v := value.(type) {
	case float32:
		return float64(v), nil
	case float64:
		return v, nil
	case int8:
		return float64(v), nil
	case int16:
		return float64(v), nil
	case int32:
		return float64(v), nil
	case int64:
		return float64(v), nil
	case int:
		return float64(v), nil
	case uint8:
		return float64(v), nil
	case uint16:
		return float64(v), nil
	case uint32:
		return float64(v), nil
	case uint64:
		return float64(v), nil
	case uint:
		return float64(v), nil
	case string:
		parsed, err := strconv.ParseFloat(strings.TrimSpace(v), 64)
		if err != nil {
			return 0, fmt.Errorf("parse float %q: %w", v, err)
		}
		return parsed, nil
	default:
		return 0, fmt.Errorf("unexpected variant type %T", value)
	}
}

func isAllowedCoInitError(err error) bool {
	oleErr, ok := err.(*ole.OleError)
	if !ok {
		return false
	}
	return oleErr.Code() == coInitSFalse || oleErr.Code() == coInitChangedMode
}

func isCoInitSFalse(err error) bool {
	oleErr, ok := err.(*ole.OleError)
	if !ok {
		return false
	}
	return oleErr.Code() == coInitSFalse
}
