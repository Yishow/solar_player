export const NUMERIC_FIELDS = new Set([
  "interval",
  "night_padding_min",
  "anomaly_daytime_zero_minutes",
  "heartbeat_interval",
]);

export const remoteSetFields = new Set([
  "interval",
  "night_pause",
  "night_padding_min",
  "anomaly_daytime_zero_minutes",
  "heartbeat_interval",
  "mqtt_retain_summary",
  "mqtt_retain_zone",
  "mqtt_retain_status",
  "mqtt_retain_alert",
  "mqtt_retain_heartbeat",
]);

export function newPendingRequest(factoryId, command) {
  return {
    requestId: `req-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    issuedAt: new Date().toISOString(),
    ttlSeconds: 15,
    factoryId,
    command,
  };
}

export function controlEnvelope(pending, changes) {
  const envelope = {
    requestId: pending.requestId,
    issuedAt: pending.issuedAt,
    ttlSeconds: pending.ttlSeconds,
    site: pending.factoryId,
  };
  if (pending.command === "set") envelope.changes = changes || {};
  return JSON.stringify(envelope);
}

function boundedResultSummary(result) {
  const detail = result.summary || result.code || "未知結果";
  return String(detail).slice(0, 120);
}

function setStatus(elements, text, mode = "idle") {
  elements.configStatus.textContent = text;
  elements.configStatus.dataset.mode = mode;
}

function fieldValue(element, value) {
  if (element.type === "checkbox") return Boolean(value);
  return value === undefined || value === null ? "" : value;
}

export function createConfigView({ elements, getClient, getPrefix, onPendingChange }) {
  const latestStateByFactory = new Map();
  const pending = { value: null };
  let mode = "form";

  function setConfigStatus(text, status = "idle") { setStatus(elements, text, status); }

  function populateConfigForm(configObject) {
    if (!configObject) return;
    elements.configForm.elements.factory_id.value = elements.selectedFactory.value;
    remoteSetFields.forEach((field) => {
      const element = elements.configForm.elements[field];
      if (element) element.checked = fieldValue(element, configObject[field]);
      if (element && element.type !== "checkbox") element.value = fieldValue(element, configObject[field]);
    });
    if (elements.configJsonTextarea) elements.configJsonTextarea.value = JSON.stringify(configObject, null, 2);
  }

  function readFormChanges() {
    const changes = {};
    remoteSetFields.forEach((field) => {
      const element = elements.configForm.elements[field];
      if (!element) return;
      changes[field] = element.type === "checkbox" ? element.checked : (NUMERIC_FIELDS.has(field) ? Number(element.value) : element.value);
    });
    return changes;
  }

  function readJsonChanges() {
    const parsed = JSON.parse(elements.configJsonTextarea.value || "{}");
    const changes = {};
    remoteSetFields.forEach((field) => {
      if (parsed[field] !== undefined) changes[field] = NUMERIC_FIELDS.has(field) ? Number(parsed[field]) : parsed[field];
    });
    return changes;
  }

  function setMode(nextMode) {
    mode = nextMode;
    elements.configModeFormBtn?.classList.toggle("active", mode === "form");
    elements.configModeJsonBtn?.classList.toggle("active", mode === "json");
    elements.configGroupsContainer.hidden = mode === "json";
    elements.configJsonEditorContainer.hidden = mode === "form";
    if (mode === "json") elements.configJsonTextarea.value = JSON.stringify(readFormChanges(), null, 2);
  }

  function handleConfigMessage(topic, payloadText, factoryId) {
    if (topic.endsWith("/state/config")) {
      try {
        const parsed = JSON.parse(payloadText);
        latestStateByFactory.set(factoryId, parsed);
        if (elements.selectedFactory.value === factoryId) {
          populateConfigForm(parsed);
          setConfigStatus(`已載入 ${factoryId} 設定${parsed.revision !== undefined ? ` (rev ${parsed.revision})` : ""}`);
        }
      } catch (_) { /* malformed telemetry is not a config response */ }
      return;
    }
    if (!topic.endsWith("/state/control-result") || !pending.value) return;
    try {
      const parsed = JSON.parse(payloadText);
      const pendingRequest = pending.value;
      if (parsed.requestId !== pendingRequest.requestId || parsed.site !== pendingRequest.factoryId || parsed.command !== pendingRequest.command) return;
      pending.value = null;
      onPendingChange?.(null);
      const detail = boundedResultSummary(parsed);
      if (parsed.status === "accepted") {
        setConfigStatus(`指令成功 (${parsed.command})：${detail}`, "idle");
        if (parsed.configRevision !== undefined) {
          const current = latestStateByFactory.get(pendingRequest.factoryId) || {};
          current.revision = parsed.configRevision;
          latestStateByFactory.set(pendingRequest.factoryId, current);
        }
      } else if (parsed.status === "rejected") {
        setConfigStatus(`指令拒絕：${detail}`, "error");
      } else if (parsed.status === "duplicate") {
        setConfigStatus(`指令重複：${detail}`, "error");
      } else {
        setConfigStatus("收到無法識別的控制結果", "error");
      }
    } catch (_) { /* ignore malformed result */ }
  }

  function requestConfigLoad(factoryId) {
    const client = getClient();
    if (!client) { setConfigStatus("未連線至 Broker", "error"); return; }
    const request = newPendingRequest(factoryId, "get-config");
    pending.value = request;
    onPendingChange?.(request);
    setConfigStatus(`讀取 ${factoryId} 設定中...`, "loading");
    client.publish(`${getPrefix()}/${factoryId}/cmd/get-config`, controlEnvelope(request));
  }

  function submitConfig(event) {
    event.preventDefault();
    const client = getClient();
    if (!client) { setConfigStatus("未連線至 Broker", "error"); return; }
    let changes;
    try {
      changes = mode === "json" ? readJsonChanges() : readFormChanges();
      elements.jsonParseError.hidden = true;
    } catch (error) {
      elements.jsonParseError.textContent = `JSON 格式錯誤: ${String(error.message).slice(0, 120)}`;
      elements.jsonParseError.hidden = false;
      setConfigStatus("JSON 格式有誤，無法儲存", "error");
      return;
    }
    const factoryId = elements.selectedFactory.value;
    const request = newPendingRequest(factoryId, "set");
    pending.value = request;
    onPendingChange?.(request);
    setConfigStatus(`儲存 ${factoryId} 設定中...`, "loading");
    client.publish(`${getPrefix()}/${factoryId}/cmd/set`, controlEnvelope(request, changes));
  }

  function init() {
    elements.configModeFormBtn?.addEventListener("click", () => setMode("form"));
    elements.configModeJsonBtn?.addEventListener("click", () => setMode("json"));
    elements.loadConfig.addEventListener("click", () => requestConfigLoad(elements.selectedFactory.value));
    elements.configForm.addEventListener("submit", submitConfig);
    elements.selectedFactory.addEventListener("change", () => {
      const current = latestStateByFactory.get(elements.selectedFactory.value);
      if (current) populateConfigForm(current);
      else setConfigStatus(`已選擇 ${elements.selectedFactory.value}，可點擊載入設定`);
    });
  }

  return {
    init,
    handleConfigMessage,
    populateConfigForm,
    requestConfigLoad,
    submitConfig,
    get latestStateByFactory() { return latestStateByFactory; },
  };
}
