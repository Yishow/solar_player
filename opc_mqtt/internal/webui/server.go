package webui

import (
	"context"
	"embed"
	"encoding/json"
	"fmt"
	"io/fs"
	"net"
	"net/http"
	"strings"
	"time"

	"opc_mqtt/internal/config"
	"opc_mqtt/internal/state"
)

//go:embed static
var staticFiles embed.FS

type Server struct {
	cfg       *config.Config
	st        *state.State
	onRead    func()
	onPublish func()
	mux       *http.ServeMux
	httpSrv   *http.Server
}

func New(cfg *config.Config, st *state.State, onRead func(), onPublish func()) *Server {
	server := &Server{
		cfg:       cfg,
		st:        st,
		onRead:    onRead,
		onPublish: onPublish,
		mux:       http.NewServeMux(),
	}
	server.registerRoutes()
	return server
}

func (s *Server) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	s.mux.ServeHTTP(w, r)
}

func (s *Server) Start(addr string) error {
	listener, err := net.Listen("tcp", addr)
	if err != nil {
		return err
	}

	s.httpSrv = &http.Server{
		Addr:              addr,
		Handler:           s.mux,
		ReadHeaderTimeout: 5 * time.Second,
	}

	go func() {
		_ = s.httpSrv.Serve(listener)
	}()

	return nil
}

func (s *Server) Stop() {
	if s.httpSrv == nil {
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()
	_ = s.httpSrv.Shutdown(ctx)
}

func (s *Server) registerRoutes() {
	staticSubtree, err := fs.Sub(staticFiles, "static")
	if err == nil {
		s.mux.Handle("/", http.FileServer(http.FS(staticSubtree)))
	}

	s.mux.HandleFunc("/api/status", s.handleStatus)
	s.mux.HandleFunc("/api/config", s.handleConfig)
	s.mux.HandleFunc("/api/action/read", s.handleActionRead)
	s.mux.HandleFunc("/api/action/publish", s.handleActionPublish)
}

func (s *Server) handleStatus(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
		return
	}

	snapshot := s.st.Snapshot()
	writeJSON(w, http.StatusOK, map[string]any{
		"dde_connected":  snapshot.OpcConnected,
		"opc_connected":  snapshot.OpcConnected,
		"mqtt_connected": snapshot.MqttConnected,
		"raw_values":     snapshot.RawValues,
		"virtual_values": snapshot.VirtualValues,
		"errors":         snapshot.Errors,
		"last_read":      snapshot.LastRead,
		"last_publish":   snapshot.LastPublish,
	})
}

func (s *Server) handleConfig(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		writeJSON(w, http.StatusOK, s.cfg.Get())
	case http.MethodPost:
		s.handleConfigUpdate(w, r)
	default:
		writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
	}
}

func (s *Server) handleConfigUpdate(w http.ResponseWriter, r *http.Request) {
	var newCfg config.Config

	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&newCfg); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}
	config.NormalizeDDE(&newCfg)

	if err := validateConfig(newCfg); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}

	s.cfg.Replace(newCfg)
	if err := s.cfg.Save(); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": fmt.Sprintf("save failed: %v", err)})
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (s *Server) handleActionRead(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
		return
	}

	if s.onRead != nil {
		s.onRead()
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (s *Server) handleActionPublish(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
		return
	}

	if s.onPublish != nil {
		s.onPublish()
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func writeJSON(w http.ResponseWriter, statusCode int, value any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	_ = json.NewEncoder(w).Encode(value)
}

func validateConfig(cfg config.Config) error {
	if cfg.MqttQos > 2 {
		return fmt.Errorf("mqtt_qos must be 0, 1, or 2")
	}
	if cfg.BrokerPort <= 0 {
		return fmt.Errorf("broker_port must be a positive integer")
	}
	if cfg.PublishInterval <= 0 {
		return fmt.Errorf("publish_interval must be a positive integer")
	}
	if strings.TrimSpace(cfg.DdeService) == "" {
		return fmt.Errorf("dde_service must not be empty")
	}
	if strings.TrimSpace(cfg.DdeTopic) == "" {
		return fmt.Errorf("dde_topic must not be empty")
	}
	if cfg.DdeTimeoutMs <= 0 {
		return fmt.Errorf("dde_timeout_ms must be a positive integer")
	}
	if cfg.WebPort <= 0 {
		return fmt.Errorf("web_port must be a positive integer")
	}

	tagIDs := make(map[string]struct{}, len(cfg.Tags))
	for _, tag := range cfg.Tags {
		tagID := strings.TrimSpace(tag.ID)
		if tagID == "" {
			return fmt.Errorf("tag.id must not be empty")
		}
		if _, exists := tagIDs[tagID]; exists {
			return fmt.Errorf("duplicate tag.id: %s", tagID)
		}
		tagIDs[tagID] = struct{}{}
		if strings.TrimSpace(tag.DdeItem) == "" {
			return fmt.Errorf("tag %q dde_item must not be empty", tagID)
		}
	}

	for _, virtualTag := range cfg.VirtualTags {
		for _, item := range virtualTag.Formula {
			if item.Op != "+" && item.Op != "-" {
				return fmt.Errorf("virtual tag %q has invalid operator %q", virtualTag.Name, item.Op)
			}
			if _, exists := tagIDs[item.Tag]; !exists {
				return fmt.Errorf("virtual tag %q references unknown raw tag %q", virtualTag.Name, item.Tag)
			}
		}
	}

	return nil
}
