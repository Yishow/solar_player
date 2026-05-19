export function resolveRuntimeFallbackBannerState(input: {
  configErrorMessage: string;
  runtimeErrorMessage: string;
  usesRuntimeFallback: boolean;
}) {
  if (input.configErrorMessage) {
    return {
      errorMessage: input.configErrorMessage,
      headline: "展示頁設定載入失敗，暫時使用 seed fallback。"
    };
  }

  if (input.runtimeErrorMessage && input.usesRuntimeFallback) {
    return {
      errorMessage: input.runtimeErrorMessage,
      headline: "展示資料同步失敗，暫時保留上一份 fallback-safe 內容。"
    };
  }

  return {
    errorMessage: "",
    headline: ""
  };
}

export function RuntimeConfigFallbackBanner({
  errorMessage,
  headline
}: {
  errorMessage: string;
  headline?: string;
}) {
  if (!errorMessage) {
    return null;
  }

  return (
    <div
      role="status"
      style={{
        position: "absolute",
        left: "88px",
        top: "24px",
        zIndex: 24,
        maxWidth: "620px",
        border: "1px solid rgba(180,82,52,0.25)",
        borderRadius: "18px",
        background: "rgba(255,245,241,0.96)",
        color: "#8f452d",
        boxShadow: "0 12px 30px rgba(143,69,45,0.08)",
        padding: "12px 16px",
        fontSize: "15px",
        lineHeight: 1.55
      }}
    >
      <strong style={{ display: "block", fontSize: "14px", marginBottom: "4px" }}>
        {headline || "展示頁設定載入失敗，暫時使用 seed fallback。"}
      </strong>
      <span>{errorMessage}</span>
    </div>
  );
}
