export const FACTORIES = ["KN", "CL"];

export function createFactoryStore() {
  return Object.fromEntries(FACTORIES.map((factoryId) => [factoryId, {
    summary: {},
    zones: new Map(),
    lastUpdated: null,
    status: "No Data",
  }]));
}

function formatNumber(value, decimals = 1, empty = "--") {
  if (value === undefined || value === null || Number.isNaN(Number(value))) return empty;
  return Number(value).toFixed(decimals);
}

function parseValue(payload, payloadObject) {
  if (payloadObject && payloadObject.value !== undefined) return payloadObject.value;
  const value = Number.parseFloat(payload);
  return Number.isNaN(value) ? undefined : value;
}

export function parseTelemetry(factoryStore, topic, payloadText, receivedAt = new Date().toISOString()) {
  const parts = topic.split("/");
  const factoryId = parts[1];
  const suffix = parts.slice(2).join("/");
  const store = factoryStore[factoryId];
  if (!store) return;

  let payloadObject;
  try { payloadObject = JSON.parse(payloadText); } catch (_) { payloadObject = null; }
  store.lastUpdated = receivedAt;

  if (suffix === "summary" && payloadObject && typeof payloadObject === "object") {
    store.summary = { ...store.summary, ...payloadObject };
  } else if (["total_power_kw", "today_mwh", "month_mwh", "total_mwh"].includes(suffix)) {
    const value = parseValue(payloadText, payloadObject);
    if (value !== undefined) store.summary[suffix] = value;
  } else if (suffix === "status") {
    store.status = payloadObject?.status ?? payloadText;
  } else if (suffix.startsWith("zone/")) {
    const zoneParts = suffix.split("/");
    const zoneId = Number.parseInt(zoneParts[1], 10);
    if (Number.isNaN(zoneId)) return;
    const zone = store.zones.get(zoneId) || { zone_id: zoneId, name: `Zone ${zoneId}` };
    if (zoneParts.length === 2 && payloadObject && typeof payloadObject === "object") {
      Object.assign(zone, payloadObject);
    } else if (zoneParts.length === 3) {
      const value = parseValue(payloadText, payloadObject);
      if (value !== undefined) zone[zoneParts[2]] = value;
    }
    store.zones.set(zoneId, zone);
  }
}

function appendCell(row, className, value, tagName = "td") {
  const cell = document.createElement(tagName);
  cell.className = className;
  cell.textContent = value;
  row.appendChild(cell);
}

export function renderFactory(factoryId, store, topicRows = []) {
  const fid = factoryId.toLowerCase();
  const status = document.getElementById(`factory-status-${fid}`);
  const updated = document.getElementById(`factory-updated-${fid}`);
  const tbody = document.getElementById(`zone-tbody-${fid}`);
  const count = document.getElementById(`zone-count-${fid}`);
  const highlights = document.getElementById(`factory-highlights-${fid}`);
  if (!store) return;

  if (status) {
    status.textContent = store.lastUpdated ? (store.status === "running" ? "運作中 (Running)" : (store.status || "Active")) : "No Data";
    status.dataset.state = store.status === "error" ? "error" : (store.lastUpdated ? "active" : "idle");
  }
  if (updated) updated.textContent = store.lastUpdated ? new Date(store.lastUpdated).toLocaleTimeString() : "Never";
  renderKPIs(factoryId, store.summary);
  renderZoneTable(factoryId, store.zones);

  if (highlights) {
    highlights.replaceChildren();
    topicRows.slice(0, 4).forEach((rowData) => {
      const row = document.createElement("div");
      row.className = "topic-row";
      appendCell(row, "topic-row__topic", rowData.topic, "span");
      appendCell(row, "topic-row__payload", rowData.payloadText, "span");
      appendCell(row, "topic-row__updated", new Date(rowData.receivedAt).toLocaleTimeString(), "span");
      highlights.appendChild(row);
    });
  }
  if (count) count.textContent = `${store.zones.size} 分區`;
}

export function renderKPIs(factoryId, summary = {}) {
  const fid = factoryId.toLowerCase();
  const values = {
    power: [summary.total_power_kw, 1],
    today: [summary.today_mwh, 2],
    month: [summary.month_mwh, 2],
    total: [summary.total_mwh, 3],
  };
  Object.entries(values).forEach(([key, [value, decimals]]) => {
    const element = document.getElementById(`kpi-${key}-${fid}`);
    if (element) element.textContent = formatNumber(value, decimals);
  });
}

export function renderZoneTable(factoryId, zones) {
  const fid = factoryId.toLowerCase();
  const tbody = document.getElementById(`zone-tbody-${fid}`);
  const count = document.getElementById(`zone-count-${fid}`);
  if (!tbody) return;
  const sorted = Array.from(zones.values()).sort((a, b) => Number(a.zone_id) - Number(b.zone_id));
  if (count) count.textContent = `${sorted.length} 分區`;
  tbody.replaceChildren();
  if (!sorted.length) {
    const row = document.createElement("tr");
    appendCell(row, "empty-state", "尚無分區資料");
    row.firstChild.colSpan = 8;
    tbody.appendChild(row);
    return;
  }
  sorted.forEach((zone) => {
    const row = document.createElement("tr");
    row.className = "row-updated";
    appendCell(row, "col-id", `Zone ${zone.zone_id}`);
    appendCell(row, "col-name", zone.name || `Zone ${zone.zone_id}`);
    const powerClass = Number(zone.power_kw) > 0 ? "col-num val-power" : "col-num val-zero";
    appendCell(row, powerClass, formatNumber(zone.power_kw, 1));
    appendCell(row, "col-num", formatNumber(zone.today_kwh, 1));
    appendCell(row, "col-num", formatNumber(zone.month_mwh, 2));
    appendCell(row, "col-num", formatNumber(zone.total_mwh, 2));
    appendCell(row, "col-num", formatNumber(zone.capacity_kwp, 1));
    appendCell(row, "col-num", formatNumber(zone.today_hours, 2));
    tbody.appendChild(row);
  });
}

export function renderSummary(state, factoryStore, topicCache) {
  const connection = document.getElementById("summary-connection-state");
  const prefix = document.getElementById("summary-active-prefix");
  const lastUpdate = document.getElementById("summary-last-update");
  const kn = document.getElementById("summary-kn-state");
  const cl = document.getElementById("summary-cl-state");
  if (connection) connection.textContent = state.connectionMessage || state.connectionState;
  if (prefix) prefix.textContent = state.activePrefix;
  const latest = Array.from(topicCache.values()).sort((a, b) => b.receivedAt.localeCompare(a.receivedAt))[0];
  if (lastUpdate) lastUpdate.textContent = latest ? new Date(latest.receivedAt).toLocaleTimeString() : "No messages yet";
  if (kn) kn.textContent = factoryStore.KN.lastUpdated ? "Active" : "No Data";
  if (cl) cl.textContent = factoryStore.CL.lastUpdated ? "Active" : "No Data";
}
