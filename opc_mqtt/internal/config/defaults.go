package config

const (
	DefaultBroker          = "localhost"
	DefaultBrokerPort      = 1883
	DefaultMqttPrefix      = "opc"
	DefaultMqttQos         = byte(1)
	DefaultMqttRetain      = true
	DefaultPublishInterval = 30
	DefaultPublishRaw      = false
	DefaultPublishVirtual  = true
	DefaultDdeService      = "view"
	DefaultDdeTopic        = "tagname"
	DefaultDdeTimeoutMs    = 10000
	DefaultWebAddr         = "0.0.0.0"
	DefaultWebPort         = 8080
)

type defaultTagSpec struct {
	ID       string
	Desc     string
	Category string
}

var builtInTagSpecs = []defaultTagSpec{
	{
		ID:       "GCB_610_KWH",
		Desc:     "69kV 主控制盤 電量累積",
		Category: "總量",
	},
	{
		ID:   "TIE_VCB_KWH",
		Desc: "TIE-VCB 電量累積",
	},
	{
		ID:       "VCB_12_1_KWH",
		Desc:     "WG+WE變台-VCB#12 電量累積",
		Category: "車身",
	},
	{
		ID:   "VCB_12_2_KWH",
		Desc: "Line 1 電容器盤-VCB#12 電量累積",
	},
	{
		ID:       "VCB_13_KWH",
		Desc:     "WM變台-VCB #13 電量累積",
		Category: "車身",
	},
	{
		ID:       "VCB_14_1_KWH",
		Desc:     "瑞菁館變台-VCB#14 電量累積",
		Category: "事務",
	},
	{
		ID:   "VCB_14_2_KWH",
		Desc: "SPARE-VCB#14 電量累積",
	},
	{
		ID:       "VCB_15_KWH",
		Desc:     "PA+PB-變台 VCB #15 電量累積",
		Category: "沖壓",
	},
	{
		ID:       "VCB_16_KWH",
		Desc:     "WA+WB+WQ+WD-變台 VCB #16 電量累積",
		Category: "車身",
	},
	{
		ID:       "VCB_17_KWH",
		Desc:     "Line1 4.16kV主斷路器 VCB #17 電量累積",
		Category: "一製",
	},
	{
		ID:       "VCB_4_KWH",
		Desc:     "Line2 4.16kV主斷路器 VCB #17 電量累積",
		Category: "二製",
	},
	{
		ID:       "VCB_5_1_KWH",
		Desc:     "TA-變台 VCB #5 電量累積",
		Category: "塗裝",
	},
	{
		ID:       "VCB_5_2_KWH",
		Desc:     "原動力變台 VCB #5 電量累積",
		Category: "原動力",
	},
	{
		ID:       "VCB_6_KWH",
		Desc:     "TB-變台 VCB #6 電量累積",
		Category: "塗裝",
	},
	{
		ID:       "VCB_7_1_KWH",
		Desc:     "事務棟變台 VCB #7 電量累積",
		Category: "事務",
	},
	{
		ID:       "VCB_7_2_KWH",
		Desc:     "AA-變台 VCB #7 電量累積",
		Category: "裝配",
	},
	{
		ID:   "VCB_8_1_KWH",
		Desc: "SPARE VCB #8 電量累積",
	},
	{
		ID:       "VCB_8_2_KWH",
		Desc:     "KRDC變台 VCB #8 電量累積",
		Category: "KRDC",
	},
	{
		ID:       "VCB_9_1_KWH",
		Desc:     "TC變台 VCB #9 電量累積",
		Category: "塗裝",
	},
	{
		ID:   "VCB_9_2_KWH",
		Desc: "Line 2 電容器盤-VCB#9 電量累積",
	},
}

func defaultTags() []TagConfig {
	tags := make([]TagConfig, 0, len(builtInTagSpecs))
	for _, spec := range builtInTagSpecs {
		tags = append(tags, TagConfig{
			ID:       spec.ID,
			DdeItem:  spec.ID,
			Desc:     spec.Desc,
			Unit:     "KWH",
			Decimals: 1,
			Enabled:  true,
		})
	}
	return tags
}

func defaultVirtualTags() []VirtualTag {
	virtualTags := make([]VirtualTag, 0, len(builtInTagSpecs))
	seen := make(map[string]struct{}, len(builtInTagSpecs))
	for _, spec := range builtInTagSpecs {
		if spec.Category == "" {
			continue
		}
		if _, ok := seen[spec.Category]; ok {
			continue
		}
		seen[spec.Category] = struct{}{}

		formula := make([]FormulaItem, 0, 4)
		for _, member := range builtInTagSpecs {
			if member.Category != spec.Category {
				continue
			}
			formula = append(formula, FormulaItem{Tag: member.ID, Op: "+"})
		}

		virtualTags = append(virtualTags, VirtualTag{
			Name:     spec.Category,
			Unit:     "KWH",
			Decimals: 1,
			Enabled:  true,
			Formula:  formula,
		})
	}
	return virtualTags
}
