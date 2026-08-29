import { FACTORIES } from "./factory-view.js";

const MQTT_PATH = "/mqtt";

function isLoopbackHost(host) {
  const normalized = String(host || "").trim().toLowerCase().replace(/^\[|\]$/g, "");
  return normalized === "localhost" || normalized === "127.0.0.1" || normalized === "::1";
}

export function factoryDataTopics(prefix, factoryId) {
  const base = `${prefix}/${factoryId}`;
  return [
    `${base}/summary`,
    `${base}/total_power_kw`,
    `${base}/today_mwh`,
    `${base}/month_mwh`,
    `${base}/total_mwh`,
    `${base}/zone/#`,
    `${base}/status`,
    `${base}/heartbeat`,
    `${base}/alert`,
    `${base}/state/config`,
    `${base}/state/control-result`,
  ];
}

export function renderSubscriptions(prefix, sentByFactory) {
  FACTORIES.forEach((factoryId) => {
    const list = document.querySelector(`[data-subscription-list="${factoryId}"]`);
    const status = document.querySelector(`[data-subscription-status="${factoryId}"]`);
    if (list) {
      list.replaceChildren();
      factoryDataTopics(prefix, factoryId).forEach((topic) => {
        const item = document.createElement("li");
        item.textContent = topic;
        list.appendChild(item);
      });
    }
    if (status) {
      const value = sentByFactory.get(factoryId) ? "subscription-sent" : "not-subscribed";
      status.dataset.subscriptionState = value;
      status.textContent = value;
    }
    const command = document.getElementById(`quick-sub-cmd-${factoryId.toLowerCase()}`);
    if (command) command.textContent = `mosquitto_sub -h localhost -p 1883 -v -t '${prefix}/${factoryId}/#'`;
  });
}

export function createMqttManager({ getConnectionSettings, onState, onMessage, onSubscriptions }) {
  let client = null;
  let activePrefix = "solar";
  let userDisconnected = false;
  let connectionState = "disconnected";
  let clientGeneration = 0;
  const sentByFactory = new Map(FACTORIES.map((factoryId) => [factoryId, false]));

  function isCurrent(generation, currentClient) {
    return generation === clientGeneration && client === currentClient;
  }

  function setState(nextState, message, generation = clientGeneration, currentClient = client) {
    if (!isCurrent(generation, currentClient)) return;
    connectionState = nextState;
    onState(nextState, message);
  }

  function resetSubscriptionState() {
    FACTORIES.forEach((factoryId) => sentByFactory.set(factoryId, false));
    onSubscriptions(activePrefix, sentByFactory);
  }

  function subscribeFactoryTopics(prefix = activePrefix, generation = clientGeneration, currentClient = client) {
    if (connectionState !== "connected" || !isCurrent(generation, currentClient)) return;
    FACTORIES.forEach((factoryId) => {
      factoryDataTopics(prefix, factoryId).forEach((topic) => currentClient.subscribe(topic));
      sentByFactory.set(factoryId, true);
    });
    onSubscriptions(activePrefix, sentByFactory);
  }

  function unsubscribeFactoryTopics(prefix, generation = clientGeneration, currentClient = client) {
    if (connectionState !== "connected" || !isCurrent(generation, currentClient)) return;
    FACTORIES.forEach((factoryId) => {
      factoryDataTopics(prefix, factoryId).forEach((topic) => currentClient.unsubscribe(topic));
      sentByFactory.set(factoryId, false);
    });
    onSubscriptions(activePrefix, sentByFactory);
  }

  function connect() {
    const settings = getConnectionSettings();
    activePrefix = settings.prefix || "solar";
    userDisconnected = false;
    resetSubscriptionState();
    const previousClient = client;
    client = null;
    clientGeneration += 1;
    const generation = clientGeneration;
    if (previousClient) {
      try { previousClient.end(true); } catch (_) { /* the new client replaces it */ }
    }
    setState("connecting", "連線中...", generation, null);
    const protocol = isLoopbackHost(settings.host) ? "ws://" : "wss://";
    const url = `${protocol}${settings.host}:${settings.port}${MQTT_PATH}`;
    const options = { clientId: settings.clientId, clean: true, reconnectPeriod: 3000, resubscribe: false };
    // Credentials are read and held by this manager only for this connection.
    if (settings.username) options.username = settings.username;
    if (settings.password) options.password = settings.password;

    const mqttLib = globalThis.mqtt || window.mqtt;
    if (!mqttLib || typeof mqttLib.connect !== "function") {
      resetSubscriptionState();
      if (!userDisconnected) {
        setState("error", "未載入 MQTT 客戶端庫", generation, null);
      }
      return;
    }

    try {
      client = mqttLib.connect(url, options);
    } catch (err) {
      resetSubscriptionState();
      if (!userDisconnected) {
        setState("error", `錯誤: ${err.message || "連線異常"}`, generation, null);
      }
      return;
    }

    const currentClient = client;
    currentClient.on("connect", () => {
      if (!isCurrent(generation, currentClient)) return;
      setState("connected", "已連線", generation, currentClient);
      subscribeFactoryTopics(activePrefix, generation, currentClient);
    });
    currentClient.on("reconnect", () => {
      if (isCurrent(generation, currentClient)) setState("reconnecting", "重新連線中...", generation, currentClient);
    });
    currentClient.on("close", () => {
      if (!isCurrent(generation, currentClient)) return;
      resetSubscriptionState();
      if (!userDisconnected) {
        if (connectionState !== "error") setState("disconnected", "連線中斷", generation, currentClient);
      }
    });
    currentClient.on("offline", () => {
      if (!isCurrent(generation, currentClient)) return;
      resetSubscriptionState();
      if (!userDisconnected) {
        setState("disconnected", "離線", generation, currentClient);
      }
    });
    currentClient.on("error", (error) => {
      if (!isCurrent(generation, currentClient)) return;
      resetSubscriptionState();
      if (!userDisconnected) {
        setState("error", `錯誤: ${error.message || "連線異常"}`, generation, currentClient);
      }
    });
    currentClient.on("message", (topic, payload) => {
      if (isCurrent(generation, currentClient)) onMessage(topic, payload);
    });
  }

  function updateActivePrefix(nextPrefix) {
    const trimmed = String(nextPrefix || "").trim();
    if (!trimmed || trimmed === activePrefix) return;
    const oldPrefix = activePrefix;
    activePrefix = trimmed;
    if (connectionState === "connected" && client) {
      unsubscribeFactoryTopics(oldPrefix, clientGeneration, client);
      subscribeFactoryTopics(activePrefix, clientGeneration, client);
    } else {
      resetSubscriptionState();
    }
    onSubscriptions(activePrefix, sentByFactory);
  }

  function disconnect() {
    userDisconnected = true;
    const previousClient = client;
    client = null;
    clientGeneration += 1;
    if (previousClient) {
      try { previousClient.end(true); } catch (_) { /* already closed */ }
    }
    resetSubscriptionState();
    setState("disconnected", "已由使用者中斷", clientGeneration, null);
  }

  return {
    connect,
    disconnect,
    updateActivePrefix,
    isConnected: () => connectionState === "connected",
    publish: (topic, payload) => connectionState === "connected" && client?.publish(topic, payload),
    get activePrefix() { return activePrefix; },
    get client() { return connectionState === "connected" ? client : null; },
    factoryDataTopics,
  };
}
