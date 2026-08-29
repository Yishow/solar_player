package service

import (
	"encoding/json"
	"errors"
	"fmt"
	"math"
	"strconv"
	"strings"
	"time"

	"solar_mqtt_go/internal/config"
	"solar_mqtt_go/internal/storage"
)

const (
	maxControlRequestIDLen = 128
	maxControlTTL          = 300 * time.Second
	controlClockSkew       = 30 * time.Second
	controlLedgerRetention = 24 * time.Hour
	maxControlSummaryLen   = 256
)

// controlNow is injectable so expiry behavior can be tested without sleeping.
var controlNow = time.Now

type controlEnvelope struct {
	requestID string
	issuedAt  time.Time
	ttl       time.Duration
	changes   map[string]any
	restart   bool
}

type controlResult struct {
	Site             string   `json:"site"`
	RequestID        string   `json:"requestId"`
	Command          string   `json:"command"`
	Status           string   `json:"status"`
	Code             string   `json:"code"`
	Summary          string   `json:"summary"`
	OccurredAt       string   `json:"occurredAt"`
	ChangedKeys      []string `json:"changedKeys,omitempty"`
	ConfigRevision   uint64   `json:"configRevision"`
	RestartScheduled bool     `json:"restartScheduled,omitempty"`
}

// onControl handles only the command kinds supplied by mqttbus. State and
// telemetry publications never call this method because they use other topics.
func (s *FactoryService) onControl(command string, payload map[string]any) {
	if s.stopCtx != nil && s.stopCtx.Err() != nil {
		return
	}
	s.controlMu.Lock()
	if s.stopCtx != nil && s.stopCtx.Err() != nil {
		s.controlMu.Unlock()
		return
	}
	_ = s.handleControl(command, payload, controlNow().UTC())
	s.controlMu.Unlock()
}

func (s *FactoryService) handleControl(command string, payload map[string]any, now time.Time) bool {
	requestID, ok := controlRequestID(payload)
	if !ok {
		// There is no trustworthy correlation key to put in a result.
		return false
	}

	envelope, code := validateControlEnvelope(command, payload, s.factoryID, now)
	if !s.ledgerReady() {
		s.publishControlResult(s.newRejectedResult(command, requestID, "LEDGER_UNAVAILABLE", now))
		return false
	}
	_ = s.st.PurgeProcessedCommands(now.Add(-controlLedgerRetention))

	prior, found, err := s.st.GetProcessedCommand(s.factoryID, requestID)
	if err != nil {
		s.publishControlResult(s.newRejectedResult(command, requestID, "LEDGER_UNAVAILABLE", now))
		return false
	}
	if found {
		s.publishControlResult(duplicateResult(prior, now))
		return false
	}
	if code != "" {
		result := s.newRejectedResult(command, requestID, code, now)
		if s.publishStoredResult(result, now) {
			s.publishControlResult(result)
		}
		return false
	}

	if command == "get-config" {
		result := controlResult{
			Site:           s.factoryID,
			RequestID:      envelope.requestID,
			Command:        command,
			Status:         "accepted",
			Code:           "OK",
			Summary:        controlSummary("OK"),
			OccurredAt:     now.Format(time.RFC3339Nano),
			ConfigRevision: s.configRevision,
		}
		if !s.publishStoredResult(result, now) {
			return false
		}
		s.publishConfigState(s.configRevision, now)
		s.publishControlResult(result)
		return false
	}

	transaction, err := s.cfg.BeginRemoteSetTransaction(s.factoryID, envelope.changes)
	if err != nil {
		code := err.Error()
		if code == "" {
			code = "INVALID_VALUE"
		}
		result := s.newRejectedResult(command, requestID, code, now)
		if s.publishStoredResult(result, now) {
			s.publishControlResult(result)
		}
		return false
	}
	defer transaction.Close()
	changed := transaction.Changed()

	var staged *config.StagedSave
	if len(changed) > 0 {
		if s.stageConfig != nil {
			staged, err = s.stageConfig(s.factoryID, requestID)
		} else if s.saveConfig == nil {
			err = fmt.Errorf("configuration persistence unavailable")
		} else {
			err = s.saveConfig()
		}
		if err != nil {
			transaction.Rollback()
			result := s.newRejectedResult(command, requestID, "PERSISTENCE_FAILED", now)
			if s.publishStoredResult(result, now) {
				s.publishControlResult(result)
			}
			return false
		}
	}
	nextRevision := s.configRevision
	if len(changed) > 0 {
		nextRevision++
	}
	result := controlResult{
		Site:             s.factoryID,
		RequestID:        envelope.requestID,
		Command:          command,
		Status:           "accepted",
		Code:             "OK",
		Summary:          controlSummary("OK"),
		OccurredAt:       now.Format(time.RFC3339Nano),
		ChangedKeys:      append([]string(nil), changed...),
		ConfigRevision:   nextRevision,
		RestartScheduled: envelope.restart,
	}
	if !s.publishStoredResult(result, now) {
		if staged != nil {
			if err := staged.Discard(); err != nil {
				fmt.Printf("警告：pending config discard 失敗（factory=%s）：%v\n", staged.FactoryID(), err)
				if s.failClosed != nil {
					s.failClosed()
				}
			}
		}
		if len(changed) > 0 {
			transaction.Rollback()
			if staged == nil && s.saveConfig != nil {
				_ = s.saveConfig()
			}
		}
		return false
	}
	if staged != nil {
		commitStaged := s.commitStaged
		if commitStaged == nil {
			commitStaged = func(staged *config.StagedSave) error { return staged.Commit() }
		}
		if err := commitStaged(staged); err != nil {
			fmt.Printf("警告：pending config commit 失敗（factory=%s）：%v\n", staged.FactoryID(), err)
			var commitErr *config.CommitError
			if errors.As(err, &commitErr) && commitErr.Applied {
				// The accepted ledger row and live file already agree; only the
				// pending cleanup is incomplete. Keep memory/result accepted and
				// stop every service until startup recovery removes the pending file.
				fmt.Printf("警告：pending config cleanup 失敗（factory=%s）：已提交，等待 recovery\n", staged.FactoryID())
				if len(changed) > 0 {
					s.configRevision = nextRevision
					s.updateRuntimeSettings(changed)
				}
				s.publishConfigState(s.configRevision, now)
				s.publishControlResult(result)
				if s.failClosed != nil {
					s.failClosed()
				}
				return envelope.restart
			}
			if s.failClosed != nil {
				s.failClosed()
			}
			transaction.Rollback()
			failed := s.newRejectedResult(command, requestID, "PERSISTENCE_FAILED", now)
			_ = s.storeProcessedResult(failed, now)
			s.publishControlResult(failed)
			return false
		}
	}
	if len(changed) > 0 {
		s.configRevision = nextRevision
		s.updateRuntimeSettings(changed)
	}
	s.publishConfigState(s.configRevision, now)
	s.publishControlResult(result)
	return envelope.restart
}

func (s *FactoryService) ledgerReady() bool {
	return s.st != nil && s.st.Enabled()
}

func (s *FactoryService) publishStoredResult(result controlResult, now time.Time) bool {
	if !s.storeProcessedResult(result, now) {
		failed := s.newRejectedResult(result.Command, result.RequestID, "LEDGER_WRITE_FAILED", now)
		s.publishControlResult(failed)
		return false
	}
	return true
}

func (s *FactoryService) storeProcessedResult(result controlResult, now time.Time) bool {
	if s.putProcessedCommand == nil {
		return false
	}
	if err := s.putProcessedCommand(storage.CommandRecord{
		Site:             result.Site,
		RequestID:        result.RequestID,
		Command:          result.Command,
		Status:           result.Status,
		Code:             result.Code,
		Summary:          result.Summary,
		ChangedKeys:      append([]string(nil), result.ChangedKeys...),
		OccurredAt:       result.OccurredAt,
		ConfigRevision:   int64(result.ConfigRevision),
		RestartScheduled: result.RestartScheduled,
		CompletedAt:      now,
	}); err != nil {
		return false
	}
	return true
}

func (s *FactoryService) publishConfigState(revision uint64, now time.Time) {
	state := map[string]any{
		"factory_id":                   s.factoryID,
		"site":                         s.factoryID,
		"interval":                     s.cfg.GetInt("interval", 60),
		"night_pause":                  s.cfg.GetBool("night_pause", false),
		"night_padding_min":            s.cfg.GetInt("night_padding_min", 30),
		"heartbeat_interval":           s.cfg.GetInt("heartbeat_interval", 30),
		"anomaly_daytime_zero_minutes": s.cfg.GetInt("anomaly_daytime_zero_minutes", 5),
		"mqtt_retain_summary":          s.cfg.GetBool("mqtt_retain_summary", true),
		"mqtt_retain_zone":             s.cfg.GetBool("mqtt_retain_zone", true),
		"mqtt_retain_status":           s.cfg.GetBool("mqtt_retain_status", true),
		"mqtt_retain_config":           s.cfg.GetBool("mqtt_retain_config", true),
		"mqtt_retain_alert":            s.cfg.GetBool("mqtt_retain_alert", false),
		"mqtt_retain_heartbeat":        s.cfg.GetBool("mqtt_retain_heartbeat", false),
		"revision":                     revision,
		"updated_at":                   now.Format(time.RFC3339Nano),
	}
	topic := s.cfg.GetString("mqtt_prefix", "solar") + "/" + s.factoryID + "/state/config"
	s.bus.PublishJSON(topic, state, true)
}

func (s *FactoryService) publishControlResult(result controlResult) {
	topic := s.cfg.GetString("mqtt_prefix", "solar") + "/" + s.factoryID + "/state/control-result"
	s.bus.PublishJSON(topic, result, false)
}

func (s *FactoryService) newRejectedResult(command, requestID, code string, now time.Time) controlResult {
	return controlResult{
		Site:       s.factoryID,
		RequestID:  requestID,
		Command:    command,
		Status:     "rejected",
		Code:       code,
		Summary:    controlSummary(code),
		OccurredAt: now.Format(time.RFC3339Nano),
	}
}

func duplicateResult(prior *storage.CommandRecord, now time.Time) controlResult {
	if prior == nil {
		return controlResult{}
	}
	return controlResult{
		Site:             prior.Site,
		RequestID:        prior.RequestID,
		Command:          prior.Command,
		Status:           "duplicate",
		Code:             "DUPLICATE_REQUEST",
		Summary:          controlSummary("DUPLICATE_REQUEST"),
		OccurredAt:       now.Format(time.RFC3339Nano),
		ChangedKeys:      append([]string(nil), prior.ChangedKeys...),
		ConfigRevision:   uint64(prior.ConfigRevision),
		RestartScheduled: prior.RestartScheduled,
	}
}

func controlSummary(code string) string {
	summary := "command rejected"
	switch code {
	case "OK":
		summary = "command accepted"
	case "DUPLICATE_REQUEST":
		summary = "request already processed"
	case "COMMAND_EXPIRED":
		summary = "command expired"
	case "COMMAND_FUTURE":
		summary = "command is too far in the future"
	case "PERSISTENCE_FAILED":
		summary = "configuration persistence failed"
	case "RESTART_UNSUPPORTED":
		summary = "restart is not supported by this collector"
	case "LEDGER_UNAVAILABLE", "LEDGER_WRITE_FAILED":
		summary = "command ledger unavailable"
	}
	if len(summary) > maxControlSummaryLen {
		return summary[:maxControlSummaryLen]
	}
	return summary
}

func validateControlEnvelope(command string, payload map[string]any, factoryID string, now time.Time) (controlEnvelope, string) {
	envelope := controlEnvelope{}
	requestID, ok := controlRequestID(payload)
	if !ok {
		return envelope, "INVALID_REQUEST_ID"
	}
	envelope.requestID = requestID

	allowed := map[string]struct{}{
		"requestId":  {},
		"issuedAt":   {},
		"ttlSeconds": {},
		"site":       {},
	}
	if command == "set" {
		allowed["changes"] = struct{}{}
		allowed["restart"] = struct{}{}
	} else if command != "get-config" {
		return envelope, "INVALID_COMMAND"
	}
	for key := range payload {
		if _, known := allowed[key]; !known {
			return envelope, "UNKNOWN_FIELD"
		}
	}

	if rawSite, hasSite := payload["site"]; hasSite {
		site, ok := rawSite.(string)
		if !ok || site == "" {
			return envelope, "INVALID_SITE"
		}
		if site != factoryID {
			return envelope, "SITE_MISMATCH"
		}
	}
	issuedAt, ok := parseIssuedAt(payload["issuedAt"])
	if !ok {
		return envelope, "INVALID_ISSUED_AT"
	}
	envelope.issuedAt = issuedAt
	ttl, ok := parseControlTTL(payload["ttlSeconds"])
	if !ok {
		return envelope, "INVALID_TTL"
	}
	envelope.ttl = ttl
	if issuedAt.After(now.Add(controlClockSkew)) {
		return envelope, "COMMAND_FUTURE"
	}
	if now.After(issuedAt.Add(ttl)) {
		return envelope, "COMMAND_EXPIRED"
	}

	if command == "set" {
		rawChanges, hasChanges := payload["changes"]
		if !hasChanges {
			return envelope, "MISSING_CHANGES"
		}
		changes, ok := rawChanges.(map[string]any)
		if !ok || changes == nil {
			return envelope, "INVALID_CHANGES"
		}
		envelope.changes = changes
		if rawRestart, hasRestart := payload["restart"]; hasRestart {
			restart, ok := rawRestart.(bool)
			if !ok {
				return envelope, "INVALID_RESTART"
			}
			envelope.restart = restart
			if restart {
				return envelope, "RESTART_UNSUPPORTED"
			}
		}
	}
	return envelope, ""
}

func controlRequestID(payload map[string]any) (string, bool) {
	raw, ok := payload["requestId"]
	if !ok {
		return "", false
	}
	requestID, ok := raw.(string)
	requestID = strings.TrimSpace(requestID)
	if !ok || requestID == "" || len(requestID) > maxControlRequestIDLen {
		return "", false
	}
	return requestID, true
}

func parseIssuedAt(value any) (time.Time, bool) {
	switch v := value.(type) {
	case string:
		t, err := time.Parse(time.RFC3339Nano, strings.TrimSpace(v))
		return t.UTC(), err == nil
	case json.Number:
		f, err := strconv.ParseFloat(string(v), 64)
		if err != nil {
			return time.Time{}, false
		}
		return epochTime(f)
	case float64:
		return epochTime(v)
	case int:
		return time.Unix(int64(v), 0).UTC(), true
	case int64:
		return time.Unix(v, 0).UTC(), true
	case int32:
		return time.Unix(int64(v), 0).UTC(), true
	default:
		return time.Time{}, false
	}
}

func epochTime(value float64) (time.Time, bool) {
	if math.IsNaN(value) || math.IsInf(value, 0) || value < -62135596800 || value > 253402300799 {
		return time.Time{}, false
	}
	seconds := math.Floor(value)
	nanos := math.Round((value - seconds) * 1e9)
	if nanos >= 1e9 {
		seconds++
		nanos -= 1e9
	}
	return time.Unix(int64(seconds), int64(nanos)).UTC(), true
}

func parseControlTTL(value any) (time.Duration, bool) {
	n, ok := strictInt64(value)
	maxSeconds := int64(maxControlTTL / time.Second)
	if !ok || n < 1 || n > maxSeconds {
		return 0, false
	}
	return time.Duration(n) * time.Second, true
}

func strictInt64(value any) (int64, bool) {
	switch v := value.(type) {
	case int:
		return int64(v), true
	case int64:
		return v, true
	case int32:
		return int64(v), true
	case float64:
		if math.IsNaN(v) || math.IsInf(v, 0) || math.Trunc(v) != v || v < -9223372036854775808 || v >= 9223372036854775808 {
			return 0, false
		}
		return int64(v), true
	case json.Number:
		n, err := strconv.ParseInt(string(v), 10, 64)
		return n, err == nil
	default:
		return 0, false
	}
}

func (s *FactoryService) updateRuntimeSettings(changed []string) {
	for _, key := range changed {
		switch key {
		case "heartbeat_interval":
			s.heartbeat.UpdateSettings(
				s.cfg.GetString("mqtt_prefix", "solar"),
				s.cfg.GetInt("heartbeat_interval", 30),
			)
		case "anomaly_daytime_zero_minutes":
			s.anomaly.SetDaytimeZeroMinutes(s.cfg.GetInt("anomaly_daytime_zero_minutes", 5))
		}
	}
}
