import { createFactoryStore, parseTelemetry, renderFactory, renderSummary } from "./factory-view.js";
import { createMqttManager, renderSubscriptions } from "./mqtt-manager.js";
import { createConfigView } from "./config-view.js";
import { createLocalConfigView } from "./local-config-view.js";

const DEFAULTS = { host: "localhost", port: "8884", prefix: "solar" };
const state = { activePrefix: DEFAULTS.prefix, connectionState: "disconnected", connectionMessage: "Disconnected" };
const factoryStore = createFactoryStore();
const topicCache = new Map();
const elements = {};
let mqttManager;
let configView;
let localConfigView;

function getElement(id) {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing element: #${id}`);
  return element;
}

function renderAllPanels() {
  ["KN", "CL"].forEach((factoryId) => {
    const rows = Array.from(topicCache.values()).filter((row) => row.factoryId === factoryId).sort((a, b) => b.receivedAt.localeCompare(a.receivedAt));
    renderFactory(factoryId, factoryStore[factoryId], rows);
  });
  renderSummary(state, factoryStore, topicCache);
}

function onMqttState(connectionState, connectionMessage) {
  state.connectionState = connectionState;
  state.connectionMessage = connectionMessage || connectionState;
  if (elements.brokerStatus) {
    elements.brokerStatus.dataset.state = connectionState;
    elements.brokerStatus.textContent = connectionState;
  }
  if (elements.brokerStatusText) {
    elements.brokerStatusText.textContent = state.connectionMessage;
  }
  renderAllPanels();
}

function onMessage(topic, payload) {
  const payloadText = payload.toString();
  const receivedAt = new Date().toISOString();
  const factoryId = topic.split("/")[1];
  topicCache.set(topic, { topic, payloadText, receivedAt, factoryId });
  parseTelemetry(factoryStore, topic, payloadText, receivedAt);
  configView.handleConfigMessage(topic, payloadText, factoryId);
  renderAllPanels();
}

function initThemeAndLayout() {
  const theme = localStorage.getItem("solar_theme") === "light" ? "light" : "dark";
  const layout = localStorage.getItem("solar_layout") === "tabs" ? "tabs" : "split";
  document.documentElement.dataset.theme = theme;
  elements.consoleLayout.dataset.layout = layout;
  elements.layoutSplitBtn.classList.toggle("active", layout === "split");
  elements.layoutTabsBtn.classList.toggle("active", layout === "tabs");
  elements.themeToggleBtn.textContent = theme === "dark" ? "🌙 深色" : "☀️ 淺色";
  elements.layoutSplitBtn.addEventListener("click", () => setLayout("split"));
  elements.layoutTabsBtn.addEventListener("click", () => setLayout("tabs"));
  elements.themeToggleBtn.addEventListener("click", () => {
    const current = document.documentElement.dataset.theme;
    const next = current === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    localStorage.setItem("solar_theme", next);
    elements.themeToggleBtn.textContent = next === "dark" ? "🌙 深色" : "☀️ 淺色";
  });
  elements.tabKn.addEventListener("click", () => setFactoryTab("KN"));
  elements.tabCl.addEventListener("click", () => setFactoryTab("CL"));
}

function setLayout(mode) {
  elements.consoleLayout.dataset.layout = mode;
  elements.layoutSplitBtn.classList.toggle("active", mode === "split");
  elements.layoutTabsBtn.classList.toggle("active", mode === "tabs");
  localStorage.setItem("solar_layout", mode);
}

function setFactoryTab(factoryId) {
  document.querySelectorAll(".tab-btn[data-factory]").forEach((button) => button.classList.toggle("active", button.dataset.factory === factoryId));
  document.querySelectorAll(".factory-panel").forEach((panel) => panel.classList.toggle("active-tab", panel.dataset.factory === factoryId));
}

function initDrawerAndCopy() {
  const openDrawer = () => { elements.drawer.classList.add("open"); elements.backdrop.classList.add("open"); };
  const closeDrawer = () => { elements.drawer.classList.remove("open"); elements.backdrop.classList.remove("open"); };
  elements.operationsToggle.addEventListener("click", openDrawer);
  elements.drawerClose.addEventListener("click", closeDrawer);
  elements.backdrop.addEventListener("click", closeDrawer);
  document.querySelectorAll(".copy-btn").forEach((button) => button.addEventListener("click", () => {
    const target = document.getElementById(button.dataset.copyTarget);
    if (!target) return;
    navigator.clipboard.writeText(target.textContent).then(() => {
      const original = button.textContent;
      button.textContent = "已複製 ✓";
      button.classList.add("copied");
      setTimeout(() => { button.textContent = original; button.classList.remove("copied"); }, 1500);
    });
  }));
}

function initActions() {
  document.getElementById("scrape-now-btn-kn")?.addEventListener("click", async () => {
    const btn = document.getElementById("scrape-now-btn-kn");
    btn.disabled = true;
    try {
      const res = await localConfigView.triggerScrapeNow("KN");
      if (res.summary) {
        factoryStore.KN.powerKw = res.summary.total_power_kw;
        factoryStore.KN.todayMwh = res.summary.today_mwh;
        factoryStore.KN.monthMwh = res.summary.month_mwh;
        factoryStore.KN.totalMwh = res.summary.total_mwh;
      }
      if (res.zones) {
        factoryStore.KN.zones = res.zones;
      }
      renderAllPanels();
    } catch (_) {
    } finally {
      btn.disabled = false;
    }
  });

  document.getElementById("scrape-now-btn-cl")?.addEventListener("click", async () => {
    const btn = document.getElementById("scrape-now-btn-cl");
    btn.disabled = true;
    try {
      const res = await localConfigView.triggerScrapeNow("CL");
      if (res.summary) {
        factoryStore.CL.powerKw = res.summary.total_power_kw;
        factoryStore.CL.todayMwh = res.summary.today_mwh;
        factoryStore.CL.monthMwh = res.summary.month_mwh;
        factoryStore.CL.totalMwh = res.summary.total_mwh;
      }
      if (res.zones) {
        factoryStore.CL.zones = res.zones;
      }
      renderAllPanels();
    } catch (_) {
    } finally {
      btn.disabled = false;
    }
  });

  document.getElementById("export-csv-btn-kn")?.addEventListener("click", () => {
    localConfigView.exportCSV("KN", factoryStore.KN.zones);
  });

  document.getElementById("export-csv-btn-cl")?.addEventListener("click", () => {
    localConfigView.exportCSV("CL", factoryStore.CL.zones);
  });
}

function init() {
  const ids = {
    consoleLayout: "console-layout", layoutSplitBtn: "layout-split-btn", layoutTabsBtn: "layout-tabs-btn", themeToggleBtn: "theme-toggle-btn", tabKn: "tab-btn-kn", tabCl: "tab-btn-cl", operationsToggle: "operations-toggle-btn", drawer: "operations-drawer", drawerClose: "drawer-close-btn", backdrop: "drawer-backdrop",
    host: "broker-host", port: "broker-port", username: "broker-username", password: "broker-password", clientId: "client-id", prefix: "active-prefix", brokerStatus: "broker-status", brokerStatusText: "broker-status-text", configForm: "config-form", selectedFactory: "selected-factory", loadConfig: "load-config", configStatus: "config-status", configModeFormBtn: "config-mode-form-btn", configModeJsonBtn: "config-mode-json-btn", configGroupsContainer: "config-groups-container", configJsonEditorContainer: "config-json-editor-container", configJsonTextarea: "config-json-textarea", jsonParseError: "json-parse-error",
  };
  Object.entries(ids).forEach(([key, id]) => { elements[key] = getElement(id); });
  initThemeAndLayout();
  initDrawerAndCopy();
  localConfigView = createLocalConfigView({});
  localConfigView.init();
  initActions();
  configView = createConfigView({ elements, getClient: () => mqttManager.client, getPrefix: () => mqttManager.activePrefix });
  configView.init();
  mqttManager = createMqttManager({
    getConnectionSettings: () => ({ host: elements.host.value || DEFAULTS.host, port: elements.port.value || DEFAULTS.port, prefix: elements.prefix.value || DEFAULTS.prefix, clientId: elements.clientId.value, username: elements.username.value, password: elements.password.value }),
    onState: onMqttState,
    onMessage,
    onSubscriptions: (prefix, sent) => { state.activePrefix = prefix; renderSubscriptions(prefix, sent); },
  });
  elements.brokerForm = getElement("broker-form");
  elements.brokerForm.addEventListener("submit", (event) => { event.preventDefault(); mqttManager.connect(); });
  getElement("disconnect-broker").addEventListener("click", () => mqttManager.disconnect());
  elements.prefix.addEventListener("change", () => mqttManager.updateActivePrefix(elements.prefix.value));
  getElement("publish-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const topic = getElement("publish-topic").value.trim();
    const payload = getElement("publish-payload").value.trim();
    const error = getElement("publish-error");
    error.hidden = true;
    if (!topic) { error.textContent = "Topic 不能為空"; error.hidden = false; return; }
    try { mqttManager.publish(topic, payload); } catch (publishError) { error.textContent = String(publishError.message).slice(0, 120); error.hidden = false; }
  });
  renderSubscriptions(state.activePrefix, new Map([["KN", false], ["CL", false]]));
  renderAllPanels();
  try {
    mqttManager.connect();
  } catch (err) {
    console.warn("MQTT auto-connect warning:", err);
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
