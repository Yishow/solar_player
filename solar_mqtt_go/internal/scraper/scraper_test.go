package scraper

import (
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"reflect"
	"strings"
	"testing"
)

const loginPage = `<html><body><form action="/default.aspx" method="post">
<input type="hidden" name="__VIEWSTATE" value="vs1"/>
<input type="text" name="deftxt1" value=""/>
<input type="password" name="deftxt2" value=""/>
<input type="submit" name="defbtn1" value="登入"/>
<input type="submit" name="otherbtn" value="Other"/>
</form></body></html>`

const landingPage = `<html><body><h1>歡迎</h1></body></html>`

type fakeServer struct {
	t               *testing.T
	srv             *httptest.Server
	loginPOSTs      int
	loginGETs       int
	lastPOSTForm    map[string]string
	lastPOSTCookie  string
	lastAPIID       string
	apiIDs          []string
	apiCalls        int
	lastAPICookie   string
	lastAPIURL      string
	lastPOSTURL     string
	lastReferer     string
	lastOrigin      string
	lastContentType string
	lastUA          string
	// 登入 POST 回應是否仍為登入頁（模擬登入失敗）
	failLogin   bool
	postStatus  int
	getStatus   int
	summaryJSON string
	zonesJSON   string
}

func newFakeServer(t *testing.T) *fakeServer {
	f := &fakeServer{t: t, postStatus: 200, getStatus: 200}
	mux := http.NewServeMux()
	mux.HandleFunc("/default.aspx", f.handleLogin)
	mux.HandleFunc("/api/s_json.ashx", f.handleAPI)
	f.srv = httptest.NewServer(mux)
	t.Cleanup(f.srv.Close)
	return f
}

func (f *fakeServer) handleLogin(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		f.loginGETs++
		f.lastUA = r.Header.Get("User-Agent")
		http.SetCookie(w, &http.Cookie{Name: "sid", Value: "abc123"})
		w.WriteHeader(f.getStatus)
		_, _ = w.Write([]byte(loginPage))
	case http.MethodPost:
		f.loginPOSTs++
		_ = r.ParseForm()
		f.lastPOSTForm = map[string]string{}
		for k := range r.PostForm {
			f.lastPOSTForm[k] = r.PostForm.Get(k)
		}
		f.lastPOSTURL = r.URL.String()
		f.lastReferer = r.Header.Get("Referer")
		f.lastOrigin = r.Header.Get("Origin")
		f.lastContentType = r.Header.Get("Content-Type")
		if ck, err := r.Cookie("sid"); err == nil {
			f.lastPOSTCookie = ck.Value
		}
		if f.postStatus >= 400 {
			w.WriteHeader(f.postStatus)
			_, _ = w.Write([]byte("server error"))
			return
		}
		if f.failLogin {
			_, _ = w.Write([]byte(loginPage))
			return
		}
		_, _ = w.Write([]byte(landingPage))
	}
}

func (f *fakeServer) handleAPI(w http.ResponseWriter, r *http.Request) {
	f.apiCalls++
	_ = r.ParseForm()
	f.lastAPIID = r.PostForm.Get("id")
	f.apiIDs = append(f.apiIDs, f.lastAPIID)
	f.lastAPIURL = r.URL.String()
	if ck, err := r.Cookie("sid"); err == nil {
		f.lastAPICookie = ck.Value
	}
	switch f.lastAPIID {
	case "00_00":
		_, _ = w.Write([]byte(f.summaryJSON))
	case "00_02":
		_, _ = w.Write([]byte(f.zonesJSON))
	default:
		w.WriteHeader(http.StatusBadRequest)
	}
}

func newTestScraper(f *fakeServer) *Scraper {
	return New("KN", f.srv.URL, "toyota", "toyota")
}

func TestScraperLoginForm(t *testing.T) {
	f := newFakeServer(t)
	s := newTestScraper(f)
	if err := s.Login(); err != nil {
		t.Fatalf("login: %v", err)
	}

	if f.loginGETs != 1 || f.loginPOSTs != 1 {
		t.Fatalf("GET=%d POST=%d, want 1/1", f.loginGETs, f.loginPOSTs)
	}
	// 表單欄位：隱藏欄位保留、帳密填入、submit 僅保留 defbtn1
	want := map[string]string{
		"__VIEWSTATE": "vs1",
		"deftxt1":     "toyota",
		"deftxt2":     "toyota",
		"defbtn1":     "登入",
	}
	if !reflect.DeepEqual(f.lastPOSTForm, want) {
		t.Errorf("posted form = %v, want %v", f.lastPOSTForm, want)
	}
	// headers
	if f.lastReferer != f.srv.URL+"/default.aspx" {
		t.Errorf("Referer = %s", f.lastReferer)
	}
	if f.lastOrigin != f.srv.URL {
		t.Errorf("Origin = %s", f.lastOrigin)
	}
	if !strings.Contains(f.lastContentType, "application/x-www-form-urlencoded") {
		t.Errorf("Content-Type = %s", f.lastContentType)
	}
	if !strings.Contains(f.lastUA, "Mozilla/5.0") {
		t.Errorf("User-Agent = %s", f.lastUA)
	}
	// cookie session 延續到 POST
	if f.lastPOSTCookie != "abc123" {
		t.Errorf("login POST cookie = %q, want abc123", f.lastPOSTCookie)
	}
	// 路徑
	if f.lastPOSTURL != "/default.aspx" {
		t.Errorf("login POST path = %s", f.lastPOSTURL)
	}
}

func TestScraperLoginFormAddsMissingFields(t *testing.T) {
	// 登入頁完全沒有表單欄位 → 仍必須補 deftxt1/deftxt2/defbtn1
	emptyPage := `<html><body><form method="post"></form></body></html>`
	f := newFakeServer(t)
	f.srv.Config.Handler = http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodGet {
			http.SetCookie(w, &http.Cookie{Name: "sid", Value: "x"})
			_, _ = w.Write([]byte(emptyPage))
			return
		}
		f.handleLogin(w, r)
	})
	s := newTestScraper(f)
	if err := s.Login(); err != nil {
		t.Fatalf("login: %v", err)
	}
	want := map[string]string{"deftxt1": "toyota", "deftxt2": "toyota", "defbtn1": "登入"}
	if !reflect.DeepEqual(f.lastPOSTForm, want) {
		t.Errorf("posted form = %v, want %v", f.lastPOSTForm, want)
	}
}

func TestFetchSummaryMapping(t *testing.T) {
	f := newFakeServer(t)
	f.summaryJSON = `[{"x0":"12.3","x1":"1.25","x2":7.5}]`
	f.zonesJSON = `[]`
	s := newTestScraper(f)
	summary, _, err := s.Fetch()
	if err != nil {
		t.Fatal(err)
	}
	if summary.TotalPowerKw == nil || *summary.TotalPowerKw != 12.3 {
		t.Errorf("total_power_kw = %v", summary.TotalPowerKw)
	}
	if summary.TodayMwh == nil || *summary.TodayMwh != 1.25 {
		t.Errorf("today_mwh = %v", summary.TodayMwh)
	}
	if summary.MonthMwh == nil || *summary.MonthMwh != 7.5 {
		t.Errorf("month_mwh = %v", summary.MonthMwh)
	}
	if f.lastAPIURL != "/api/s_json.ashx" {
		t.Errorf("api url = %s", f.lastAPIURL)
	}
	if len(f.apiIDs) != 2 || f.apiIDs[0] != "00_00" || f.apiIDs[1] != "00_02" {
		t.Errorf("api call order = %v, want [00_00 00_02]", f.apiIDs)
	}
	// API 呼叫需帶 session cookie
	if f.lastAPICookie != "abc123" {
		t.Errorf("api cookie = %q", f.lastAPICookie)
	}
}

func TestFetchSummaryNullsAndEmpty(t *testing.T) {
	f := newFakeServer(t)
	f.summaryJSON = `[]`
	f.zonesJSON = `[]`
	s := newTestScraper(f)
	summary, _, err := s.Fetch()
	if err != nil {
		t.Fatal(err)
	}
	if summary.TotalPowerKw != nil || summary.TodayMwh != nil || summary.MonthMwh != nil {
		t.Errorf("empty summary should be all nil: %+v", summary)
	}

	f2 := newFakeServer(t)
	f2.summaryJSON = `[{"x0":null,"x1":"bad","x2":"3"}]`
	f2.zonesJSON = `[]`
	s2 := newTestScraper(f2)
	summary2, _, err := s2.Fetch()
	if err != nil {
		t.Fatal(err)
	}
	if summary2.TotalPowerKw != nil {
		t.Errorf("null x0 should be nil, got %v", *summary2.TotalPowerKw)
	}
	if summary2.TodayMwh != nil {
		t.Errorf("non-numeric x1 should be nil, got %v", *summary2.TodayMwh)
	}
	if summary2.MonthMwh == nil || *summary2.MonthMwh != 3 {
		t.Errorf("x2 = %v", summary2.MonthMwh)
	}
}

func TestFetchZonesStableID(t *testing.T) {
	f := newFakeServer(t)
	f.summaryJSON = `[{"x0":"1"}]`
	f.zonesJSON = `[
		{"x0":" 區A ","x4":"10.5","x5":"20","x6":"1.1","x7":"99.9","x8":"SN-A","x12":"50"},
		{"x0":"區B","x4":"5","x5":"8.4","x6":"0.5","x7":"40","x8":"SN-B","x12":"40"},
		{"x0":"區C","x4":"0","x5":"1","x6":"0.1","x7":"5","x8":"","x12":"0"}
	]`
	s := New("KN", f.srv.URL, "u", "p")
	if err := s.Login(); err != nil {
		t.Fatal(err)
	}
	zones, err := s.FetchZones()
	if err != nil {
		t.Fatal(err)
	}
	if len(zones) != 3 {
		t.Fatalf("zones = %d", len(zones))
	}
	// 欄位映射
	z1 := zones[0]
	if z1.ZoneID != 1 || z1.Serial != "SN-A" || z1.Position != 1 || z1.Name != "區A" {
		t.Errorf("zone1 = %+v", z1)
	}
	if z1.PowerKw == nil || *z1.PowerKw != 10.5 {
		t.Errorf("zone1 power_kw = %v", z1.PowerKw)
	}
	if z1.TodayHours == nil || *z1.TodayHours != 0.4 { // 20/50 = 0.4
		t.Errorf("zone1 today_hours = %v", z1.TodayHours)
	}
	// 空 serial → 位置 fallback
	if zones[2].Serial != "" || zones[2].ZoneID != 3 {
		t.Errorf("zone3 = %+v", zones[2])
	}

	// 下一輪順序改變 → serial 對應的 zone_id 不變
	f.zonesJSON = `[
		{"x0":"區B","x4":"5","x5":"8.4","x6":"0.5","x7":"40","x8":"SN-B","x12":"40"},
		{"x0":" 區A ","x4":"10.5","x5":"20","x6":"1.1","x7":"99.9","x8":"SN-A","x12":"50"}
	]`
	zones2, err := s.FetchZones()
	if err != nil {
		t.Fatal(err)
	}
	if zones2[0].ZoneID != 2 || zones2[1].ZoneID != 1 {
		t.Errorf("reordered ids = %d,%d want 2,1", zones2[0].ZoneID, zones2[1].ZoneID)
	}
}

func TestTodayHours(t *testing.T) {
	cases := []struct {
		kwh, kwp float64
		want     *float64
	}{
		{20, 50, ptr(0.4)},
		{1, 3, ptr(0.33)}, // round(0.3333,2)
		{5, 0, nil},       // kwp=0 → nil
		{5, -1, nil},      // kwp<0 → nil
	}
	for i, tc := range cases {
		got := TodayHours(tc.kwh, tc.kwp)
		if tc.want == nil {
			if got != nil {
				t.Errorf("case %d: got %v want nil", i, *got)
			}
			continue
		}
		if got == nil || *got != *tc.want {
			t.Errorf("case %d: got %v want %v", i, got, tc.want)
		}
	}
}

func TestCredentialUpdateForcesRelogin(t *testing.T) {
	f := newFakeServer(t)
	s := New("KN", f.srv.URL, "toyota", "toyota")
	if err := s.Login(); err != nil {
		t.Fatal(err)
	}
	if f.loginPOSTs != 1 {
		t.Fatalf("logins = %d", f.loginPOSTs)
	}
	s.UpdateCredentials(f.srv.URL, "user2", "pass2")
	// 已登入的 session 被清掉 → API 呼叫前需重新登入且用新帳密
	if s.LoggedIn() {
		t.Error("session should be cleared after UpdateCredentials")
	}
	f.summaryJSON = `[]`
	f.zonesJSON = `[]`
	if _, _, err := s.Fetch(); err != nil {
		t.Fatal(err)
	}
	if f.loginPOSTs != 2 {
		t.Errorf("logins = %d, want 2 (re-login after credential change)", f.loginPOSTs)
	}
	if f.lastPOSTForm["deftxt1"] != "user2" || f.lastPOSTForm["deftxt2"] != "pass2" {
		t.Errorf("new credentials not used: %v", f.lastPOSTForm)
	}
}

func TestLoginPostFailureDumpsDebug(t *testing.T) {
	dir := t.TempDir()
	oldWd, _ := os.Getwd()
	if err := os.Chdir(dir); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = os.Chdir(oldWd) })

	f := newFakeServer(t)
	f.postStatus = 500
	s := newTestScraper(f)
	err := s.Login()
	if err == nil {
		t.Fatal("expected error on 500")
	}
	data, rerr := os.ReadFile(filepath.Join(dir, "debug_login_fail_KN.html"))
	if rerr != nil {
		t.Fatalf("debug dump missing: %v", rerr)
	}
	if !strings.Contains(string(data), "<!-- status=500") {
		t.Errorf("dump missing status comment: %s", string(data)[:50])
	}
}

func TestLoginRedactsURLUserinfoFromLogsAndErrors(t *testing.T) {
	dir := t.TempDir()
	oldWd, _ := os.Getwd()
	if err := os.Chdir(dir); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = os.Chdir(oldWd) })

	f := newFakeServer(t)
	f.postStatus = http.StatusInternalServerError
	baseURL := "http://collector-user:collector-pass@" + strings.TrimPrefix(f.srv.URL, "http://")
	s := New("KN", baseURL, "login-user", "login-pass")

	originalStdout := os.Stdout
	r, w, err := os.Pipe()
	if err != nil {
		t.Fatal(err)
	}
	os.Stdout = w
	loginErr := s.Login()
	_ = w.Close()
	os.Stdout = originalStdout
	output, err := io.ReadAll(r)
	_ = r.Close()
	if err != nil {
		t.Fatal(err)
	}
	if loginErr == nil {
		t.Fatal("expected login failure")
	}

	dump, err := os.ReadFile(filepath.Join(dir, "debug_login_fail_KN.html"))
	if err != nil {
		t.Fatal(err)
	}
	combined := string(output) + "\n" + loginErr.Error() + "\n" + string(dump)
	for _, secret := range []string{"collector-user", "collector-pass", "login-user", "login-pass"} {
		if strings.Contains(combined, secret) {
			t.Errorf("credential %q leaked in log/error: %s", secret, combined)
		}
	}
	if !strings.Contains(combined, "/default.aspx") || !strings.Contains(combined, "127.0.0.1:") {
		t.Errorf("redacted diagnostic lost host/path: %s", combined)
	}
	for _, secret := range []string{"collector-user", "collector-pass"} {
		if strings.Contains(string(dump), secret) {
			t.Errorf("credential %q leaked in debug URL: %s", secret, dump)
		}
	}
}

func TestLoginStillOnLoginPageDumpsDebug(t *testing.T) {
	dir := t.TempDir()
	oldWd, _ := os.Getwd()
	if err := os.Chdir(dir); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = os.Chdir(oldWd) })

	f := newFakeServer(t)
	f.failLogin = true
	s := newTestScraper(f)
	if err := s.Login(); err == nil {
		t.Fatal("expected error when still on login page")
	}
	if _, rerr := os.Stat(filepath.Join(dir, "debug_login_fail_KN.html")); rerr != nil {
		t.Fatalf("debug dump missing: %v", rerr)
	}
}

func TestLoginGetFailureDoesNotRequireDump(t *testing.T) {
	dir := t.TempDir()
	oldWd, _ := os.Getwd()
	if err := os.Chdir(dir); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = os.Chdir(oldWd) })

	f := newFakeServer(t)
	url := f.srv.URL
	f.srv.Close() // GET 必然失敗

	s := New("KN", url, "u", "p")
	err := s.Login()
	if err == nil {
		t.Fatal("expected error when GET fails")
	}
	entries, _ := os.ReadDir(dir)
	for _, e := range entries {
		if strings.HasPrefix(e.Name(), "debug_login_fail") {
			t.Errorf("GET failure must not dump debug file, found %s", e.Name())
		}
	}
}

func TestAPIRequiresLogin(t *testing.T) {
	f := newFakeServer(t)
	s := newTestScraper(f)
	if _, err := s.FetchZones(); err == nil {
		t.Fatal("expected error when calling API without login")
	}
	if f.apiCalls != 0 {
		t.Errorf("api should not be called, calls=%d", f.apiCalls)
	}
}

func TestAPINonArrayRejected(t *testing.T) {
	f := newFakeServer(t)
	f.summaryJSON = `{"not":"array"}`
	f.zonesJSON = `[]`
	s := newTestScraper(f)
	if _, _, err := s.Fetch(); err == nil {
		t.Fatal("expected error for non-array API response")
	}
}

// ── helpers ──

func ptr(v float64) *float64 { return &v }
