export function createLocalConfigView({ onConfigLoaded, onLog }) {
  let currentConfig = null;

  function log(message, type = "info") {
    onLog?.(message, type);
    const logContainer = document.getElementById("local-log-list");
    if (!logContainer) return;
    const item = document.createElement("div");
    item.className = `log-entry log-entry--${type}`;
    const time = new Date().toLocaleTimeString();
    item.textContent = `[${time}] ${message}`;
    logContainer.prepend(item);
    while (logContainer.children.length > 50) {
      logContainer.lastElementChild.remove();
    }
  }

  async function loadConfig() {
    const statusEl = document.getElementById("local-config-status");
    if (statusEl) statusEl.textContent = "讀取本機設定中...";
    try {
      const resp = await fetch("/api/local-config");
      const data = await resp.json();
      if (!data.ok) throw new Error(data.error || "讀取失敗");
      currentConfig = data.config;
      renderConfigToUI(currentConfig);
      const facCount = Array.isArray(currentConfig.factories) ? currentConfig.factories.length : 0;
      const ids = Array.isArray(currentConfig.factories) ? currentConfig.factories.map((f) => f.factory_id).join(", ") : "";
      if (statusEl) statusEl.textContent = `已載入 ${facCount} 廠區 [${ids}] (${data.path ? data.path.split(/[\\/]/).pop() : "solar_config.json"}) ✓`;
      log(`成功讀取本機設定檔，共 ${facCount} 廠區 [${ids}]`, "success");
      onConfigLoaded?.(currentConfig);
    } catch (err) {
      if (statusEl) statusEl.textContent = `讀取失敗: ${err.message}`;
      log(`讀取本機設定失敗: ${err.message}`, "error");
    }
  }

  async function saveConfig() {
    const statusEl = document.getElementById("local-config-status");
    const jsonEditor = document.getElementById("local-raw-json-textarea");
    if (!jsonEditor) return;
    let configPayload;
    try {
      configPayload = JSON.parse(jsonEditor.value);
    } catch (err) {
      if (statusEl) statusEl.textContent = `JSON 格式錯誤: ${err.message}`;
      log(`JSON 語法錯誤: ${err.message}`, "error");
      alert("儲存失敗：JSON 格式有誤，請檢查語法！");
      return;
    }
    if (statusEl) statusEl.textContent = "儲存中...";
    try {
      const resp = await fetch("/api/local-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config: configPayload }),
      });
      const data = await resp.json();
      if (!data.ok) throw new Error(data.error || "儲存失敗");
      currentConfig = configPayload;
      renderConfigToUI(currentConfig);
      if (statusEl) statusEl.textContent = "儲存成功！設定已寫入並即時生效 ✓";
      log("成功儲存 solar_config.json 並套用至運行服務！", "success");
    } catch (err) {
      if (statusEl) statusEl.textContent = `儲存失敗: ${err.message}`;
      log(`儲存設定失敗: ${err.message}`, "error");
    }
  }

  function syncConfigToJsonEditor() {
    const jsonEditor = document.getElementById("local-raw-json-textarea");
    if (jsonEditor && currentConfig) {
      jsonEditor.value = JSON.stringify(currentConfig, null, 4);
    }
  }

  function renderConfigToUI(cfg) {
    if (!cfg) return;
    currentConfig = cfg;
    syncConfigToJsonEditor();

    const container = document.getElementById("local-factories-container");
    if (!container) return;
    container.replaceChildren();

    const factories = Array.isArray(cfg.factories) ? cfg.factories : [];
    factories.forEach((fac, idx) => {
      const card = document.createElement("div");
      card.className = "local-factory-card";

      // Header
      const header = document.createElement("div");
      header.className = "local-factory-card__header";

      const titleGroup = document.createElement("div");
      titleGroup.style.display = "flex";
      titleGroup.style.alignItems = "center";
      titleGroup.style.gap = "6px";

      const icon = document.createElement("span");
      icon.textContent = "🏢";
      const title = document.createElement("strong");
      title.textContent = `${fac.factory_id || `廠區 #${idx + 1}`}`;
      titleGroup.appendChild(icon);
      titleGroup.appendChild(title);
      header.appendChild(titleGroup);

      if (factories.length > 1) {
        const delBtn = document.createElement("button");
        delBtn.className = "icon-btn icon-btn--small icon-btn--danger";
        delBtn.type = "button";
        delBtn.title = "刪除此廠區";
        delBtn.textContent = "🗑️ 刪除";
        delBtn.addEventListener("click", () => {
          if (confirm(`確定要刪除廠區 [${fac.factory_id}] 嗎？`)) {
            cfg.factories.splice(idx, 1);
            renderConfigToUI(cfg);
            log(`已從設定中移除廠區 [${fac.factory_id}]`, "info");
          }
        });
        header.appendChild(delBtn);
      }

      // Fields
      const fields = document.createElement("div");
      fields.className = "local-factory-card__fields";

      const createField = (labelIcon, labelText, value, onUpdate, isPassword = false) => {
        const row = document.createElement("label");
        row.className = "local-field-row";
        const lbl = document.createElement("span");
        lbl.textContent = `${labelIcon} ${labelText}`;
        const inputWrap = document.createElement("div");
        inputWrap.style.display = "flex";
        inputWrap.style.gap = "4px";
        inputWrap.style.alignItems = "center";

        const inp = document.createElement("input");
        inp.value = value || "";
        inp.autocomplete = "off";
        inp.style.flex = "1";
        if (isPassword) inp.type = "password";

        inp.addEventListener("input", () => {
          onUpdate(inp.value);
          syncConfigToJsonEditor();
        });
        inputWrap.appendChild(inp);

        if (isPassword) {
          const toggleBtn = document.createElement("button");
          toggleBtn.type = "button";
          toggleBtn.className = "icon-btn icon-btn--small";
          toggleBtn.textContent = "👁️";
          toggleBtn.title = "顯示/隱藏密碼";
          toggleBtn.addEventListener("click", () => {
            inp.type = inp.type === "password" ? "text" : "password";
          });
          inputWrap.appendChild(toggleBtn);
        }

        row.appendChild(lbl);
        row.appendChild(inputWrap);
        return row;
      };

      fields.appendChild(createField("🏷️", "廠別代碼", fac.factory_id, (v) => {
        fac.factory_id = v;
        title.textContent = v || `廠區 #${idx + 1}`;
      }));
      fields.appendChild(createField("🌐", "來源 IP / 網址", fac.base_url, (v) => { fac.base_url = v; }));
      fields.appendChild(createField("👤", "登入帳號", fac.login_user, (v) => { fac.login_user = v; }));
      fields.appendChild(createField("🔒", "登入密碼", fac.login_pass, (v) => { fac.login_pass = v; }, true));

      // Actions & Test Badge
      const actions = document.createElement("div");
      actions.className = "local-factory-card__actions";

      const testBtn = document.createElement("button");
      testBtn.className = "icon-btn icon-btn--small icon-btn--test";
      testBtn.type = "button";
      testBtn.textContent = "⚡ 測試連線";

      const testResult = document.createElement("span");
      testResult.className = "test-result-badge";

      testBtn.addEventListener("click", async () => {
        testBtn.disabled = true;
        testResult.textContent = "連線中...";
        testResult.className = "test-result-badge testing";
        log(`正在測試 [${fac.factory_id}] 連線 (${fac.base_url})...`);
        try {
          const resp = await fetch("/api/test-login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              factory_id: fac.factory_id,
              base_url: fac.base_url,
              login_user: fac.login_user,
              login_pass: fac.login_pass,
            }),
          });
          const res = await resp.json();
          if (res.ok) {
            testResult.textContent = `✓ 成功 (${res.latency_ms}ms)`;
            testResult.className = "test-result-badge success";
            log(`[${fac.factory_id}] 連線成功！耗時 ${res.latency_ms}ms`, "success");
          } else {
            testResult.textContent = `✕ 失敗: ${res.error || "未知錯誤"}`;
            testResult.className = "test-result-badge error";
            log(`[${fac.factory_id}] 連線失敗: ${res.error || "未知錯誤"}`, "error");
          }
        } catch (err) {
          testResult.textContent = `✕ 連線異常: ${err.message}`;
          testResult.className = "test-result-badge error";
          log(`[${fac.factory_id}] 連線異常: ${err.message}`, "error");
        } finally {
          testBtn.disabled = false;
        }
      });

      actions.appendChild(testBtn);
      actions.appendChild(testResult);

      card.appendChild(header);
      card.appendChild(fields);
      card.appendChild(actions);
      container.appendChild(card);
    });

    // Populate Global Parameters
    const intervalInp = document.getElementById("local-global-interval");
    if (intervalInp) {
      intervalInp.value = cfg.interval ?? 60;
      intervalInp.oninput = () => { cfg.interval = Number(intervalInp.value); syncConfigToJsonEditor(); };
    }
    const hbInp = document.getElementById("local-global-heartbeat");
    if (hbInp) {
      hbInp.value = cfg.heartbeat_interval ?? 30;
      hbInp.oninput = () => { cfg.heartbeat_interval = Number(hbInp.value); syncConfigToJsonEditor(); };
    }
    const nightCheck = document.getElementById("local-global-nightpause");
    if (nightCheck) {
      nightCheck.checked = Boolean(cfg.night_pause);
      nightCheck.onchange = () => { cfg.night_pause = nightCheck.checked; syncConfigToJsonEditor(); };
    }
    const zeroMinInp = document.getElementById("local-global-zeromin");
    if (zeroMinInp) {
      zeroMinInp.value = cfg.anomaly_daytime_zero_minutes ?? 5;
      zeroMinInp.oninput = () => { cfg.anomaly_daytime_zero_minutes = Number(zeroMinInp.value); syncConfigToJsonEditor(); };
    }
  }

  function addFactory() {
    if (!currentConfig) return;
    if (!Array.isArray(currentConfig.factories)) currentConfig.factories = [];
    const nextIdx = currentConfig.factories.length + 1;
    const newFac = {
      factory_id: `SITE_${nextIdx}`,
      base_url: "http://192.168.1.100",
      login_user: "toyota",
      login_pass: "toyota",
    };
    currentConfig.factories.push(newFac);
    renderConfigToUI(currentConfig);
    log(`已新增廠區 [${newFac.factory_id}]，請編輯 IP 後儲存`, "info");
  }

  async function triggerScrapeNow(factoryId) {
    log(`正在對 [${factoryId}] 發起立即擷取...`);
    try {
      const resp = await fetch("/api/scrape-now", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ factory_id: factoryId }),
      });
      const data = await resp.json();
      if (!data.ok) throw new Error(data.error || "擷取失敗");
      log(`[${factoryId}] 立即擷取成功！總功率: ${data.summary?.total_power_kw || 0} kW, ${data.zones?.length || 0} 分區`, "success");
      return data;
    } catch (err) {
      log(`[${factoryId}] 立即擷取失敗: ${err.message}`, "error");
      throw err;
    }
  }

  function exportCSV(factoryId, zones) {
    if (!zones || zones.length === 0) {
      alert("目前尚無分區資料可匯出");
      return;
    }
    const headers = ["Zone ID", "區域名稱", "即時功率(kW)", "今日發電(kWh)", "本月發電(MWh)", "累積發電(MWh)", "裝置容量(kWp)", "等效時數(h)"];
    const rows = zones.map((z) => [
      z.zone_id ?? "",
      `"${(z.name || "").replace(/"/g, '""')}"`,
      z.power_kw ?? "",
      z.today_kwh ?? "",
      z.month_mwh ?? "",
      z.total_mwh ?? "",
      z.capacity_kwp ?? "",
      z.today_hours ?? "",
    ]);
    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `solar_${factoryId}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    log(`已匯出 ${factoryId} 分區報表 CSV`, "info");
  }

  function init() {
    document.getElementById("local-config-load-btn")?.addEventListener("click", loadConfig);
    document.getElementById("local-config-save-btn")?.addEventListener("click", saveConfig);
    document.getElementById("local-add-factory-btn")?.addEventListener("click", addFactory);
    document.getElementById("local-clear-log-btn")?.addEventListener("click", () => {
      const list = document.getElementById("local-log-list");
      if (list) list.replaceChildren();
      log("日誌已清除", "info");
    });
    document.getElementById("local-format-json-btn")?.addEventListener("click", () => {
      const textarea = document.getElementById("local-raw-json-textarea");
      if (!textarea) return;
      try {
        const obj = JSON.parse(textarea.value);
        textarea.value = JSON.stringify(obj, null, 4);
        renderConfigToUI(obj);
        log("JSON 排版格式化完成", "info");
      } catch (err) {
        log(`JSON 格式錯誤: ${err.message}`, "error");
      }
    });

    // Drawer Top Tab Switching
    const drawerTabs = document.querySelectorAll(".drawer-nav-btn");
    const drawerSections = document.querySelectorAll(".drawer-tab-section");
    drawerTabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        const targetId = tab.dataset.targetSection;
        drawerTabs.forEach((t) => t.classList.toggle("active", t === tab));
        drawerSections.forEach((s) => {
          s.hidden = s.id !== targetId;
        });
      });
    });

    loadConfig();
  }

  return {
    init,
    loadConfig,
    saveConfig,
    addFactory,
    triggerScrapeNow,
    exportCSV,
    log,
  };
}
