(() => {
  const DEFAULT_HOST = "localhost";
  const DEFAULT_PORT = "8884";
  const DEFAULT_PREFIX = "solar";
  const MQTT_PATH = "/mqtt";

  const state = {
    brokerHost: determineDefaultBrokerHost(),
    brokerPort: DEFAULT_PORT,
    clientId: generateClientId(),
    activePrefix: DEFAULT_PREFIX,
    connectionState: "disconnected",
    connectionMessage: "Disconnected",
    client: null,
    userDisconnected: false,
  };

  const els = {};
  const topicCache = new Map();
  const restartRequiredFields = new Set([
    "mqtt_host",
    "mqtt_port",
    "mqtt_prefix",
    "mosquitto_path",
    "mosquitto_config",
    "sqlite_path",
    "sqlite_enabled",
  ]);
  const booleanFields = new Set([
    "night_pause",
    "sqlite_enabled",
    "ha_discovery",
    "mqtt_retain_summary",
    "mqtt_retain_zone",
    "mqtt_retain_status",
    "mqtt_retain_config",
    "mqtt_retain_alert",
    "mqtt_retain_heartbeat",
  ]);
  const numericFields = new Set([
    "mqtt_port",
    "interval",
    "night_lat",
    "night_lon",
    "night_padding_min",
    "anomaly_daytime_zero_minutes",
    "heartbeat_interval",
  ]);
  const configState = {
    selectedFactory: "KN",
    pendingRequest: null,
    lastLoadedByFactory: new Map(),
    statusMode: "idle",
  };

  function generateClientId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return `solar-web-${window.crypto.randomUUID()}`;
    }
    return `solar-web-${Math.random().toString(16).slice(2, 10)}`;
  }

  function determineDefaultBrokerHost() {
    return window.location.hostname || DEFAULT_HOST;
  }

  function getEl(id) {
    const el = document.getElementById(id);
    if (!el) {
      throw new Error(`Missing element: #${id}`);
    }
    return el;
  }

  function syncInputs() {
    els.host.value = state.brokerHost;
    els.port.value = state.brokerPort;
    els.clientId.value = state.clientId;
    els.prefix.value = state.activePrefix;
  }

  function extractFactoryId(topic) {
    const parts = topic.split("/");
    return parts.length >= 2 ? parts[1] : "UNKNOWN";
  }

  // --- Per-factory row helpers ---

  function getFactoryRows(factoryId) {
    return Array.from(topicCache.values())
      .filter((r) => r.factoryId === factoryId)
      .sort((a, b) => a.topic.localeCompare(b.topic));
  }

  function getFactoryRowsByRecency(factoryId) {
    return Array.from(topicCache.values())
      .filter((r) => r.factoryId === factoryId)
      .sort((a, b) => b.receivedAt.localeCompare(a.receivedAt));
  }

  function buildTopicRowEl(row) {
    const div = document.createElement("div");
    div.className = "topic-row";

    const topicSpan = document.createElement("span");
    topicSpan.className = "topic-row__topic";
    topicSpan.textContent = row.topic;

    const payloadSpan = document.createElement("span");
    payloadSpan.className = "topic-row__payload";
    payloadSpan.textContent = row.payloadText;

    const updatedSpan = document.createElement("span");
    updatedSpan.className = "topic-row__updated";
    updatedSpan.textContent = new Date(row.receivedAt).toLocaleString();

    div.append(topicSpan, payloadSpan, updatedSpan);
    return div;
  }

  function renderFactorySection(factoryId) {
    const statusEl = els[`factoryStatus_${factoryId}`];
    const updatedEl = els[`factoryUpdated_${factoryId}`];
    const highlightsEl = els[`factoryHighlights_${factoryId}`];
    const topicListEl = els[`factoryTopicList_${factoryId}`];

    const rows = getFactoryRows(factoryId);

    if (rows.length === 0) {
      statusEl.textContent = "No Data";
      statusEl.dataset.state = "idle";
      updatedEl.textContent = "Never";

      highlightsEl.innerHTML = "";
      const emptyHighlight = document.createElement("p");
      emptyHighlight.className = "empty-state";
      emptyHighlight.textContent = "No messages yet";
      highlightsEl.appendChild(emptyHighlight);

      topicListEl.innerHTML = "";
      const emptyList = document.createElement("p");
      emptyList.className = "empty-state";
      emptyList.textContent = "No Data";
      topicListEl.appendChild(emptyList);
      return;
    }

    const recentRows = getFactoryRowsByRecency(factoryId);
    const newestRow = recentRows[0];

    statusEl.textContent = "Active";
    statusEl.dataset.state = "active";
    updatedEl.textContent = new Date(newestRow.receivedAt).toLocaleString();

    highlightsEl.innerHTML = "";
    const highlightFrag = document.createDocumentFragment();
    for (const row of recentRows.slice(0, 3)) {
      highlightFrag.appendChild(buildTopicRowEl(row));
    }
    highlightsEl.appendChild(highlightFrag);

    topicListEl.innerHTML = "";
    const listFrag = document.createDocumentFragment();
    for (const row of rows) {
      listFrag.appendChild(buildTopicRowEl(row));
    }
    topicListEl.appendChild(listFrag);
  }

  function renderSummary() {
    els.summaryConnectionState.textContent = state.connectionMessage || state.connectionState;
    els.summaryActivePrefix.textContent = state.activePrefix;

    let latestTime = null;
    for (const row of topicCache.values()) {
      if (!latestTime || row.receivedAt > latestTime) {
        latestTime = row.receivedAt;
      }
    }
    els.summaryLastUpdate.textContent = latestTime
      ? new Date(latestTime).toLocaleString()
      : "No messages yet";

    els.summaryKnState.textContent = getFactoryRows("KN").length > 0 ? "Active" : "No Data";
    els.summaryClState.textContent = getFactoryRows("CL").length > 0 ? "Active" : "No Data";
  }

  function renderAllPanels() {
    renderFactorySection("KN");
    renderFactorySection("CL");
    renderSummary();
  }

  function subscribeFactoryTopics(prefix = state.activePrefix) {
    if (!state.client || state.connectionState !== "connected") {
      return;
    }

    ["KN", "CL"].forEach((factoryId) => {
      state.client.subscribe(`${prefix}/${factoryId}/#`);
    });
  }

  function unsubscribeFactoryTopics(prefix) {
    if (!state.client || state.connectionState === "disconnected") {
      return;
    }

    ["KN", "CL"].forEach((factoryId) => {
      state.client.unsubscribe(`${prefix}/${factoryId}/#`);
    });
  }

  function updateActivePrefix(previousPrefix, nextPrefix) {
    if (previousPrefix === nextPrefix) {
      return;
    }
    unsubscribeFactoryTopics(previousPrefix);
    subscribeFactoryTopics(nextPrefix);
  }

  function getConfigTopic(factoryId) {
    return `${state.activePrefix}/${factoryId}/config`;
  }

  function getSetTopic(factoryId) {
    return `${state.activePrefix}/${factoryId}/set`;
  }

  function setConfigStatus(message, stateName = "idle") {
    configState.statusMode = stateName;
    els.configStatus.textContent = message;
    els.configStatus.dataset.state = stateName;
  }

  function normalizeFieldValue(element) {
    if (element.type === "checkbox") {
      return element.checked;
    }
    if (numericFields.has(element.name)) {
      return element.value === "" ? "" : Number(element.value);
    }
    return element.value;
  }

  function getConfigFormValueMap() {
    const map = new Map();
    for (const element of els.configForm.elements) {
      if (!element.name || element.name === "selectedFactory") {
        continue;
      }
      if (element.name === "factory_id") {
        map.set(element.name, element.value);
        continue;
      }
      map.set(element.name, normalizeFieldValue(element));
    }
    return map;
  }

  function valuesDiffer(a, b) {
    return JSON.stringify(a) !== JSON.stringify(b);
  }

  function updateRestartHint() {
    const snapshot = configState.lastLoadedByFactory.get(configState.selectedFactory);
    if (!snapshot) {
      els.restartHint.hidden = true;
      return;
    }

    const currentValues = getConfigFormValueMap();
    const dirty = Array.from(restartRequiredFields).some((field) => {
      const snapshotValue = field in snapshot
        ? snapshot[field]
        : snapshot.factory?.[field];
      return valuesDiffer(currentValues.get(field), snapshotValue ?? "");
    });

    els.restartHint.hidden = !dirty;
  }

  function checkConfigDirty() {
    if (configState.statusMode !== "loaded" && configState.statusMode !== "dirty") {
      return;
    }
    const snapshot = configState.lastLoadedByFactory.get(configState.selectedFactory);
    if (!snapshot) {
      return;
    }

    const current = getConfigFormValueMap();
    const factory = snapshot.factory || {};
    let isDirty = false;

    for (const [key, currentVal] of current) {
      let snapshotVal;
      if (key === "factory_id") {
        snapshotVal = factory.factory_id ?? configState.selectedFactory;
      } else if (key in snapshot) {
        snapshotVal = snapshot[key];
      } else if (key in factory) {
        snapshotVal = factory[key];
      } else {
        snapshotVal = "";
      }
      if (valuesDiffer(currentVal, snapshotVal ?? "")) {
        isDirty = true;
        break;
      }
    }

    if (isDirty) {
      setConfigStatus("Unsaved changes", "dirty");
    } else {
      setConfigStatus(`Loaded ${configState.selectedFactory} config`, "loaded");
    }
  }

  function setConfigFactory(factoryId, loadSnapshot = true) {
    configState.selectedFactory = factoryId;
    els.selectedFactory.value = factoryId;
    els.factoryId.value = factoryId;

    if (!loadSnapshot) {
      updateRestartHint();
      return;
    }

    const snapshot = configState.lastLoadedByFactory.get(factoryId);
    if (snapshot) {
      applyConfigToForm(snapshot, false);
      return;
    }

    const cached = topicCache.get(getConfigTopic(factoryId));
    if (cached && cached.payloadText.trim() && cached.payloadText.trim() !== "{}") {
      try {
        applyConfigToForm(JSON.parse(cached.payloadText), false);
        return;
      } catch (error) {
        console.warn("Failed to parse cached config", error);
      }
    }

    updateRestartHint();
  }

  function setConfigFormField(name, value) {
    const field = els.configForm.elements.namedItem(name);
    if (!field) {
      return;
    }
    if (field.type === "checkbox") {
      field.checked = Boolean(value);
      return;
    }
    if (value === undefined || value === null) {
      field.value = "";
      return;
    }
    field.value = String(value);
  }

  function applyConfigToForm(configPayload, rememberSnapshot = true) {
    const factory = configPayload.factory || {};
    const factoryId = factory.factory_id || configState.selectedFactory || "KN";

    configState.selectedFactory = factoryId;
    els.selectedFactory.value = factoryId;
    els.factoryId.value = factoryId;

    const topLevelFields = [
      "mqtt_host",
      "mqtt_port",
      "mqtt_prefix",
      "interval",
      "mosquitto_path",
      "mosquitto_config",
      "ha_discovery",
      "ha_discovery_prefix",
      "sqlite_path",
      "sqlite_enabled",
      "night_pause",
      "night_lat",
      "night_lon",
      "night_padding_min",
      "anomaly_daytime_zero_minutes",
      "heartbeat_interval",
      "mqtt_retain_summary",
      "mqtt_retain_zone",
      "mqtt_retain_status",
      "mqtt_retain_config",
      "mqtt_retain_alert",
      "mqtt_retain_heartbeat",
    ];

    topLevelFields.forEach((name) => setConfigFormField(name, configPayload[name]));
    setConfigFormField("base_url", factory.base_url);
    setConfigFormField("login_user", factory.login_user);
    setConfigFormField("login_pass", factory.login_pass);

    if (rememberSnapshot) {
      configState.lastLoadedByFactory.set(factoryId, {
        ...configPayload,
        factory: { ...factory },
      });
    }

    setConfigStatus(`Loaded ${factoryId} config`, "loaded");
    updateRestartHint();
  }

  function requestConfig(factoryId) {
    if (!state.client || state.connectionState !== "connected") {
      setConfigStatus("Connect broker first", "error");
      return;
    }

    if (configState.pendingRequest) {
      window.clearTimeout(configState.pendingRequest.timeoutId);
    }

    setConfigStatus(`Loading ${factoryId} config...`, "loading");
    configState.pendingRequest = {
      factoryId,
      requestedAt: Date.now(),
      timeoutId: window.setTimeout(() => {
        if (configState.pendingRequest?.factoryId !== factoryId) {
          return;
        }
        configState.pendingRequest = null;
        setConfigStatus("No fresh config response yet", "error");
      }, 5000),
    };

    state.client.publish(getConfigTopic(factoryId), "{}");
  }

  function maybeHandleConfigMessage(topic, payloadText) {
    const pending = configState.pendingRequest;
    if (!pending) {
      return false;
    }

    const expectedTopic = getConfigTopic(pending.factoryId);
    if (topic !== expectedTopic) {
      return false;
    }

    let parsed;
    try {
      parsed = JSON.parse(payloadText);
    } catch (error) {
      window.clearTimeout(pending.timeoutId);
      configState.pendingRequest = null;
      setConfigStatus(`Invalid config JSON: ${error.message}`, "error");
      return true;
    }

    if (!parsed || Object.keys(parsed).length === 0) {
      return false;
    }

    window.clearTimeout(pending.timeoutId);
    configState.pendingRequest = null;
    applyConfigToForm(parsed, true);
    return true;
  }

  function collectConfigPayload() {
    const payload = {};
    const form = els.configForm;

    for (const element of form.elements) {
      if (!element.name || element.name === "selectedFactory" || element.name === "factory_id") {
        continue;
      }

      if (element.type === "checkbox") {
        payload[element.name] = element.checked;
      } else if (numericFields.has(element.name)) {
        payload[element.name] = element.value === "" ? 0 : Number(element.value);
      } else {
        payload[element.name] = element.value;
      }
    }

    if (els.restartRequired.checked) {
      payload.restart = true;
    }

    return payload;
  }

  function handleSuccessfulSet(payload) {
    if (!payload.mqtt_prefix) {
      return;
    }

    const previousPrefix = state.activePrefix;
    state.activePrefix = payload.mqtt_prefix;
    els.prefix.value = payload.mqtt_prefix;
    updateActivePrefix(previousPrefix, payload.mqtt_prefix);
    topicCache.clear();
    renderAllPanels();
    setConfigStatus(
      "Prefix updated. If the service has not restarted yet, new data may pause temporarily.",
      "loaded"
    );
  }

  function setPublishError(message = "") {
    els.publishError.textContent = message;
    els.publishError.hidden = !message;
  }

  function publishManualMessage(event) {
    event.preventDefault();

    if (!state.client || state.connectionState !== "connected") {
      setPublishError("Connect broker first");
      return;
    }

    const topic = els.publishTopic.value.trim();
    if (!topic) {
      setPublishError("Topic is required");
      return;
    }

    const payloadText = els.publishPayload.value.trim();
    let payload;
    try {
      payload = JSON.parse(payloadText);
    } catch (error) {
      setPublishError(`Invalid JSON: ${error.message}`);
      return;
    }

    try {
      state.client.publish(topic, JSON.stringify(payload));
      setPublishError("");
    } catch (error) {
      setPublishError(`Publish failed: ${error.message}`);
    }
  }

  function setConnectionState(nextState, detail = "") {
    state.connectionState = nextState;
    state.connectionMessage = detail || nextState;
    els.status.dataset.state = nextState;
    els.status.textContent = nextState.charAt(0).toUpperCase() + nextState.slice(1);
    els.statusText.textContent = state.connectionMessage;
    els.connect.disabled = nextState === "connecting";
    els.disconnect.disabled = nextState === "disconnected";
    if (els.summaryConnectionState) {
      renderSummary();
    }
  }

  function readInputs() {
    state.brokerHost = els.host.value.trim() || DEFAULT_HOST;
    state.brokerPort = String(Number.parseInt(els.port.value, 10) || Number(DEFAULT_PORT));
    state.clientId = els.clientId.value.trim() || generateClientId();
    state.activePrefix = els.prefix.value.trim() || DEFAULT_PREFIX;
    syncInputs();
    if (els.summaryActivePrefix) {
      renderSummary();
    }
  }

  function buildBrokerUrl() {
    const scheme = window.location.protocol === "https:" ? "wss:" : "ws:";
    return `${scheme}//${state.brokerHost}:${state.brokerPort}${MQTT_PATH}`;
  }

  function disconnectBroker() {
    state.userDisconnected = true;
    if (state.client) {
      try {
        state.client.end(true);
      } catch (error) {
        console.warn(error);
      }
      state.client = null;
    }
    setConnectionState("disconnected", "Disconnected");
  }

  function connectBroker() {
    readInputs();
    if (!window.mqtt || typeof window.mqtt.connect !== "function") {
      setConnectionState("error", "MQTT browser bundle is not loaded");
      return;
    }

    if (state.client) {
      disconnectBroker();
    }

    state.userDisconnected = false;
    setConnectionState("connecting", `Connecting to ${state.brokerHost}:${state.brokerPort}`);

    const client = window.mqtt.connect(buildBrokerUrl(), {
      clientId: state.clientId,
      keepalive: 30,
      clean: true,
      reconnectPeriod: 3000,
      connectTimeout: 10000,
      resubscribe: false,
    });

    state.client = client;

    client.on("connect", () => {
      if (state.userDisconnected) {
        return;
      }
      setConnectionState("connected", `Connected to ${state.brokerHost}:${state.brokerPort}`);
      subscribeFactoryTopics();
    });

    client.on("reconnect", () => {
      if (!state.userDisconnected) {
        setConnectionState("reconnecting", "Reconnecting...");
      }
    });

    client.on("close", () => {
      if (!state.userDisconnected && state.connectionState !== "error") {
        setConnectionState("reconnecting", "Connection closed");
      }
    });

    client.on("offline", () => {
      if (!state.userDisconnected) {
        setConnectionState("reconnecting", "Broker offline");
      }
    });

    client.on("error", (error) => {
      if (!state.userDisconnected) {
        setConnectionState("error", error?.message || "MQTT error");
      }
    });

    client.on("message", (topic, payload) => {
      const text = payload.toString();
      if (topic === getConfigTopic(configState.pendingRequest?.factoryId || configState.selectedFactory) && text.trim() === "{}") {
        return;
      }
      if (maybeHandleConfigMessage(topic, text)) {
        topicCache.set(topic, {
          topic,
          factoryId: extractFactoryId(topic),
          payloadText: text,
          receivedAt: new Date().toISOString(),
        });
        renderAllPanels();
        return;
      }
      topicCache.set(topic, {
        topic,
        factoryId: extractFactoryId(topic),
        payloadText: text,
        receivedAt: new Date().toISOString(),
      });
      renderAllPanels();
    });
  }

  function init() {
    els.form = getEl("broker-form");
    els.host = getEl("broker-host");
    els.port = getEl("broker-port");
    els.clientId = getEl("client-id");
    els.prefix = getEl("active-prefix");
    els.status = getEl("broker-status");
    els.statusText = getEl("broker-status-text");
    els.connect = getEl("connect-broker");
    els.disconnect = getEl("disconnect-broker");
    els.configForm = getEl("config-form");
    els.selectedFactory = getEl("selected-factory");
    els.factoryId = els.configForm.elements.namedItem("factory_id");
    els.configStatus = getEl("config-status");
    els.restartHint = getEl("restart-hint");
    els.restartRequired = getEl("restart-required");
    els.loadConfig = getEl("load-config");
    els.saveConfig = getEl("save-config");
    els.publishForm = getEl("publish-form");
    els.publishTopic = getEl("publish-topic");
    els.publishPayload = getEl("publish-payload");
    els.publishSubmit = getEl("publish-submit");
    els.publishError = getEl("publish-error");

    // Summary strip elements
    els.summaryPanel = getEl("summary-panel");
    els.summaryConnectionState = getEl("summary-connection-state");
    els.summaryActivePrefix = getEl("summary-active-prefix");
    els.summaryLastUpdate = getEl("summary-last-update");
    els.summaryKnState = getEl("summary-kn-state");
    els.summaryClState = getEl("summary-cl-state");

    // Per-factory panel elements
    ["KN", "CL"].forEach((fid) => {
      const id = fid.toLowerCase();
      els[`factoryHighlights_${fid}`] = getEl(`factory-highlights-${id}`);
      els[`factoryTopicList_${fid}`] = getEl(`factory-topic-list-${id}`);
      els[`factoryStatus_${fid}`] = getEl(`factory-status-${id}`);
      els[`factoryUpdated_${fid}`] = getEl(`factory-updated-${id}`);
    });

    syncInputs();
    setConnectionState("disconnected", "Disconnected");
    renderAllPanels();
    setConfigStatus("Select a factory.", "idle");
    setConfigFactory("KN", false);

    els.form.addEventListener("submit", (event) => {
      event.preventDefault();
      connectBroker();
    });

    els.disconnect.addEventListener("click", disconnectBroker);
    els.clientId.addEventListener("change", readInputs);
    els.prefix.addEventListener("change", () => {
      const previousPrefix = state.activePrefix;
      readInputs();
      updateActivePrefix(previousPrefix, state.activePrefix);
    });
    els.host.addEventListener("change", readInputs);
    els.port.addEventListener("change", readInputs);

    els.selectedFactory.addEventListener("change", () => {
      setConfigFactory(els.selectedFactory.value, true);
    });
    els.loadConfig.addEventListener("click", () => {
      setConfigFactory(els.selectedFactory.value, false);
      requestConfig(els.selectedFactory.value);
    });
    els.configForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const payload = collectConfigPayload();
      const factoryId = els.selectedFactory.value;
      if (!state.client || state.connectionState !== "connected") {
        setConfigStatus("Connect broker first", "error");
        return;
      }
      state.client.publish(getSetTopic(factoryId), JSON.stringify(payload));
      handleSuccessfulSet(payload);
      configState.lastLoadedByFactory.set(factoryId, {
        ...payload,
        factory: {
          base_url: payload.base_url,
          login_user: payload.login_user,
          login_pass: payload.login_pass,
          factory_id: factoryId,
        },
      });
      setConfigStatus(`Saved ${factoryId} config`, "loaded");
      updateRestartHint();
    });
    els.configForm.addEventListener("input", () => {
      updateRestartHint();
      checkConfigDirty();
    });

    els.publishForm.addEventListener("submit", publishManualMessage);
    els.publishPayload.addEventListener("input", () => setPublishError(""));
    els.publishTopic.addEventListener("input", () => setPublishError(""));
  }

  document.addEventListener("DOMContentLoaded", init);
})();
