package webui

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"

	"solar_mqtt_go/internal/config"
)

func withConfigPathDecoy(t *testing.T) (string, []byte) {
	t.Helper()
	workingDir := t.TempDir()
	decoyPath := filepath.Join(workingDir, "solar_config.json")
	decoy := []byte(`{"mqtt_host":"cwd-decoy","factories":[{"factory_id":"DECOY","base_url":"http://127.0.0.1:1"}]}`)
	if err := os.WriteFile(decoyPath, decoy, 0o644); err != nil {
		t.Fatal(err)
	}
	originalWD, err := os.Getwd()
	if err != nil {
		t.Fatal(err)
	}
	if err := os.Chdir(workingDir); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		if err := os.Chdir(originalWD); err != nil {
			t.Errorf("restore working directory: %v", err)
		}
	})
	return decoyPath, decoy
}

func withDefaultConfigPath(t *testing.T, path string) {
	t.Helper()
	old := defaultConfigPathFor
	defaultConfigPathFor = func() string { return path }
	t.Cleanup(func() {
		defaultConfigPathFor = old
		if defaultConfigPathFor() != old() {
			t.Errorf("restore default config path: got %q, want %q", defaultConfigPathFor(), old())
		}
	})
}

func TestResolveConfigPathDefaultIgnoresCWDDecoy(t *testing.T) {
	withConfigPathDecoy(t)
	want := config.DefaultConfigPath()
	if got := resolveConfigPath(""); got != want {
		t.Fatalf("resolveConfigPath(empty) = %q, want executable config %q", got, want)
	}
}

func TestLocalConfigAPIExplicitMissingPathRemainsAuthoritative(t *testing.T) {
	decoyPath, decoy := withConfigPathDecoy(t)
	authoritativePath := filepath.Join(t.TempDir(), "authoritative.json")

	mux := http.NewServeMux()
	registerAPIRoutes(mux, Options{ConfigPath: authoritativePath})

	getResponse := httptest.NewRecorder()
	mux.ServeHTTP(getResponse, httptest.NewRequest(http.MethodGet, "/api/local-config", nil))
	if getResponse.Code != http.StatusOK {
		t.Fatalf("GET status = %d, want %d: %s", getResponse.Code, http.StatusOK, getResponse.Body.String())
	}
	var getPayload struct {
		Path string `json:"path"`
	}
	if err := json.Unmarshal(getResponse.Body.Bytes(), &getPayload); err != nil {
		t.Fatal(err)
	}
	if getPayload.Path != authoritativePath {
		t.Errorf("GET path = %q, want explicit path %q", getPayload.Path, authoritativePath)
	}

	putBody := bytes.NewBufferString(`{"config":{"mqtt_host":"authoritative-update"}}`)
	putResponse := httptest.NewRecorder()
	mux.ServeHTTP(putResponse, httptest.NewRequest(http.MethodPut, "/api/local-config", putBody))
	if putResponse.Code != http.StatusOK {
		t.Fatalf("PUT status = %d, want %d: %s", putResponse.Code, http.StatusOK, putResponse.Body.String())
	}
	written, err := os.ReadFile(authoritativePath)
	if err != nil {
		t.Errorf("explicit config was not written: %v", err)
	} else if !bytes.Contains(written, []byte("authoritative-update")) {
		t.Errorf("explicit config content = %s, want authoritative update", written)
	}
	decoyAfter, err := os.ReadFile(decoyPath)
	if err != nil {
		t.Fatal(err)
	}
	if !bytes.Equal(decoyAfter, decoy) {
		t.Errorf("CWD decoy was modified: before=%s after=%s", decoy, decoyAfter)
	}
}

func TestDefaultLocalConfigAPIAndScrapeUseCanonicalPath(t *testing.T) {
	decoyPath, decoy := withConfigPathDecoy(t)
	canonicalPath := filepath.Join(t.TempDir(), "solar_config.json")
	canonical := []byte(`{"mqtt_host":"executable-canonical","factories":[{"factory_id":"CANONICAL","base_url":"http://127.0.0.1:1"}]}`)
	if err := os.WriteFile(canonicalPath, canonical, 0o644); err != nil {
		t.Fatal(err)
	}
	withDefaultConfigPath(t, canonicalPath)

	mux := http.NewServeMux()
	registerAPIRoutes(mux, Options{})

	getResponse := httptest.NewRecorder()
	mux.ServeHTTP(getResponse, httptest.NewRequest(http.MethodGet, "/api/local-config", nil))
	if getResponse.Code != http.StatusOK {
		t.Fatalf("GET status = %d, want %d: %s", getResponse.Code, http.StatusOK, getResponse.Body.String())
	}
	var getPayload struct {
		Path   string         `json:"path"`
		Config map[string]any `json:"config"`
	}
	if err := json.Unmarshal(getResponse.Body.Bytes(), &getPayload); err != nil {
		t.Fatal(err)
	}
	if getPayload.Path != canonicalPath {
		t.Errorf("GET path = %q, want canonical path %q", getPayload.Path, canonicalPath)
	}
	if got, _ := getPayload.Config["mqtt_host"].(string); got != "executable-canonical" {
		t.Errorf("GET mqtt_host = %q, want executable-canonical", got)
	}

	putBody := bytes.NewBufferString(`{"config":{"mqtt_host":"canonical-update","factories":[{"factory_id":"CANONICAL","base_url":"http://127.0.0.1:1"}]}}`)
	putResponse := httptest.NewRecorder()
	mux.ServeHTTP(putResponse, httptest.NewRequest(http.MethodPut, "/api/local-config", putBody))
	if putResponse.Code != http.StatusOK {
		t.Fatalf("PUT status = %d, want %d: %s", putResponse.Code, http.StatusOK, putResponse.Body.String())
	}
	written, err := os.ReadFile(canonicalPath)
	if err != nil {
		t.Fatal(err)
	}
	if !bytes.Contains(written, []byte("canonical-update")) {
		t.Errorf("canonical config content = %s, want canonical update", written)
	}
	decoyAfter, err := os.ReadFile(decoyPath)
	if err != nil {
		t.Fatal(err)
	}
	if !bytes.Equal(decoyAfter, decoy) {
		t.Errorf("CWD decoy was modified: before=%s after=%s", decoy, decoyAfter)
	}

	scrapeResponse := httptest.NewRecorder()
	mux.ServeHTTP(scrapeResponse, httptest.NewRequest(http.MethodPost, "/api/scrape-now", bytes.NewBufferString(`{"factory_id":"DECOY"}`)))
	if scrapeResponse.Code != http.StatusNotFound {
		t.Errorf("scrape-now status = %d, want %d from canonical config: %s", scrapeResponse.Code, http.StatusNotFound, scrapeResponse.Body.String())
	}
}
