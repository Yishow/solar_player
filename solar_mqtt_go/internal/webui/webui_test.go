package webui

import (
	"errors"
	"fmt"
	"io"
	"io/fs"
	"net"
	"net/http"
	"os"
	"path"
	"regexp"
	"strings"
	"testing"
	"time"
)

func readDashboardJS(t *testing.T) string {
	t.Helper()
	paths := []string{"web/js/app.js", "web/js/mqtt-manager.js", "web/js/factory-view.js", "web/js/config-view.js", "web/js/local-config-view.js"}
	var all strings.Builder
	for _, path := range paths {
		source, err := fs.ReadFile(webFS, path)
		if err != nil {
			t.Fatalf("read %s: %v", path, err)
		}
		all.Write(source)
		all.WriteByte('\n')
	}
	return all.String()
}

func TestEmbeddedDashboardAssetGraphResolves(t *testing.T) {
	indexSource, err := fs.ReadFile(webFS, "web/index.html")
	if err != nil {
		t.Fatal(err)
	}
	assetRef := regexp.MustCompile(`(?:src|href)="([^"]+)"`)
	for _, match := range assetRef.FindAllStringSubmatch(string(indexSource), -1) {
		ref := match[1]
		if strings.HasPrefix(ref, "http://") || strings.HasPrefix(ref, "https://") || strings.HasPrefix(ref, "data:") || strings.HasPrefix(ref, "#") {
			continue
		}
		if _, err := fs.Stat(webFS, path.Join("web", ref)); err != nil {
			t.Errorf("index.html references missing embedded asset %q: %v", ref, err)
		}
	}

	moduleImport := regexp.MustCompile(`(?:from|import)\s*["']([^"']+)["']`)
	queue := []string{"web/js/app.js"}
	seen := map[string]bool{}
	for len(queue) > 0 {
		modulePath := queue[0]
		queue = queue[1:]
		if seen[modulePath] {
			continue
		}
		seen[modulePath] = true
		source, err := fs.ReadFile(webFS, modulePath)
		if err != nil {
			t.Fatalf("module graph references missing module %q: %v", modulePath, err)
		}
		for _, match := range moduleImport.FindAllStringSubmatch(string(source), -1) {
			specifier := match[1]
			if !strings.HasPrefix(specifier, ".") {
				continue
			}
			resolved := path.Join(path.Dir(modulePath), specifier)
			if _, err := fs.Stat(webFS, resolved); err != nil {
				t.Errorf("%s imports missing embedded module %q: %v", modulePath, resolved, err)
				continue
			}
			queue = append(queue, resolved)
		}
	}
}

func TestDashboardUsesTrueESModulesAndSafeDOMRendering(t *testing.T) {
	indexSource, err := fs.ReadFile(webFS, "web/index.html")
	if err != nil {
		t.Fatal(err)
	}
	index := string(indexSource)
	if !strings.Contains(index, `<script type="module" src="js/app.js"></script>`) {
		t.Fatal("dashboard entry must be an ES module")
	}
	if strings.Contains(index, `<script src="app.js">`) || strings.Contains(index, `<script src="js/ui.js">`) {
		t.Fatal("dashboard still loads a legacy script entry")
	}
	for _, marker := range []string{"./mqtt-manager.js", "./factory-view.js", "./config-view.js"} {
		if !strings.Contains(readDashboardJS(t), marker) {
			t.Errorf("dashboard missing module import %q", marker)
		}
	}
	js := readDashboardJS(t)
	if strings.Contains(js, "innerHTML") {
		t.Fatal("broker-controlled topic/name/payload rendering must not use innerHTML")
	}
	if !strings.Contains(js, "textContent") || !strings.Contains(js, "createElement") {
		t.Fatal("dashboard must render untrusted values with textContent/createElement")
	}
}

func TestDashboardControlEnvelopeMatchesBackend(t *testing.T) {
	js := readDashboardJS(t)
	envelope := regexp.MustCompile(`(?s)function controlEnvelope\(pending, changes\).*?\n}`)
	match := envelope.FindString(js)
	if match == "" {
		t.Fatal("controlEnvelope implementation missing")
	}
	for _, field := range []string{"requestId", "issuedAt", "ttlSeconds", "site"} {
		if !strings.Contains(match, field) {
			t.Errorf("control envelope missing %s", field)
		}
	}
	if !strings.Contains(match, `pending.command === "set"`) || !strings.Contains(match, "changes") {
		t.Fatal("only set envelopes may carry changes")
	}
	if strings.Contains(match, "command:") {
		t.Fatal("control envelope must not send command as an unknown field")
	}
	if !strings.Contains(js, `newPendingRequest(factoryId, "get-config")`) || !strings.Contains(js, `newPendingRequest(factoryId, "set")`) {
		t.Fatal("pending command values must match backend result values")
	}
	if !strings.Contains(js, `parsed.status === "accepted"`) || !strings.Contains(js, `parsed.status === "rejected"`) || !strings.Contains(js, `parsed.status === "duplicate"`) {
		t.Fatal("accepted/rejected/duplicate result statuses need explicit handling")
	}
	if !strings.Contains(js, "slice(0,") {
		t.Fatal("control result summary must be bounded before display")
	}
}

func TestDashboardShowsVisibleFactorySubscriptions(t *testing.T) {
	indexSource, err := fs.ReadFile(webFS, "web/index.html")
	if err != nil {
		t.Fatal(err)
	}
	index := string(indexSource)
	start := strings.Index(index, `id="mqtt-subscriptions"`)
	if start < 0 {
		t.Fatal("subscription section missing")
	}
	end := strings.Index(index[start:], "</section>")
	if end < 0 {
		t.Fatal("subscription section boundary missing")
	}
	section := index[start : start+end]
	if strings.Contains(section, "display:none") || strings.Contains(section, "hidden") {
		t.Fatal("subscription section must be visible")
	}
	for _, topic := range []string{"summary", "total_power_kw", "today_mwh", "month_mwh", "total_mwh", "zone/#", "status", "heartbeat", "alert", "state/config", "state/control-result"} {
		if !strings.Contains(readDashboardJS(t), topic) {
			t.Errorf("factoryDataTopics missing %s", topic)
		}
	}
	js := readDashboardJS(t)
	topicsStart := strings.Index(js, "export function factoryDataTopics(")
	if topicsStart < 0 {
		t.Fatal("factoryDataTopics boundaries missing")
	}
	topicsEnd := strings.Index(js[topicsStart:], "export function renderSubscriptions(")
	if topicsEnd < 0 {
		t.Fatal("factoryDataTopics boundaries missing")
	}
	if got := strings.Count(js[topicsStart:topicsStart+topicsEnd], "${base}/"); got != 11 {
		t.Fatalf("factoryDataTopics count = %d, want 11", got)
	}
	if strings.Contains(index, `solar/KN/#`) || strings.Contains(index, `solar/CL/#`) {
		t.Fatal("quick subscription command must follow the active prefix")
	}
}

func TestDashboardEscapesUntrustedTelemetryWithoutMarkup(t *testing.T) {
	js := readDashboardJS(t)
	for _, unsafeAPI := range []string{"innerHTML", "insertAdjacentHTML", "document.write"} {
		if strings.Contains(js, unsafeAPI) {
			t.Fatalf("untrusted telemetry renderer must not call %s", unsafeAPI)
		}
	}
	for _, marker := range []string{
		"appendCell(row, \"col-name\", zone.name",
		"appendCell(row, \"topic-row__payload\", rowData.payloadText, \"span\")",
		"item.textContent = topic",
		"document.createElement(tagName)",
	} {
		if !strings.Contains(js, marker) {
			t.Errorf("malicious HTML regression guard missing safe rendering marker %q", marker)
		}
	}
	// This is the attack payload the renderer must treat as text, never as a node.
	if strings.Contains(js, `<img onerror="alert(1)">`) {
		t.Fatal("attack payload must not be embedded in dashboard source")
	}
}

func TestMqttManagerGuardsDisconnectedAndStaleClients(t *testing.T) {
	source, err := fs.ReadFile(webFS, "web/js/mqtt-manager.js")
	if err != nil {
		t.Fatal(err)
	}
	manager := string(source)
	start := strings.Index(manager, "function updateActivePrefix(")
	end := strings.Index(manager[start:], "function disconnect(")
	if start < 0 || end < 0 {
		t.Fatal("MQTT prefix lifecycle boundaries missing")
	}
	prefixHandler := manager[start : start+end]
	if !strings.Contains(prefixHandler, `connectionState === "connected"`) {
		t.Fatal("prefix changes must not resubscribe a disconnected client")
	}
	for _, marker := range []string{
		"let clientGeneration = 0",
		"const generation = clientGeneration",
		"client === currentClient",
		"generation === clientGeneration",
		"resubscribe: false",
	} {
		if !strings.Contains(manager, marker) {
			t.Errorf("MQTT lifecycle identity/ownership guard missing %q", marker)
		}
	}
}

func TestMqttManagerUsesTLSForRemoteBrokers(t *testing.T) {
	source, err := fs.ReadFile(webFS, "web/js/mqtt-manager.js")
	if err != nil {
		t.Fatal(err)
	}
	manager := string(source)
	if !strings.Contains(manager, "isLoopbackHost") {
		t.Fatal("broker protocol selection must distinguish loopback from remote hosts")
	}
	if strings.Contains(manager, "const url = `ws://${settings.host}") {
		t.Fatal("remote broker control must not use unconditional plaintext ws")
	}
	for _, marker := range []string{"wss://", "ws://", "127.0.0.1", "localhost", "::1"} {
		if !strings.Contains(manager, marker) {
			t.Errorf("broker protocol selection missing %q", marker)
		}
	}
}

func TestMqttManagerResetsSubscriptionsBeforeReplacingClient(t *testing.T) {
	source, err := fs.ReadFile(webFS, "web/js/mqtt-manager.js")
	if err != nil {
		t.Fatal(err)
	}
	manager := string(source)
	start := strings.Index(manager, "function connect()")
	end := strings.Index(manager[start:], "const url =")
	if start < 0 || end < 0 {
		t.Fatal("MQTT connect lifecycle boundaries missing")
	}
	connectBody := manager[start : start+end]
	resetAt := strings.Index(connectBody, "resetSubscriptionState()")
	previousAt := strings.Index(connectBody, "const previousClient = client")
	if resetAt < 0 || previousAt < 0 || resetAt > previousAt {
		t.Fatal("reconnect must clear visible subscription state before replacing the client")
	}
}

func TestSystrayWebCheckUsesCurrentEntryPoint(t *testing.T) {
	source, err := fs.ReadFile(webFS, "web/js/app.js")
	if err != nil {
		t.Fatal(err)
	}
	if len(source) == 0 {
		t.Fatal("embedded web/js/app.js must not be empty")
	}
	if _, err := fs.Stat(webFS, "web/app.js"); !errors.Is(err, fs.ErrNotExist) {
		t.Fatalf("removed embedded web/app.js must not exist (err: %v)", err)
	}
}

func TestServeIndex200(t *testing.T) {
	s, err := Start(18899)
	if err != nil {
		t.Fatal(err)
	}
	defer s.Stop()

	client := &http.Client{Timeout: 2 * time.Second}
	resp, err := client.Get("http://127.0.0.1:18899/")
	if err != nil {
		t.Fatalf("GET /: %v", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != 200 {
		t.Fatalf("status = %d", resp.StatusCode)
	}
	body, _ := io.ReadAll(resp.Body)
	if len(body) == 0 {
		t.Error("index body empty")
	}

	// vendor 資產
	resp2, err := client.Get("http://127.0.0.1:18899/vendor/mqtt.min.js")
	if err != nil {
		t.Fatalf("GET vendor: %v", err)
	}
	resp2.Body.Close()
	if resp2.StatusCode != 200 {
		t.Errorf("vendor status = %d", resp2.StatusCode)
	}
}

func TestBindsLoopbackOnly(t *testing.T) {
	s, err := Start(18898)
	if err != nil {
		t.Fatal(err)
	}
	defer s.Stop()

	// listener 位址必須是 127.0.0.1
	addr := s.Addr()
	host, _, err := net.SplitHostPort(addr)
	if err != nil {
		t.Fatal(err)
	}
	if host != "127.0.0.1" {
		t.Errorf("bound host = %s, want 127.0.0.1", host)
	}
}

func TestPortFallback(t *testing.T) {
	// 佔住 18897 → Start 應 fallback 到 18898
	blocker, err := net.Listen("tcp", "127.0.0.1:18897")
	if err != nil {
		t.Fatal(err)
	}
	defer blocker.Close()

	s, err := Start(18897)
	if err != nil {
		t.Fatal(err)
	}
	defer s.Stop()
	_, port, _ := net.SplitHostPort(s.Addr())
	if port == "18897" {
		t.Error("should not bind the occupied port")
	}
}

func TestOpenBrowserCommand(t *testing.T) {
	var got string
	open := func(cmd string) error { got = cmd; return nil }
	if err := OpenBrowserWithURL("http://127.0.0.1:18868/", open); err != nil {
		t.Fatal(err)
	}
	if got == "" {
		t.Error("no browser command produced")
	}
}

func TestDashboardUsesHardenedControlContract(t *testing.T) {
	app := readDashboardJS(t)
	indexSource, err := fs.ReadFile(webFS, "web/index.html")
	if err != nil {
		t.Fatal(err)
	}
	index := string(indexSource)
	for _, want := range []string{"cmd/get-config", "cmd/set", "state/config", "state/control-result", "requestId", "ttlSeconds", "username", "password"} {
		if !strings.Contains(app, want) && !strings.Contains(index, want) {
			t.Errorf("dashboard missing hardened contract marker %q", want)
		}
	}
	for _, legacy := range []string{"${state.activePrefix}/${factoryId}/config", "${state.activePrefix}/${factoryId}/set"} {
		if strings.Contains(app, legacy) {
			t.Errorf("dashboard still uses legacy control topic %q", legacy)
		}
	}
	for _, forbidden := range []string{
		`id="restart-required"`,
		"Include restart",
		"restartHint",
		"payload.restart",
		"restart: true",
		"supervisor restart",
	} {
		if strings.Contains(app, forbidden) || strings.Contains(index, forbidden) {
			t.Errorf("dashboard exposes unsupported restart action marker %q", forbidden)
		}
	}
	for _, required := range []string{"cmd/get-config", "cmd/set", "remoteSetFields", "function controlEnvelope(pending, changes)"} {
		if !strings.Contains(app, required) {
			t.Errorf("dashboard lost supported control marker %q", required)
		}
	}
	for _, forbidden := range []string{`name="login_pass"`, `name="login_user"`, `name="base_url"`, `name="mqtt_host"`, `name="mqtt_port"`, `name="mqtt_prefix"`} {
		if strings.Contains(index, forbidden) {
			t.Errorf("dashboard still exposes forbidden config field %q", forbidden)
		}
	}
	for _, marker := range []string{
		`id="broker-username" name="brokerUsername" autocomplete="off"`,
		`id="broker-password" name="brokerPassword" type="password" autocomplete="off"`,
	} {
		if !strings.Contains(index, marker) {
			t.Errorf("dashboard credential input missing non-persistent autocomplete marker %q", marker)
		}
	}
	for _, semantic := range []string{`autocomplete="username"`, `autocomplete="current-password"`} {
		if strings.Contains(index, semantic) {
			t.Errorf("dashboard credential input still enables password-manager semantic %q", semantic)
		}
	}
	for _, marker := range []string{
		"parsed.requestId !== pendingRequest.requestId",
		"parsed.site !== pendingRequest.factoryId",
		"parsed.command !== pendingRequest.command",
		"latestStateByFactory",
		"parsed.configRevision",
		"current.revision",
	} {
		if !strings.Contains(app, marker) {
			t.Errorf("dashboard control correlation missing marker %q", marker)
		}
	}
}

func TestEmbeddedDashboardSubscriptionContract(t *testing.T) {
	app := readDashboardJS(t)
	indexSource, err := fs.ReadFile(webFS, "web/index.html")
	if err != nil {
		t.Fatal(err)
	}
	index := string(indexSource)

	for _, marker := range []string{
		`id="mqtt-subscriptions"`,
		`id="mqtt-subscriptions-kn"`,
		`id="mqtt-subscriptions-cl"`,
		`data-subscription-state`,
		`not-subscribed`,
		`subscription-sent`,
		"renderSubscriptions",
	} {
		if !strings.Contains(app, marker) && !strings.Contains(index, marker) {
			t.Errorf("dashboard missing MQTT subscription marker %q", marker)
		}
	}

	// The topic factory is the single source for all rendered and broker-bound
	// topic lists; callers must not maintain a second static subscription list.
	if strings.Count(app, "factoryDataTopics(") < 3 {
		t.Error("dashboard must use factoryDataTopics for render, subscribe, and unsubscribe")
	}
	if strings.Contains(app, "const subscriptionTopics") || strings.Contains(app, "const mqttTopics") {
		t.Error("dashboard introduced a second static MQTT topic source")
	}
	for _, marker := range []string{"updateActivePrefix", "renderAllPanels", "subscribeFactoryTopics", "unsubscribeFactoryTopics"} {
		if !strings.Contains(app, marker) {
			t.Errorf("dashboard subscription flow missing %q", marker)
		}
	}
}

func TestDashboardResetsSubscriptionStatusOnUnexpectedDisconnect(t *testing.T) {
	app := readDashboardJS(t)
	for _, event := range []string{"close", "offline"} {
		startMarker := fmt.Sprintf(`currentClient.on("%s", () => {`, event)
		start := strings.Index(app, startMarker)
		if start < 0 {
			t.Fatalf("dashboard missing MQTT %s handler", event)
		}
		end := strings.Index(app[start:], "\n    });")
		if end < 0 {
			t.Fatalf("dashboard %s handler boundary missing", event)
		}
		handler := app[start : start+end]
		if !strings.Contains(handler, "resetSubscriptionState()") {
			t.Errorf("dashboard %s handler must reset subscription status", event)
		}
	}
	if !strings.Contains(app, "if (!userDisconnected)") {
		t.Error("dashboard lost user-disconnect guard")
	}
}

func TestDashboardCloseAfterErrorResetsSubscriptionStatus(t *testing.T) {
	app := readDashboardJS(t)
	start := strings.Index(app, `currentClient.on("close", () => {`)
	if start < 0 {
		t.Fatal("dashboard missing MQTT close handler")
	}
	end := strings.Index(app[start:], "\n    });")
	if end < 0 {
		t.Fatal("dashboard close handler boundary missing")
	}
	handler := app[start : start+end]
	resetAt := strings.Index(handler, "resetSubscriptionState()")
	if resetAt < 0 {
		t.Fatal("dashboard close handler must reset subscription status")
	}
	errorGuardAt := strings.Index(handler, `connectionState !== "error"`)
	if errorGuardAt < 0 {
		t.Fatal("dashboard close handler must preserve the error connection state")
	}
	if resetAt > errorGuardAt {
		t.Error("dashboard close must reset subscriptions before the error-state guard")
	}
	if !strings.Contains(handler, `if (!userDisconnected) {`) {
		t.Error("dashboard close reset must remain guarded for user disconnect")
	}
}

func TestDashboardErrorResetsSubscriptionStatusImmediately(t *testing.T) {
	app := readDashboardJS(t)
	start := strings.Index(app, `currentClient.on("error", (error) => {`)
	if start < 0 {
		t.Fatal("dashboard missing MQTT error handler")
	}
	end := strings.Index(app[start:], "\n    });")
	if end < 0 {
		t.Fatal("dashboard error handler boundary missing")
	}
	handler := app[start : start+end]
	resetAt := strings.Index(handler, "resetSubscriptionState()")
	stateAt := strings.Index(handler, "setState(\"error\"")
	if resetAt < 0 || stateAt < 0 {
		t.Fatal("dashboard error handler must reset subscriptions and retain error state")
	}
	if resetAt > stateAt {
		t.Error("dashboard error handler must reset subscriptions before retaining error state")
	}
	if !strings.Contains(handler, `if (!userDisconnected) {`) {
		t.Error("dashboard error reset must remain guarded for user disconnect")
	}
}

func TestEmbeddedDashboardCredentialsNotRendered(t *testing.T) {
	app := readDashboardJS(t)
	indexSource, err := fs.ReadFile(webFS, "web/index.html")
	if err != nil {
		t.Fatal(err)
	}
	index := string(indexSource)

	start := strings.Index(app, "function renderSubscriptions()")
	if start < 0 {
		start = strings.Index(app, "export function renderSubscriptions(")
	}
	end := strings.Index(app[start:], "function resetSubscriptionState()")
	if end < 0 {
		end = strings.Index(app[start:], "function createMqttManager(")
	}
	if start < 0 || end < 0 {
		t.Fatal("subscription renderer boundaries missing")
	}
	renderer := app[start : start+end]
	for _, forbidden := range []string{"brokerUsername", "brokerPassword", "state.broker", "username", "password"} {
		if strings.Contains(renderer, forbidden) {
			t.Errorf("subscription renderer exposes credential marker %q", forbidden)
		}
	}
	for _, forbidden := range []string{"data-broker-username", "data-broker-password", "data-credential"} {
		if strings.Contains(index, forbidden) {
			t.Errorf("subscription markup exposes credential data attribute %q", forbidden)
		}
	}
	if !strings.Contains(renderer, "item.textContent = topic") {
		t.Error("subscription renderer must render only topic values")
	}
}

func TestStopWaitsForActiveRequestGracefully(t *testing.T) {
	started := make(chan struct{})
	release := make(chan struct{})
	listener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	srv := &Server{
		srv: &http.Server{Handler: http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
			close(started)
			<-release
			_, _ = fmt.Fprint(w, "ok")
		})},
		ln: listener,
	}
	go func() { _ = srv.srv.Serve(listener) }()

	response := make(chan error, 1)
	go func() {
		resp, err := http.Get("http://" + listener.Addr().String())
		if resp != nil {
			resp.Body.Close()
		}
		response <- err
	}()
	select {
	case <-started:
	case <-time.After(time.Second):
		t.Fatal("request did not reach the handler")
	}

	stopped := make(chan struct{})
	go func() {
		srv.Stop()
		close(stopped)
	}()
	select {
	case <-stopped:
		t.Fatal("Stop closed an active request instead of waiting")
	case <-time.After(100 * time.Millisecond):
	}
	close(release)
	select {
	case <-stopped:
	case <-time.After(2 * time.Second):
		t.Fatal("graceful Stop did not finish after request completed")
	}
	if err := <-response; err != nil {
		t.Fatalf("request failed during graceful shutdown: %v", err)
	}
}

func TestStopHasBoundedShutdownTimeout(t *testing.T) {
	started := make(chan struct{})
	release := make(chan struct{})
	listener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	srv := &Server{
		srv: &http.Server{Handler: http.HandlerFunc(func(http.ResponseWriter, *http.Request) {
			close(started)
			<-release
		})},
		ln: listener,
	}
	go func() { _ = srv.srv.Serve(listener) }()
	go func() { _, _ = http.Get("http://" + listener.Addr().String()) }()
	select {
	case <-started:
	case <-time.After(time.Second):
		t.Fatal("request did not reach the handler")
	}

	startedAt := time.Now()
	srv.Stop()
	if elapsed := time.Since(startedAt); elapsed > 2500*time.Millisecond {
		t.Fatalf("Stop exceeded bounded timeout: %s", elapsed)
	}
	close(release)
}

func TestLocalConfigAPIEndpoints(t *testing.T) {
	tmpDir := t.TempDir()
	configPath := path.Join(tmpDir, "solar_config.json")
	initialConfig := `{"factories":[{"factory_id":"KN","base_url":"http://127.0.0.1:8080","login_user":"u","login_pass":"p"}],"interval":60}`
	if err := os.WriteFile(configPath, []byte(initialConfig), 0o644); err != nil {
		t.Fatal(err)
	}

	server, err := StartWithOptions(Options{
		Port:       18950,
		ConfigPath: configPath,
		TestLogin: func(factoryID, baseURL, user, pass string) (int64, error) {
			if user == "fail" {
				return 10, fmt.Errorf("auth error")
			}
			return 25, nil
		},
		ScrapeNow: func(factoryID string) (map[string]any, []map[string]any, error) {
			return map[string]any{"total_power_kw": 5.5}, []map[string]any{{"zone_id": 1, "name": "A"}}, nil
		},
	})
	if err != nil {
		t.Fatal(err)
	}
	defer server.Stop()

	client := &http.Client{Timeout: 2 * time.Second}
	apiURL := "http://" + server.Addr()

	// 1. GET /api/local-config
	resp, err := client.Get(apiURL + "/api/local-config")
	if err != nil {
		t.Fatal(err)
	}
	if resp.StatusCode != 200 {
		t.Fatalf("GET /api/local-config status = %d", resp.StatusCode)
	}
	resp.Body.Close()

	// 2. POST /api/local-config
	updateBody := `{"config":{"factories":[{"factory_id":"KN","base_url":"http://192.168.1.100","login_user":"toyota","login_pass":"secret"}],"interval":30}}`
	postResp, err := client.Post(apiURL+"/api/local-config", "application/json", strings.NewReader(updateBody))
	if err != nil {
		t.Fatal(err)
	}
	if postResp.StatusCode != 200 {
		t.Fatalf("POST /api/local-config status = %d", postResp.StatusCode)
	}
	postResp.Body.Close()

	// Confirm file on disk updated
	saved, err := os.ReadFile(configPath)
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(string(saved), "192.168.1.100") || !strings.Contains(string(saved), `"interval": 30`) {
		t.Fatalf("saved config content mismatch: %s", string(saved))
	}

	// 3. POST /api/test-login
	testResp, err := client.Post(apiURL+"/api/test-login", "application/json", strings.NewReader(`{"factory_id":"KN","base_url":"http://127.0.0.1:8080","login_user":"u","login_pass":"p"}`))
	if err != nil {
		t.Fatal(err)
	}
	if testResp.StatusCode != 200 {
		t.Fatalf("POST /api/test-login status = %d", testResp.StatusCode)
	}
	testResp.Body.Close()

	// 4. POST /api/scrape-now
	scrapeResp, err := client.Post(apiURL+"/api/scrape-now", "application/json", strings.NewReader(`{"factory_id":"KN"}`))
	if err != nil {
		t.Fatal(err)
	}
	if scrapeResp.StatusCode != 200 {
		t.Fatalf("POST /api/scrape-now status = %d", scrapeResp.StatusCode)
	}
	scrapeResp.Body.Close()
}
