/**
 * @file app.js
 * @description DDE MQTT Bridge WebUI 核心邏輯，包含 ConfigManager 及 DOM 渲染。
 */

// 全域變數與狀態管理
let configManager = null;
let lastOpcValues = {};
let lastVirtualValues = {};
let activeTab = "status";

/**
 * Toast 通知系統
 * @param {string} msg - 提示訊息
 * @param {string} [type='success'] - 類型 (success, error, warn)
 */
function showToast(msg, type = "success") {
  const container = document.getElementById("toast-container");
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  el.innerHTML = `<span>${msg}</span>`;
  container.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

/**
 * 設定配置狀態管理器，負責與後端進行 REST 同步
 */
class ConfigManager {
  constructor() {
    this.config = null;
  }

  async load() {
    try {
      this.config = await fetchJSON("/api/config");
    } catch (e) {
      showToast("載入設定失敗: " + e.message, "error");
    }
  }

  async save() {
    try {
      await fetchJSON("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(this.config)
      });
      showToast("設定已儲存並同步至 Bridge");
      await this.load();
      renderAllConfigs();
    } catch (e) {
      showToast("儲存失敗: " + e.message, "error");
    }
  }
}

/**
 * 輔助 fetch JSON 封裝
 */
async function fetchJSON(url, options) {
  const response = await fetch(url, options);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || `HTTP ${response.status}`);
  }
  return data;
}

/**
 * 切換分頁
 * @param {string} name - 分頁 ID
 * @param {HTMLElement} btn - 點選的按鈕元素
 */
function showTab(name, btn) {
  activeTab = name;
  document.querySelectorAll(".tab").forEach((tab) => tab.classList.remove("active"));
  document.querySelectorAll("nav button").forEach((item) => item.classList.remove("active"));
  document.getElementById(`tab-${name}`).classList.add("active");
  if (btn) btn.classList.add("active");
}

/**
 * 切換主題模式 (Dark / Light)
 */
function toggleTheme() {
  const isLight = document.body.classList.toggle("light-theme");
  document.getElementById("theme-btn").textContent = isLight ? "🌙 深色模式" : "☀️ 淺色模式";
  localStorage.setItem("theme", isLight ? "light" : "dark");
}

/**
 * 載入偏好主題
 */
function initTheme() {
  const saved = localStorage.getItem("theme");
  if (saved === "light") {
    document.body.classList.add("light-theme");
    document.getElementById("theme-btn").textContent = "🌙 深色模式";
  }
}

/**
 * 渲染連線狀態與數值表格（含數值變動閃爍特效）
 * @param {Object} data - 狀態快照數據
 */
function renderStatus(data) {
  const ddeConnected = data.dde_connected ?? data.opc_connected;
  document.getElementById("opc-status").textContent = ddeConnected ? "已連線" : "未連線";
  document.getElementById("mqtt-status").textContent = data.mqtt_connected ? "已連線" : "未連線";
  document.getElementById("opc-dot").className = `dot ${ddeConnected ? "ok" : ""}`;
  document.getElementById("mqtt-dot").className = `dot ${data.mqtt_connected ? "ok" : ""}`;
  document.getElementById("last-read").textContent = data.last_read || "--";
  document.getElementById("last-publish").textContent = data.last_publish || "--";

  // 渲染 Raw Tags
  const rawTable = document.getElementById("raw-table");
  rawTable.innerHTML = "";
  Object.entries(data.raw_values || {}).forEach(([key, tagVal]) => {
    const row = document.createElement("tr");
    const valText = tagVal.Value !== null && tagVal.Value !== undefined ? tagVal.Value : "--";
    const lastVal = lastOpcValues[key];
    const flashClass = lastVal !== undefined && lastVal !== valText ? "class='flash-highlight'" : "";
    lastOpcValues[key] = valText;

    row.innerHTML = `
      <td><strong>${key}</strong></td>
      <td ${flashClass}>${valText}</td>
      <td><span class="tag ${tagVal.Ok ? "" : "danger"}" style="background: ${tagVal.Ok ? "var(--success-soft)" : "var(--danger-soft)"}; color: ${tagVal.Ok ? "var(--success)" : "var(--danger)"}">${tagVal.Ok ? "正常" : "異常"}</span></td>
      <td style="color: var(--danger)">${tagVal.ErrMsg || ""}</td>
    `;
    rawTable.appendChild(row);
  });

  // 渲染虛擬標籤
  const virtualTable = document.getElementById("virtual-table");
  virtualTable.innerHTML = "";
  (data.virtual_values || []).forEach((item) => {
    const row = document.createElement("tr");
    const valText = item.Value !== null && item.Value !== undefined ? Number(item.Value).toFixed(item.Decimals || 0) : "--";
    const lastVal = lastVirtualValues[item.Name];
    const flashClass = lastVal !== undefined && lastVal !== valText ? "class='flash-highlight'" : "";
    lastVirtualValues[item.Name] = valText;

    row.innerHTML = `
      <td><strong>${item.Name}</strong></td>
      <td ${flashClass}>${valText} ${item.Unit || ""}</td>
      <td><span class="tag" style="background: ${item.Ok ? "var(--success-soft)" : "var(--danger-soft)"}; color: ${item.Ok ? "var(--success)" : "var(--danger)"}">${item.Ok ? "正常" : "異常"}</span></td>
    `;
    virtualTable.appendChild(row);
  });

  // 渲染錯誤日誌
  const errorTimeline = document.getElementById("error-timeline");
  errorTimeline.innerHTML = "";
  const errors = data.errors || [];
  if (errors.length === 0) {
    errorTimeline.innerHTML = `<div style="color: var(--muted); text-align: center; padding: 20px 0;">目前無系統錯誤</div>`;
  } else {
    errors.forEach((err) => {
      const el = document.createElement("div");
      el.className = "error-item";
      el.innerHTML = `<span>⚠️ ${err}</span>`;
      errorTimeline.appendChild(el);
    });
  }
}

/**
 * 載入基本設定欄位
 */
function renderAllConfigs() {
  const cfg = configManager.config;
  if (!cfg) return;

  // MQTT
  document.getElementById("broker").value = cfg.broker || "";
  document.getElementById("broker-port").value = cfg.broker_port || "";
  document.getElementById("mqtt-prefix").value = cfg.mqtt_prefix || "";
  document.getElementById("mqtt-qos").value = String(cfg.mqtt_qos ?? 1);
  document.getElementById("mqtt-retain").value = String(cfg.mqtt_retain);
  document.getElementById("publish-interval").value = cfg.publish_interval || "";
  document.getElementById("publish-raw").value = String(cfg.publish_raw);
  document.getElementById("publish-virtual").value = String(cfg.publish_virtual);

  // DDE 基本設定
  document.getElementById("dde-service").value = cfg.dde_service || "view";
  document.getElementById("dde-topic").value = cfg.dde_topic || "tagname";
  document.getElementById("dde-timeout").value = cfg.dde_timeout_ms || 10000;

  // 系統設定
  document.getElementById("web-addr").value = cfg.web_addr || "";
  document.getElementById("web-port").value = cfg.web_port || "";

  // 渲染標籤與虛擬標籤管理列表
  renderOpcTagsEditor();
  renderVirtualTagsEditor();
}

/**
 * 收集表單數值並同步至本地 ConfigManager
 */
function syncFormToConfig() {
  const cfg = configManager.config;
  if (!cfg) return;

  cfg.broker = document.getElementById("broker").value.trim();
  cfg.broker_port = Number(document.getElementById("broker-port").value);
  cfg.mqtt_prefix = document.getElementById("mqtt-prefix").value.trim();
  cfg.mqtt_qos = Number(document.getElementById("mqtt-qos").value);
  cfg.mqtt_retain = document.getElementById("mqtt-retain").value === "true";
  cfg.publish_interval = Number(document.getElementById("publish-interval").value);
  cfg.publish_raw = document.getElementById("publish-raw").value === "true";
  cfg.publish_virtual = document.getElementById("publish-virtual").value === "true";
  cfg.dde_service = document.getElementById("dde-service").value.trim();
  cfg.dde_topic = document.getElementById("dde-topic").value.trim();
  cfg.dde_timeout_ms = Number(document.getElementById("dde-timeout").value);
  cfg.web_addr = document.getElementById("web-addr").value.trim();
  cfg.web_port = Number(document.getElementById("web-port").value);
}

// -------------------------------------------------------------
// OPC Tags CRUD 管理
// -------------------------------------------------------------
function renderOpcTagsEditor() {
  const tbody = document.getElementById("opc-editor-body");
  tbody.innerHTML = "";
  const tags = configManager.config.tags || [];
  tags.forEach((tag, idx) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><input type="text" value="${tag.id}" onchange="updateOpcTag(${idx}, 'id', this.value)" style="padding: 6px 12px;"></td>
      <td><input type="text" value="${tag.dde_item || tag.id}" onchange="updateOpcTag(${idx}, 'dde_item', this.value)" style="padding: 6px 12px;"></td>
      <td>
        <button class="action danger" onclick="deleteOpcTag(${idx})" style="padding: 6px 12px; font-size: 12px;">刪除</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function addOpcTag() {
  configManager.config.tags.push({ id: "NEW_TAG", dde_item: "NEW_TAG", enabled: true, unit: "", decimals: 1 });
  renderOpcTagsEditor();
}

function updateOpcTag(idx, field, value) {
  configManager.config.tags[idx][field] = value.trim();
}

function deleteOpcTag(idx) {
  const tag = configManager.config.tags[idx];
  const isUsed = configManager.config.virtual_tags.some(v => v.formula.some(f => f.tag === tag.id));
  if (isUsed) {
    showToast(`無法刪除：此 Tag 正在被虛擬標籤公式參照！`, "error");
    return;
  }
  configManager.config.tags.splice(idx, 1);
  renderOpcTagsEditor();
}

function openBatchOpcModal() {
  const modal = document.getElementById("modal-batch");
  const textarea = document.getElementById("batch-json-area");
  textarea.value = JSON.stringify(configManager.config.tags, null, 2);
  modal.classList.add("active");
}

function closeBatchModal() {
  document.getElementById("modal-batch").classList.remove("active");
}

function saveBatchOpc() {
  try {
    const data = JSON.parse(document.getElementById("batch-json-area").value);
    if (!Array.isArray(data)) throw new Error("輸入的資料必須是 JSON 陣列");
    configManager.config.tags = data;
    renderOpcTagsEditor();
    closeBatchModal();
    showToast("批次解析成功，請點選下方「儲存並同步」以寫入 Bridge");
  } catch (e) {
    showToast("解析失敗: " + e.message, "error");
  }
}

// -------------------------------------------------------------
// 虛擬標籤 CRUD 與公式編輯器
// -------------------------------------------------------------
let editingVirtualIdx = -1;

function renderVirtualTagsEditor() {
  const container = document.getElementById("virtual-editor-list");
  container.innerHTML = "";
  const vtags = configManager.config.virtual_tags || [];
  
  if (vtags.length === 0) {
    container.innerHTML = `<div style="color: var(--muted); text-align: center; padding: 20px 0;">尚未建立任何虛擬標籤</div>`;
    return;
  }

  vtags.forEach((tag, idx) => {
    const el = document.createElement("div");
    el.className = "panel";
    el.style.marginBottom = "16px";
    
    const formulaStr = tag.formula.map(f => `${f.op}${f.tag}`).join(" ");
    
    el.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: flex-start;">
        <div>
          <h3 style="margin: 0; font-size: 18px;">${tag.name} <span class="tag" style="background: ${tag.enabled ? "var(--success-soft)" : "rgba(148,163,184,0.15)"}; color: ${tag.enabled ? "var(--success)" : "var(--muted)"}">${tag.enabled ? "啟用" : "停用"}</span></h3>
          <div class="helper" style="margin-top: 6px;">單位：${tag.unit || "無"} | 小數位數：${tag.decimals}</div>
          <div style="margin-top: 10px; font-family: monospace; background: var(--input-bg); padding: 8px 12px; border-radius: 8px;">
            公式: <strong style="color: var(--accent);">${formulaStr || "(未設定)"}</strong>
          </div>
        </div>
        <div class="actions" style="margin: 0;">
          <button class="action secondary" onclick="editVirtualTag(${idx})" style="padding: 6px 12px; font-size: 13px;">編輯</button>
          <button class="action danger" onclick="deleteVirtualTag(${idx})" style="padding: 6px 12px; font-size: 13px;">刪除</button>
        </div>
      </div>
    `;
    container.appendChild(el);
  });
}

function openAddVirtualModal() {
  editingVirtualIdx = -1;
  document.getElementById("modal-vtitle").textContent = "新增虛擬標籤";
  document.getElementById("vname").value = "";
  document.getElementById("vunit").value = "";
  document.getElementById("vdecimals").value = "1";
  document.getElementById("venabled").value = "true";
  document.getElementById("formula-steps").innerHTML = "";
  document.getElementById("modal-virtual").classList.add("active");
}

function editVirtualTag(idx) {
  editingVirtualIdx = idx;
  const tag = configManager.config.virtual_tags[idx];
  document.getElementById("modal-vtitle").textContent = "編輯虛擬標籤";
  document.getElementById("vname").value = tag.name;
  document.getElementById("vunit").value = tag.unit || "";
  document.getElementById("vdecimals").value = tag.decimals;
  document.getElementById("venabled").value = String(tag.enabled);
  
  // 載入公式步驟
  const container = document.getElementById("formula-steps");
  container.innerHTML = "";
  tag.formula.forEach(step => {
    addFormulaStepUI(step.op, step.tag);
  });
  
  document.getElementById("modal-virtual").classList.add("active");
}

function closeVirtualModal() {
  document.getElementById("modal-virtual").classList.remove("active");
}

function addFormulaStepUI(op = "+", selectedTag = "") {
  const container = document.getElementById("formula-steps");
  const div = document.createElement("div");
  div.className = "formula-step";
  
  // 建立運算子選單
  let opOptions = `<option value="+">+</option><option value="-">-</option>`;
  if (op === "-") {
    opOptions = `<option value="+">+</option><option value="-" selected>-</option>`;
  }

  // 建立 Raw Tag 下拉選單
  const rawTags = configManager.config.tags || [];
  let tagOptions = rawTags.map(t => `<option value="${t.id}" ${t.id === selectedTag ? "selected" : ""}>${t.id}</option>`).join("");
  
  div.innerHTML = `
    <select class="step-op">${opOptions}</select>
    <select class="step-tag">${tagOptions || "<option value=''>請先新增 DDE 標籤</option>"}</select>
    <button class="action danger" onclick="this.parentElement.remove()" style="padding: 10px; border-radius: 10px; font-weight: bold;">✕</button>
  `;
  container.appendChild(div);
}

function saveVirtualTag() {
  const name = document.getElementById("vname").value.trim();
  const unit = document.getElementById("vunit").value.trim();
  const decimals = Number(document.getElementById("vdecimals").value);
  const enabled = document.getElementById("venabled").value === "true";
  
  if (!name) {
    showToast("虛擬標籤名稱不可為空", "error");
    return;
  }

  // 收集公式步驟
  const formula = [];
  const stepEls = document.querySelectorAll("#formula-steps .formula-step");
  for (let el of stepEls) {
    const op = el.querySelector(".step-op").value;
    const tag = el.querySelector(".step-tag").value;
    if (!tag) {
      showToast("公式項目必須選擇有效的 Raw Tag", "error");
      return;
    }
    formula.push({ op, tag });
  }

  const vtagData = { name, unit, decimals, enabled, formula };

  if (editingVirtualIdx === -1) {
    // 新增
    configManager.config.virtual_tags.push(vtagData);
  } else {
    // 編輯
    configManager.config.virtual_tags[editingVirtualIdx] = vtagData;
  }

  renderVirtualTagsEditor();
  closeVirtualModal();
  showToast("虛擬標籤已暫存，請點選下方「儲存並同步」以寫入 Bridge");
}

function deleteVirtualTag(idx) {
  if (confirm("確定要刪除此虛擬標籤嗎？")) {
    configManager.config.virtual_tags.splice(idx, 1);
    renderVirtualTagsEditor();
  }
}

// -------------------------------------------------------------
// 後端 API 操作與輪詢
// -------------------------------------------------------------
async function refreshStatus() {
  try {
    const data = await fetchJSON("/api/status");
    renderStatus(data);
  } catch (e) {
    console.error("更新狀態失敗: ", e);
  }
}

async function doRead() {
  try {
    await fetchJSON("/api/action/read", { method: "POST" });
    showToast("成功觸發手動 DDE 讀取");
    await refreshStatus();
  } catch (e) {
    showToast("讀取失敗: " + e.message, "error");
  }
}

async function doPublish() {
  try {
    await fetchJSON("/api/action/publish", { method: "POST" });
    showToast("成功觸發手動 MQTT 發布");
    await refreshStatus();
  } catch (e) {
    showToast("發布失敗: " + e.message, "error");
  }
}

// -------------------------------------------------------------
// 頁面初始化
// -------------------------------------------------------------
window.addEventListener("DOMContentLoaded", async () => {
  initTheme();
  
  configManager = new ConfigManager();
  await configManager.load();
  renderAllConfigs();
  
  await refreshStatus();
  setInterval(refreshStatus, 5000);
});
