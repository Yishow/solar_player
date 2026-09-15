package state

import (
	"sync"
	"time"
)

type TagValue struct {
	Value  float64
	Ok     bool
	ErrMsg string
}

type VirtualValue struct {
	Name  string
	Value float64
	Unit  string
	Ok    bool
}

type StateSnapshot struct {
	OpcConnected  bool
	MqttConnected bool
	RawValues     map[string]TagValue
	VirtualValues []VirtualValue
	Errors        []string
	LastRead      time.Time
	LastPublish   time.Time
}

type State struct {
	mu            sync.RWMutex
	opcConnected  bool
	mqttConnected bool
	rawValues     map[string]TagValue
	virtualValues []VirtualValue
	errors        []string
	lastRead      time.Time
	lastPublish   time.Time
}

func New() *State {
	return &State{
		rawValues: make(map[string]TagValue),
	}
}

func (s *State) SetOpcConnected(ok bool) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.opcConnected = ok
}

func (s *State) SetMqttConnected(ok bool) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.mqttConnected = ok
}

func (s *State) SetRawValues(vals map[string]TagValue) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.rawValues = cloneRawValues(vals)
}

func (s *State) SetVirtualValues(vals []VirtualValue) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.virtualValues = cloneVirtualValues(vals)
}

func (s *State) AddError(msg string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.errors = append(s.errors, msg)
	if len(s.errors) > 10 {
		s.errors = append([]string(nil), s.errors[len(s.errors)-10:]...)
	}
}

func (s *State) SetLastRead(t time.Time) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.lastRead = t
}

func (s *State) SetLastPublish(t time.Time) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.lastPublish = t
}

func (s *State) Snapshot() StateSnapshot {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return StateSnapshot{
		OpcConnected:  s.opcConnected,
		MqttConnected: s.mqttConnected,
		RawValues:     cloneRawValues(s.rawValues),
		VirtualValues: cloneVirtualValues(s.virtualValues),
		Errors:        cloneErrors(s.errors),
		LastRead:      s.lastRead,
		LastPublish:   s.lastPublish,
	}
}

func cloneRawValues(vals map[string]TagValue) map[string]TagValue {
	if vals == nil {
		return nil
	}
	cloned := make(map[string]TagValue, len(vals))
	for key, value := range vals {
		cloned[key] = value
	}
	return cloned
}

func cloneVirtualValues(vals []VirtualValue) []VirtualValue {
	if vals == nil {
		return nil
	}
	return append([]VirtualValue(nil), vals...)
}

func cloneErrors(vals []string) []string {
	if vals == nil {
		return nil
	}
	return append([]string(nil), vals...)
}
