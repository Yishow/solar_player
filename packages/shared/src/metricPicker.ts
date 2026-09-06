export type MetricPickerOption = {
  compatible: boolean;
  coverage?: string | null;
  incompatibleReason?: string;
  labelZh: string;
  latestValue?: string | null;
  measurementKind?: string | null;
  metricKey: string;
  scope: string;
  unit?: string | null;
};

export function buildMetricPickerOptions(input: {
  catalogPending?: boolean;
  options: Array<Omit<MetricPickerOption, "compatible" | "incompatibleReason"> & {
    compatible?: boolean;
    incompatibleReason?: string;
    missingBaseline?: boolean;
  }>;
}): MetricPickerOption[] {
  return input.options.map((option) => {
    if (input.catalogPending) {
      return {
        ...option,
        compatible: false,
        incompatibleReason: "來源尚未進入可用目錄，不能當成已儲存綁定。"
      };
    }
    if (option.missingBaseline) {
      return {
        ...option,
        compatible: option.compatible ?? true,
        coverage: option.coverage ?? "缺少期初基準",
        incompatibleReason: option.incompatibleReason ?? "尚無月界線證據，暫不把暫存器讀值當成月用量。"
      };
    }
    return {
      ...option,
      compatible: option.compatible ?? true
    };
  });
}
