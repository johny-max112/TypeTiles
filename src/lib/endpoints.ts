export type BackendEndpoints = {
  apiUrl: string;
  webSocketUrl: string;
  backendOrigin: string;
};

export type EndpointOptions = {
  apiUrl?: string;
  hostAddress?: string;
  pageProtocol: string;
  pageHostname: string;
};

export class EndpointConfigurationError extends Error {
  constructor(message: string) { super(message); this.name = "EndpointConfigurationError"; }
}

function parseEndpoint(value: string, label: string): URL {
  if (!value || /[\s\\]/.test(value) || !/^[a-z][a-z0-9+.-]*:\/\/[^/]/i.test(value)) {
    throw new EndpointConfigurationError(`${label} must be a valid URL without spaces or backslashes.`);
  }
  let url: URL;
  try { url = new URL(value); }
  catch { throw new EndpointConfigurationError(`${label} is invalid. Include a hostname and a valid port if needed.`); }
  if (!url.hostname || url.username || url.password || url.search || url.hash || url.port === "0") {
    throw new EndpointConfigurationError(`${label} cannot contain credentials, query parameters, fragments, or port zero.`);
  }
  return url;
}

/** One backend serves REST authentication and classroom sockets. Never switch only the socket server. */
export function resolveBackendEndpoints(options: EndpointOptions): BackendEndpoints {
  if (!["http:", "https:"].includes(options.pageProtocol)) {
    throw new EndpointConfigurationError("Open Type Tiles through an HTTP or HTTPS web server.");
  }
  let apiValue = options.apiUrl;
  if (apiValue === undefined) {
    if (options.pageProtocol === "https:") {
      throw new EndpointConfigurationError("Configure VITE_API_URL with your HTTPS backend API URL, then rebuild the frontend.");
    }
    apiValue = `http://${options.pageHostname}:3001/api`;
  }
  const api = parseEndpoint(apiValue.trim(), "VITE_API_URL");
  if (!["http:", "https:"].includes(api.protocol) || !["/", "/api", "/api/"].includes(api.pathname)) {
    throw new EndpointConfigurationError("VITE_API_URL must use http:// or https:// and the backend root or /api path.");
  }
  if (options.pageProtocol === "https:" && api.protocol !== "https:") {
    throw new EndpointConfigurationError("An HTTPS frontend requires an HTTPS backend. Use an HTTP-served local frontend for HTTP LAN play.");
  }
  if (options.hostAddress !== undefined) {
    const value = options.hostAddress.trim();
    if (!value || value.startsWith("/")) {
      throw new EndpointConfigurationError("Enter the configured backend hostname or its complete HTTP/WebSocket URL.");
    }
    const host = parseEndpoint(value.includes("://") ? value : `${api.protocol}//${value}`, "Classroom host");
    if (!["http:", "https:", "ws:", "wss:"].includes(host.protocol)
      || !["/", "/api", "/api/", "/ws", "/ws/"].includes(host.pathname)) {
      throw new EndpointConfigurationError("Classroom host must use HTTP(S) or WS(S), with no path other than /api or /ws.");
    }
    host.protocol = host.protocol === "wss:" ? "https:" : host.protocol === "ws:" ? "http:" : host.protocol;
    if (options.pageProtocol === "https:" && host.protocol === "http:") {
      throw new EndpointConfigurationError("An HTTPS page cannot connect to an insecure LAN socket. Use the secure backend or an HTTP-served local frontend.");
    }
    if (host.origin !== api.origin) {
      throw new EndpointConfigurationError("Classroom host must match the login API backend. For another LAN server, configure VITE_API_URL for that server, restart the frontend, and log in there.");
    }
  }
  return {
    apiUrl: `${api.origin}/api`,
    webSocketUrl: `${api.protocol === "https:" ? "wss:" : "ws:"}//${api.host}/ws`,
    backendOrigin: api.origin,
  };
}

/** Browser adapter; the resolver above stays independent of Vite, DOM state, and storage. */
export function getBackendEndpoints(hostAddress?: string): BackendEndpoints {
  return resolveBackendEndpoints({
    apiUrl: import.meta.env.VITE_API_URL,
    hostAddress,
    pageProtocol: window.location.protocol,
    pageHostname: window.location.hostname,
  });
}

export const CLASSROOM_ROOM_KEY = "type_tiles_lan_room_code";
export const CLASSROOM_ENDPOINT_KEY = "type_tiles_lan_room_endpoint";

/** Unscoped legacy room codes are not automatically joined on a potentially different backend. */
export function getSavedClassroomConnection(storage: Pick<Storage, "getItem">): { roomCode: string; hostAddress: string } | null {
  const roomCode = storage.getItem(CLASSROOM_ROOM_KEY);
  const hostAddress = storage.getItem(CLASSROOM_ENDPOINT_KEY);
  return roomCode && hostAddress ? { roomCode, hostAddress } : null;
}
