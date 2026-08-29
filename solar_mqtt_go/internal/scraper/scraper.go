package scraper

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"math"
	"net/http"
	"net/http/cookiejar"
	"net/url"
	"os"
	"strconv"
	"strings"
	"time"

	"golang.org/x/net/html"
)

// Summary 對應 Python fetch_summary() 回傳 dict。
// TotalMwh 由 service 層的完整性 guard 計算後填入。
type Summary struct {
	TotalPowerKw *float64 `json:"total_power_kw"`
	TodayMwh     *float64 `json:"today_mwh"`
	MonthMwh     *float64 `json:"month_mwh"`
	TotalMwh     *float64 `json:"total_mwh,omitempty"`
}

// Zone 對應 Python fetch_zones() 的每區 dict。
type Zone struct {
	ZoneID      int      `json:"zone_id"`
	Serial      string   `json:"serial"`
	Position    int      `json:"position"`
	Name        string   `json:"name"`
	PowerKw     *float64 `json:"power_kw"`
	TodayKwh    *float64 `json:"today_kwh"`
	MonthMwh    *float64 `json:"month_mwh"`
	TotalMwh    *float64 `json:"total_mwh"`
	CapacityKwp *float64 `json:"capacity_kwp"`
	TodayHours  *float64 `json:"today_hours"`
}

// FloatPtr 取值輔助。
func FloatPtr(v float64) *float64 { return &v }

// toFloatPtr 對應 Python _to_float：可轉數字回指標，否則 nil。
// JSON 數字 → float64；字串 → ParseFloat；bool → Python float(True/False)；其他 → nil。
func toFloatPtr(v any) *float64 {
	switch x := v.(type) {
	case nil:
		return nil
	case float64:
		return &x
	case string:
		f, err := strconv.ParseFloat(strings.TrimSpace(x), 64)
		if err != nil {
			return nil
		}
		return &f
	case bool:
		if x {
			f := 1.0
			return &f
		}
		f := 0.0
		return &f
	default:
		return nil
	}
}

// TodayHours 計算今日有效時數：kwh/kwp 四捨五入 2 位；kwp 缺失或不為正 → nil。
// 以 IEEE 格式化達成與 Python round(x, 2) 相同的 half-even 行為。
func TodayHours(todayKwh, capacityKwp float64) *float64 {
	if todayKwh == 0 && capacityKwp <= 0 {
		return nil
	}
	if capacityKwp <= 0 {
		return nil
	}
	s := strconv.FormatFloat(todayKwh/capacityKwp, 'f', 2, 64)
	f, err := strconv.ParseFloat(s, 64)
	if err != nil {
		return nil
	}
	return &f
}

// ── 穩定 zone id ──

func (s *Scraper) stableZoneID(serial string, fallbackIdx int) int {
	key := strings.TrimSpace(serial)
	if key == "" {
		key = fmt.Sprintf("__pos_%d", fallbackIdx)
	}
	if id, ok := s.zoneSerialMap[key]; ok {
		return id
	}
	id := s.nextZoneID
	s.zoneSerialMap[key] = id
	s.nextZoneID++
	return id
}

// ── Scraper ──

// Scraper 單廠擷取器：session + zone serial 映射。
type Scraper struct {
	FactoryID string
	BaseURL   string
	LoginUser string
	LoginPass string

	client *http.Client

	zoneSerialMap map[string]int
	nextZoneID    int
}

// New 建立未登入的 Scraper。
func New(factoryID, baseURL, loginUser, loginPass string) *Scraper {
	return &Scraper{
		FactoryID:     factoryID,
		BaseURL:       strings.TrimRight(baseURL, "/"),
		LoginUser:     loginUser,
		LoginPass:     loginPass,
		zoneSerialMap: map[string]int{},
		nextZoneID:    1,
	}
}

// LoggedIn 回傳是否已有可用 session。
func (s *Scraper) LoggedIn() bool { return s.client != nil }

// ResetSession 清掉現有 session，下一輪強制重新登入（抓取失敗後呼叫）。
func (s *Scraper) ResetSession() { s.client = nil }

// UpdateCredentials 更新登入資訊並強制下一輪重新登入（對應 Python /set 變更）。
func (s *Scraper) UpdateCredentials(baseURL, loginUser, loginPass string) {
	s.BaseURL = strings.TrimRight(baseURL, "/")
	s.LoginUser = loginUser
	s.LoginPass = loginPass
	s.client = nil
}

// setBrowserHeaders 對應 Python session headers。
func setBrowserHeaders(req *http.Request) {
	req.Header.Set("User-Agent",
		"Mozilla/5.0 (Windows NT 10.0; Win64; x64) "+
			"AppleWebKit/537.36 (KHTML, like Gecko) "+
			"Chrome/120.0 Safari/537.36")
	req.Header.Set("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8")
	req.Header.Set("Accept-Language", "zh-TW,zh;q=0.9,en;q=0.8")
}

// dumpDebug 寫出 debug_login_fail_{factory_id}.html（Python 相同格式）。
func (s *Scraper) dumpDebug(status int, finalURL, body string) {
	path := fmt.Sprintf("debug_login_fail_%s.html", s.FactoryID)
	var buf bytes.Buffer
	fmt.Fprintf(&buf, "<!-- status=%d url=%s -->\n", status, redactURL(finalURL))
	buf.WriteString(body)
	if err := os.WriteFile(path, buf.Bytes(), 0o644); err == nil {
		fmt.Printf("已寫出 %s\n", path)
	}
}

func redactURL(raw string) string {
	parsed, err := url.Parse(raw)
	if err != nil {
		return "<invalid URL>"
	}
	parsed.User = nil
	return parsed.String()
}

func redactErrorText(rawURL string, err error) string {
	if err == nil {
		return ""
	}
	return strings.ReplaceAll(err.Error(), rawURL, redactURL(rawURL))
}

func requestError(action, rawURL string, err error) error {
	return fmt.Errorf("%s（%s）: %s", action, redactURL(rawURL), redactErrorText(rawURL, err))
}

// readBody 讀取回應 body（上限 10MB 以防異常回應）。
func readBody(r *http.Response) (string, error) {
	defer r.Body.Close()
	data, err := io.ReadAll(io.LimitReader(r.Body, 10<<20))
	if err != nil {
		return "", err
	}
	return string(data), nil
}

// newSession 建立帶 cookie jar 的 client（10 秒 timeout，對應 Python timeout=10）。
func newSession() (*http.Client, error) {
	jar, err := cookiejar.New(nil)
	if err != nil {
		return nil, err
	}
	return &http.Client{
		Timeout: 10 * time.Second,
		Jar:     jar,
		CheckRedirect: func(req *http.Request, via []*http.Request) error {
			if len(via) >= 10 {
				return errors.New("too many redirects")
			}
			return nil
		},
	}, nil
}

// collectFormFields 解析登入頁：找第一個 form（無則整份文件），
// 收集 input 欄位；submit 型態僅保留 defbtn1；deftxt1/deftxt2 填入帳密。
func collectFormFields(body string, loginUser, loginPass string) []string {
	var fields []string
	seen := map[string]bool{}

	add := func(name, value string) {
		fields = append(fields, url.QueryEscape(name)+"="+url.QueryEscape(value))
		seen[name] = true
	}

	doc, err := html.Parse(strings.NewReader(body))
	if err != nil {
		// 無法解析 → 走「補齊三欄位」路徑
		add("deftxt1", loginUser)
		add("deftxt2", loginPass)
		add("defbtn1", "登入")
		return fields
	}

	var form *html.Node
	var findForm func(n *html.Node)
	findForm = func(n *html.Node) {
		if form != nil {
			return
		}
		if n.Type == html.ElementNode && n.Data == "form" {
			form = n
			return
		}
		for c := n.FirstChild; c != nil; c = c.NextSibling {
			findForm(c)
			if form != nil {
				return
			}
		}
	}
	findForm(doc)

	root := form
	if root == nil {
		root = doc
	}

	var walk func(n *html.Node)
	walk = func(n *html.Node) {
		if n.Type == html.ElementNode && n.Data == "input" {
			var name, itype, value string
			for _, a := range n.Attr {
				switch a.Key {
				case "name":
					name = a.Val
				case "type":
					itype = a.Val
				case "value":
					value = a.Val
				}
			}
			if name == "" {
				return
			}
			if itype == "" {
				itype = "text"
			}
			itype = strings.ToLower(itype)
			if itype == "submit" && name != "defbtn1" {
				return
			}
			switch name {
			case "deftxt1":
				value = loginUser
			case "deftxt2":
				value = loginPass
			}
			add(name, value)
		}
		for c := n.FirstChild; c != nil; c = c.NextSibling {
			walk(c)
		}
	}
	walk(root)

	if !seen["deftxt1"] {
		add("deftxt1", loginUser)
	}
	if !seen["deftxt2"] {
		add("deftxt2", loginPass)
	}
	if !seen["defbtn1"] {
		add("defbtn1", "登入")
	}
	return fields
}

// Login 登入 EZ-Solar 並建立 session（對應 Python login()）。
func (s *Scraper) Login() error {
	loginURL := s.BaseURL + "/default.aspx"
	fmt.Printf("[%s] 登入中... %s\n", s.FactoryID, redactURL(s.BaseURL))

	client, err := newSession()
	if err != nil {
		return err
	}

	// GET 登入頁
	req, err := http.NewRequest(http.MethodGet, loginURL, nil)
	if err != nil {
		return requestError("建立登入頁 request 失敗", loginURL, err)
	}
	setBrowserHeaders(req)
	resp, err := client.Do(req)
	if err != nil {
		return requestError("取得登入頁失敗", loginURL, err)
	}
	body, err := readBody(resp)
	if err != nil {
		return err
	}
	if resp.StatusCode >= 400 {
		return fmt.Errorf("取得登入頁失敗: status %d", resp.StatusCode)
	}

	fields := collectFormFields(body, s.LoginUser, s.LoginPass)
	formData := strings.Join(fields, "&")

	// POST 登入
	postReq, err := http.NewRequest(http.MethodPost, loginURL, strings.NewReader(formData))
	if err != nil {
		return requestError("建立登入 POST request 失敗", loginURL, err)
	}
	setBrowserHeaders(postReq)
	postReq.Header.Set("Referer", loginURL)
	postReq.Header.Set("Origin", s.BaseURL)
	postReq.Header.Set("Content-Type", "application/x-www-form-urlencoded; charset=UTF-8")

	postResp, err := client.Do(postReq)
	if err != nil {
		return requestError("登入 POST 失敗", loginURL, err)
	}
	postBody, err := readBody(postResp)
	if err != nil {
		return err
	}

	if postResp.StatusCode >= 400 {
		s.dumpDebug(postResp.StatusCode, redactURL(postResp.Request.URL.String()), postBody)
		return fmt.Errorf("[%s] 登入失敗: status %d", s.FactoryID, postResp.StatusCode)
	}

	if strings.Contains(postBody, `id="deftxt1"`) || strings.Contains(postBody, `name="deftxt1"`) {
		s.dumpDebug(postResp.StatusCode, redactURL(postResp.Request.URL.String()), postBody)
		return fmt.Errorf("[%s] 登入失敗：仍停留在登入頁", s.FactoryID)
	}

	fmt.Printf("[%s] 登入完成（最終 URL：%s）\n", s.FactoryID, redactURL(postResp.Request.URL.String()))
	s.client = client
	return nil
}

// apiPost 對應 Python _api_post：POST api/s_json.ashx 並要求回傳 JSON 陣列。
func (s *Scraper) apiPost(payloadID string) ([]any, error) {
	if s.client == nil {
		return nil, errors.New("尚未登入（session 不存在）")
	}
	apiURL := s.BaseURL + "/api/s_json.ashx"
	form := url.Values{}
	form.Set("id", payloadID)

	req, err := http.NewRequest(http.MethodPost, apiURL, strings.NewReader(form.Encode()))
	if err != nil {
		return nil, requestError("建立 API request 失敗", apiURL, err)
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	resp, err := s.client.Do(req)
	if err != nil {
		return nil, requestError("API 請求失敗", apiURL, err)
	}
	body, err := readBody(resp)
	if err != nil {
		return nil, err
	}
	if resp.StatusCode >= 400 {
		return nil, fmt.Errorf("API %s 失敗: status %d", payloadID, resp.StatusCode)
	}
	var data []any
	if err := json.Unmarshal([]byte(body), &data); err != nil {
		return nil, fmt.Errorf("API %s 回傳非 JSON 陣列: %v", payloadID, err)
	}
	return data, nil
}

// FetchSummary 對應 Python fetch_summary()。
func (s *Scraper) FetchSummary() (*Summary, error) {
	data, err := s.apiPost("00_00")
	if err != nil {
		return nil, err
	}
	sm := &Summary{}
	if len(data) == 0 {
		return sm, nil
	}
	d, ok := data[0].(map[string]any)
	if !ok {
		return sm, nil
	}
	sm.TotalPowerKw = toFloatPtr(d["x0"])
	sm.TodayMwh = toFloatPtr(d["x1"])
	sm.MonthMwh = toFloatPtr(d["x2"])
	return sm, nil
}

// strField 對應 Python str(d.get(k) or "").strip()：falsy（nil、0、false、""）
// → 空字串；其他純量 → str() 後 trim。
func strField(v any) string {
	switch x := v.(type) {
	case nil:
		return ""
	case string:
		if x == "" {
			return ""
		}
		return strings.TrimSpace(x)
	case float64:
		if x == 0 {
			return ""
		}
		return strings.TrimSpace(strconv.FormatFloat(x, 'f', -1, 64))
	case bool:
		if !x {
			return ""
		}
		return "True"
	default:
		return strings.TrimSpace(fmt.Sprint(v))
	}
}

// FetchZones 對應 Python fetch_zones()。
func (s *Scraper) FetchZones() ([]Zone, error) {
	data, err := s.apiPost("00_02")
	if err != nil {
		return nil, err
	}
	zones := make([]Zone, 0, len(data))
	for idx, item := range data {
		d, ok := item.(map[string]any)
		if !ok {
			continue
		}
		position := idx + 1
		serial := strField(d["x8"])
		name := strField(d["x0"])
		z := Zone{
			ZoneID:      s.stableZoneID(serial, position),
			Serial:      serial,
			Position:    position,
			Name:        strings.TrimSpace(name),
			PowerKw:     toFloatPtr(d["x4"]),
			TodayKwh:    toFloatPtr(d["x5"]),
			MonthMwh:    toFloatPtr(d["x6"]),
			TotalMwh:    toFloatPtr(d["x7"]),
			CapacityKwp: toFloatPtr(d["x12"]),
		}
		if z.TodayKwh != nil && z.CapacityKwp != nil && *z.CapacityKwp > 0 {
			z.TodayHours = TodayHours(*z.TodayKwh, *z.CapacityKwp)
		}
		zones = append(zones, z)
	}
	return zones, nil
}

// Fetch 一次性擷取（自動登入），對應 Python fetch()。
func (s *Scraper) Fetch() (*Summary, []Zone, error) {
	if s.client == nil {
		if err := s.Login(); err != nil {
			return nil, nil, err
		}
	}
	summary, err := s.FetchSummary()
	if err != nil {
		return nil, nil, err
	}
	zones, err := s.FetchZones()
	if err != nil {
		return nil, nil, err
	}
	return summary, zones, nil
}

// Round2 以 IEEE half-even 對齊 Python round(x, 2)。
func Round2(v float64) float64 {
	s := strconv.FormatFloat(v, 'f', 2, 64)
	f, err := strconv.ParseFloat(s, 64)
	if err != nil {
		return math.Round(v*100) / 100
	}
	return f
}
