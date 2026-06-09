type RuntimeLocation = {
  hostname: string;
  port: string;
  protocol: string;
};

type RuntimeOriginOptions = {
  apiBaseUrl?: string;
  configuredVitePort?: string;
  isViteDevServer?: boolean;
  location?: RuntimeLocation;
};

function trimApiBaseUrl(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : null;
}

function resolveConfiguredApiOrigin(value: string | undefined) {
  const configured = trimApiBaseUrl(value);
  if (!configured) {
    return null;
  }

  try {
    return new URL(configured).origin;
  } catch {
    throw new Error("Invalid VITE_API_BASE_URL; expected an absolute API origin.");
  }
}

function buildOrigin(location: RuntimeLocation) {
  return `${location.protocol}//${location.hostname}${location.port ? `:${location.port}` : ""}`;
}

function isViteLikePort(port: string, configuredVitePort?: string) {
  const resolvedVitePort = configuredVitePort?.trim();
  return port === resolvedVitePort || /^517\d*$/u.test(port);
}

export function resolveBrowserApiOrigin(
  location: RuntimeLocation,
  configuredVitePort?: string,
  isViteDevServer = false
) {
  if (isViteDevServer) {
    return buildOrigin(location);
  }

  if (isViteLikePort(location.port, configuredVitePort)) {
    return `${location.protocol}//${location.hostname}:3000`;
  }

  return buildOrigin(location.port ? location : { ...location, port: "3000" });
}

export function buildRuntimeApiUrl(path: string, options: RuntimeOriginOptions = {}) {
  const configuredApiOrigin = resolveConfiguredApiOrigin(options.apiBaseUrl);
  if (configuredApiOrigin) {
    return `${configuredApiOrigin}${path}`;
  }

  if (options.isViteDevServer) {
    return path;
  }

  if (!options.location) {
    return `http://localhost:3000${path}`;
  }

  return `${resolveBrowserApiOrigin(
    options.location,
    options.configuredVitePort,
    false
  )}${path}`;
}

export function resolveRuntimeSocketOrigin(options: RuntimeOriginOptions = {}) {
  const configuredApiOrigin = resolveConfiguredApiOrigin(options.apiBaseUrl);
  if (configuredApiOrigin) {
    return configuredApiOrigin;
  }

  if (!options.location) {
    return "http://localhost:3000";
  }

  return resolveBrowserApiOrigin(
    options.location,
    options.configuredVitePort,
    options.isViteDevServer
  );
}

export function buildRuntimeUploadedMediaUrl(path: string, options: RuntimeOriginOptions = {}) {
  const configuredApiOrigin = resolveConfiguredApiOrigin(options.apiBaseUrl);
  if (configuredApiOrigin) {
    return `${configuredApiOrigin}${path}`;
  }

  if (!options.location) {
    return `http://localhost:3000${path}`;
  }

  if (options.isViteDevServer) {
    return `${buildOrigin(options.location)}${path}`;
  }

  return `${resolveBrowserApiOrigin(
    options.location,
    options.configuredVitePort,
    false
  )}${path}`;
}
