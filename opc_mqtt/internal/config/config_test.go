package config_test

import (
	"os"
	"path/filepath"
	"strings"
	"testing"

	"opc_mqtt/internal/config"
)

func writeTmp(t *testing.T, content string) string {
	t.Helper()
	f, err := os.CreateTemp(t.TempDir(), "cfg*.json")
	if err != nil {
		t.Fatal(err)
	}
	f.WriteString(content)
	f.Close()
	return f.Name()
}

func TestLoadDefaults(t *testing.T) {
	path := writeTmp(t, `{}`)
	cfg, err := config.Load(path)
	if err != nil {
		t.Fatalf("Load error: %v", err)
	}
	snap := cfg.Get()
	if snap.Broker != config.DefaultBroker {
		t.Errorf("broker=%q want %q", snap.Broker, config.DefaultBroker)
	}
	if snap.BrokerPort != config.DefaultBrokerPort {
		t.Errorf("port=%d want %d", snap.BrokerPort, config.DefaultBrokerPort)
	}
	if snap.PublishInterval != config.DefaultPublishInterval {
		t.Errorf("interval=%d want %d", snap.PublishInterval, config.DefaultPublishInterval)
	}
	if snap.DdeService != "view" || snap.DdeTopic != "tagname" {
		t.Fatalf("DDE defaults=%q/%q want view/tagname", snap.DdeService, snap.DdeTopic)
	}
	if len(snap.Tags) != 20 {
		t.Fatalf("tags len=%d want 20", len(snap.Tags))
	}
	if snap.Tags[0].ID != "GCB_610_KWH" {
		t.Fatalf("tag[0].id=%q want GCB_610_KWH", snap.Tags[0].ID)
	}
	if snap.Tags[0].DdeItem != "GCB_610_KWH" {
		t.Fatalf("tag[0].dde_item=%q want GCB_610_KWH", snap.Tags[0].DdeItem)
	}
	if snap.Tags[len(snap.Tags)-1].ID != "VCB_9_2_KWH" {
		t.Fatalf("last tag id=%q want VCB_9_2_KWH", snap.Tags[len(snap.Tags)-1].ID)
	}
	if len(snap.VirtualTags) != 10 {
		t.Fatalf("virtual_tags len=%d want 10", len(snap.VirtualTags))
	}
	if snap.VirtualTags[0].Name != "總量" {
		t.Fatalf("virtual[0].name=%q want 總量", snap.VirtualTags[0].Name)
	}
}

func TestLegacyOpcAddressMigratesToDDEItemID(t *testing.T) {
	path := writeTmp(t, `{
		"tags":[{"id":"GCB_610_KWH","opc_address":"intouch.GP.GCB_610_KWH","enabled":true}]
	}`)
	cfg, err := config.Load(path)
	if err != nil {
		t.Fatalf("Load error: %v", err)
	}
	if got := cfg.Get().Tags[0].DdeItem; got != "GCB_610_KWH" {
		t.Fatalf("dde_item=%q want GCB_610_KWH", got)
	}
	if err := cfg.Save(); err != nil {
		t.Fatalf("Save error: %v", err)
	}
	saved, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("ReadFile error: %v", err)
	}
	text := string(saved)
	if strings.Contains(text, "opc_address") || !strings.Contains(text, `"dde_item": "GCB_610_KWH"`) {
		t.Fatalf("saved config was not migrated to DDE format: %s", text)
	}
}

func TestLoadAndSave(t *testing.T) {
	path := writeTmp(t, `{"broker":"192.168.1.5","broker_port":1883}`)
	cfg, err := config.Load(path)
	if err != nil {
		t.Fatalf("Load error: %v", err)
	}
	snap := cfg.Get()
	if snap.Broker != "192.168.1.5" {
		t.Errorf("broker=%q want 192.168.1.5", snap.Broker)
	}
	snap.Broker = "10.0.0.1"
	cfg.Replace(snap)
	if err := cfg.Save(); err != nil {
		t.Fatalf("Save error: %v", err)
	}
	cfg2, _ := config.Load(path)
	if cfg2.Get().Broker != "10.0.0.1" {
		t.Errorf("after save broker=%q want 10.0.0.1", cfg2.Get().Broker)
	}
}

func TestApplyCLI(t *testing.T) {
	path := writeTmp(t, `{}`)
	cfg, _ := config.Load(path)
	cfg.ApplyCLI("10.1.1.1", "9999", "60", "9090")
	snap := cfg.Get()
	if snap.Broker != "10.1.1.1" {
		t.Errorf("broker=%q want 10.1.1.1", snap.Broker)
	}
	if snap.BrokerPort != 9999 {
		t.Errorf("port=%d want 9999", snap.BrokerPort)
	}
	if snap.PublishInterval != 60 {
		t.Errorf("interval=%d want 60", snap.PublishInterval)
	}
	if snap.WebPort != 9090 {
		t.Errorf("web_port=%d want 9090", snap.WebPort)
	}
}

func TestMissingFileUsesDefaults(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "opc_config.json")
	cfg, err := config.Load(path) // 檔案不存在，應回傳預設值
	if err != nil {
		t.Fatalf("Load missing file error: %v", err)
	}
	if cfg.Get().Broker != config.DefaultBroker {
		t.Error("should use defaults when file missing")
	}
	if len(cfg.Get().Tags) != 20 {
		t.Fatalf("missing-file default tags len=%d want 20", len(cfg.Get().Tags))
	}
	if len(cfg.Get().VirtualTags) != 10 {
		t.Fatalf("missing-file default virtual tags len=%d want 10", len(cfg.Get().VirtualTags))
	}
}

func TestExplicitEmptyTagListsOverrideBuiltIns(t *testing.T) {
	path := writeTmp(t, `{"tags":[],"virtual_tags":[]}`)
	cfg, err := config.Load(path)
	if err != nil {
		t.Fatalf("Load error: %v", err)
	}

	snap := cfg.Get()
	if len(snap.Tags) != 0 {
		t.Fatalf("tags len=%d want 0", len(snap.Tags))
	}
	if len(snap.VirtualTags) != 0 {
		t.Fatalf("virtual_tags len=%d want 0", len(snap.VirtualTags))
	}
}

func TestBuiltInVirtualTagsReferenceBuiltInRawTags(t *testing.T) {
	path := writeTmp(t, `{}`)
	cfg, err := config.Load(path)
	if err != nil {
		t.Fatalf("Load error: %v", err)
	}

	snap := cfg.Get()
	tagIDs := make(map[string]struct{}, len(snap.Tags))
	for _, tag := range snap.Tags {
		tagIDs[tag.ID] = struct{}{}
	}

	for _, virtualTag := range snap.VirtualTags {
		for _, item := range virtualTag.Formula {
			if _, ok := tagIDs[item.Tag]; !ok {
				t.Fatalf("virtual tag %q references missing raw tag %q", virtualTag.Name, item.Tag)
			}
		}
	}
}

func TestBuiltInVirtualTagsFollowProvidedCategoryGrouping(t *testing.T) {
	path := writeTmp(t, `{}`)
	cfg, err := config.Load(path)
	if err != nil {
		t.Fatalf("Load error: %v", err)
	}

	snap := cfg.Get()
	byName := make(map[string]config.VirtualTag, len(snap.VirtualTags))
	for _, virtualTag := range snap.VirtualTags {
		byName[virtualTag.Name] = virtualTag
	}

	expected := map[string][]string{
		"總量":   {"GCB_610_KWH"},
		"車身":   {"VCB_12_1_KWH", "VCB_13_KWH", "VCB_16_KWH"},
		"事務":   {"VCB_14_1_KWH", "VCB_7_1_KWH"},
		"沖壓":   {"VCB_15_KWH"},
		"一製":   {"VCB_17_KWH"},
		"二製":   {"VCB_4_KWH"},
		"塗裝":   {"VCB_5_1_KWH", "VCB_6_KWH", "VCB_9_1_KWH"},
		"原動力":  {"VCB_5_2_KWH"},
		"裝配":   {"VCB_7_2_KWH"},
		"KRDC": {"VCB_8_2_KWH"},
	}

	for name, wantTags := range expected {
		virtualTag, ok := byName[name]
		if !ok {
			t.Fatalf("missing built-in virtual tag %q", name)
		}
		if len(virtualTag.Formula) != len(wantTags) {
			t.Fatalf("virtual tag %q formula len=%d want %d", name, len(virtualTag.Formula), len(wantTags))
		}
		for i, wantTag := range wantTags {
			if virtualTag.Formula[i].Tag != wantTag {
				t.Fatalf("virtual tag %q formula[%d].tag=%q want %q", name, i, virtualTag.Formula[i].Tag, wantTag)
			}
			if virtualTag.Formula[i].Op != "+" {
				t.Fatalf("virtual tag %q formula[%d].op=%q want +", name, i, virtualTag.Formula[i].Op)
			}
		}
	}
}

func TestReplacePreservesPath(t *testing.T) {
	path := writeTmp(t, `{"broker":"oldhost"}`)
	cfg, _ := config.Load(path)
	snap := cfg.Get()
	snap.Broker = "newhost"
	cfg.Replace(snap)
	// Save 應寫到原始路徑
	if err := cfg.Save(); err != nil {
		t.Fatalf("Save error: %v", err)
	}
	cfg2, _ := config.Load(path)
	if cfg2.Get().Broker != "newhost" {
		t.Errorf("got %q want newhost", cfg2.Get().Broker)
	}
}

func TestGetReturnsIndependentNestedSlices(t *testing.T) {
	path := writeTmp(t, `{
		"tags":[{"id":"RAW_A","opc_address":"intouch.GP.RAW_A","desc":"Raw A","unit":"KWH","decimals":1,"enabled":true}],
		"virtual_tags":[{"name":"V_A","unit":"KWH","decimals":1,"enabled":true,"formula":[{"tag":"RAW_A","op":"+"}]}]
	}`)

	cfg, err := config.Load(path)
	if err != nil {
		t.Fatalf("Load error: %v", err)
	}

	snap := cfg.Get()
	snap.Tags[0].ID = "MUTATED_TAG"
	snap.VirtualTags[0].Name = "MUTATED_VIRTUAL"
	snap.VirtualTags[0].Formula[0].Tag = "MUTATED_FORMULA_TAG"

	next := cfg.Get()
	if next.Tags[0].ID != "RAW_A" {
		t.Fatalf("tag id mutated to %q want RAW_A", next.Tags[0].ID)
	}
	if next.VirtualTags[0].Name != "V_A" {
		t.Fatalf("virtual name mutated to %q want V_A", next.VirtualTags[0].Name)
	}
	if next.VirtualTags[0].Formula[0].Tag != "RAW_A" {
		t.Fatalf("formula tag mutated to %q want RAW_A", next.VirtualTags[0].Formula[0].Tag)
	}
}
