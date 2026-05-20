export interface CurlParseResult {
  name: string;
  provider_type: "openai_compat" | "custom";
  base_url: string;
  api_key: string;
  config: string;
  detected: {
    method: string;
    endpoint: string;
    contentType: string;
    hasAuth: boolean;
    promptField: string | null;
    modelField: string | null;
    isAsync: boolean;
  };
}

function normalize(lines: string[]): string[] {
  const out: string[] = [];
  let carry = "";
  for (let raw of lines) {
    raw = raw.trimEnd();
    if (raw.endsWith("\\") || raw.endsWith("^")) {
      carry += raw.slice(0, -1) + " ";
    } else {
      out.push(carry + raw);
      carry = "";
    }
  }
  if (carry) out.push(carry);
  return out;
}

function tokenize(line: string): string[] {
  const tokens: string[] = [];
  let i = 0;
  while (i < line.length) {
    if (line[i] === " " || line[i] === "\t") { i++; continue }
    if (line[i] === "'") {
      let j = i + 1;
      while (j < line.length && line[j] !== "'") j++;
      tokens.push(line.slice(i + 1, j));
      i = j + 1;
    } else if (line[i] === '"') {
      let j = i + 1;
      while (j < line.length) {
        if (line[j] === "\\" && j + 1 < line.length) { j += 2; continue }
        if (line[j] === '"') break;
        j++;
      }
      tokens.push(line.slice(i + 1, j));
      i = j + 1;
    } else {
      let j = i;
      while (j < line.length && line[j] !== " " && line[j] !== "\t") j++;
      tokens.push(line.slice(i, j));
      i = j;
    }
  }
  return tokens;
}

function parseUrl(raw: string): { baseUrl: string; endpoint: string } {
  try {
    const u = new URL(raw);
    const baseUrl = `${u.protocol}//${u.host}`;
    const endpoint = u.pathname + u.search;
    return { baseUrl, endpoint };
  } catch {
    return { baseUrl: "", endpoint: raw };
  }
}

function extractHostname(raw: string): string {
  try {
    const u = new URL(raw);
    return u.hostname;
  } catch {
    return raw;
  }
}

function buildConfigForSync(result: {
  method: string;
  endpoint: string;
  headers: Record<string, string>;
  requestTemplate: string;
}): string {
  const cfg: Record<string, unknown> = {
    endpoint: result.endpoint,
    method: result.method,
    headers: result.headers,
    request_template: result.requestTemplate,
    response_path: "data.0.url",
    image_type: "url",
  };
  return JSON.stringify(cfg, null, 2);
}

function buildConfigForAsync(result: {
  method: string;
  endpoint: string;
  headers: Record<string, string>;
  requestTemplate: string;
}): string {
  const cfg: Record<string, unknown> = {
    endpoint: result.endpoint,
    method: result.method,
    headers: result.headers,
    request_template: result.requestTemplate,
    response_path: "data.0.url",
    image_type: "url",
    async_mode: true,
    task_id_path: "data.task_id",
    poll_endpoint: "",
    poll_method: "GET",
    poll_field: "task_id",
    poll_field_position: "query",
    poll_status_path: "data.status",
    poll_completed_values: ["completed", "success", "succeeded"],
    poll_failed_values: ["failed", "error"],
    poll_result_path: "data.0.url",
    poll_result_type: "url",
    poll_interval: 2.0,
    max_polls: 150,
  };
  return JSON.stringify(cfg, null, 2);
}

function detectProviderType(
  endpoint: string,
  bodyJson: Record<string, unknown> | null,
  contentType: string,
): "openai_compat" | "custom" {
  const ep = endpoint.toLowerCase();
  if (
    ep.includes("/chat/completions") ||
    ep.includes("/v1/images") ||
    ep.includes("/v1/chat") ||
    ep.includes("/embeddings")
  ) {
    return "openai_compat";
  }
  if (bodyJson) {
    const keys = Object.keys(bodyJson);
    if (keys.some((k) => ["n", "size", "quality", "style", "response_format"].includes(k))) {
      return "openai_compat";
    }
  }
  return "custom";
}

function isAsyncEndpoint(endpoint: string): boolean {
  return endpoint.toLowerCase().includes("async");
}

export function parseCurl(input: string): CurlParseResult | { error: string } {
  const lines = input.split("\n");
  const joined = normalize(lines);
  const tokens = tokenize(joined.join(" "));

  let method = "GET";
  let rawUrl = "";
  const headers: Record<string, string> = {};
  let bodyRaw = "";

  const dataFlags = new Set(["--data", "-d", "--data-raw", "--data-binary"]);

  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i];

    if (tok === "--request" || tok === "-X") {
      method = (tokens[++i] || "GET").toUpperCase();
    } else if (tok === "--url") {
      rawUrl = tokens[++i] || "";
    } else if (tok === "--header" || tok === "-H") {
      const hv = tokens[++i] || "";
      const colonIdx = hv.indexOf(":");
      if (colonIdx > 0) {
        const hk = hv.slice(0, colonIdx).trim();
        const hv2 = hv.slice(colonIdx + 1).trim();
        if (hk) headers[hk] = hv2;
      }
    } else if (dataFlags.has(tok)) {
      bodyRaw = tokens[++i] || "";
    } else if (tok === "curl") {
      continue;
    } else if (!tok.startsWith("-") && !rawUrl) {
      rawUrl = tok;
    }
  }

  if (!rawUrl) {
    return { error: "NO_URL" };
  }

  const { baseUrl, endpoint } = parseUrl(rawUrl);
  if (!baseUrl) {
    return { error: "BAD_URL" };
  }

  let apiKey = "";
  const authHeader = headers["Authorization"] || headers["authorization"] || "";
  if (authHeader) {
    const match = authHeader.match(/^(?:Bearer\s+)?(.+)$/);
    const val = match ? match[1] : authHeader;
    const cleaned = val.replace(/\$\{[^}]+\}/g, "").trim();
    if (!cleaned.includes("<") && !cleaned.includes("{{") && cleaned.length > 0) {
      apiKey = cleaned;
    }
    if (!headers["Authorization"]) {
      headers["Authorization"] = authHeader;
    }
  } else {
    for (const hk of Object.keys(headers)) {
      const lk = hk.toLowerCase();
      if (lk === "x-api-key" || lk === "api-key") {
        const val = headers[hk];
        const cleaned = val.replace(/\$\{[^}]+\}/g, "").trim();
        if (!cleaned.includes("<") && !cleaned.includes("{{") && cleaned.length > 0) {
          apiKey = cleaned;
        }
        break;
      }
    }
  }

  if (!headers["Authorization"] && apiKey) {
    headers["Authorization"] = `Bearer ${apiKey}`;
  }

  const contentType = headers["Content-Type"] || headers["content-type"] || "application/json";

  let bodyJson: Record<string, unknown> | null = null;
  if (bodyRaw) {
    try {
      bodyJson = JSON.parse(bodyRaw);
    } catch {
      try {
        bodyJson = JSON.parse(bodyRaw.replace(/'/g, '"'));
      } catch {
        bodyJson = null;
      }
    }
  }

  let requestTemplate = bodyRaw;
  let promptField: string | null = null;
  let modelField: string | null = null;

  if (bodyJson) {
    const clean = { ...bodyJson };
    for (const key of Object.keys(clean)) {
      const val = String(clean[key]);
      if (key === "prompt" || key === "prompt_en") {
        promptField = key;
        clean[key] = "{{prompt}}";
      } else if (key === "model" || key === "model_id") {
        modelField = key;
        clean[key] = "{{model}}";
      } else if (val === "<string>" || val === "<text>" || val === "") {
        clean[key] = `{{${key}}}`;
      } else if (val.startsWith("<") && val.endsWith(">")) {
        clean[key] = `{{${key}}}`;
      }
    }
    requestTemplate = JSON.stringify(clean, null, 2);
  }

  const isAsync = isAsyncEndpoint(endpoint);
  const providerType = detectProviderType(endpoint, bodyJson, contentType);

  let config = "{}";
  const hostname = extractHostname(rawUrl);
  const name = hostname || "Imported Provider";

  if (providerType === "custom") {
    const reqHeaders: Record<string, string> = {};
    if (contentType) reqHeaders["Content-Type"] = contentType;
    if (apiKey) reqHeaders["Authorization"] = `Bearer {{api_key}}`;

    if (isAsync) {
      config = buildConfigForAsync({ method, endpoint, headers: reqHeaders, requestTemplate });
    } else {
      config = buildConfigForSync({ method, endpoint, headers: reqHeaders, requestTemplate });
    }
  }

  return {
    name: name.charAt(0).toUpperCase() + name.slice(1),
    provider_type: providerType,
    base_url: baseUrl,
    api_key: apiKey,
    config,
    detected: {
      method,
      endpoint,
      contentType,
      hasAuth: !!apiKey,
      promptField,
      modelField,
      isAsync,
    },
  };
}
