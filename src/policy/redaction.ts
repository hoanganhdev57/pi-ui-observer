const SECRET_KEY = /(authorization|proxy-authorization|cookie|set-cookie|token|secret|password|api[-_]?key|credential)/i;
const JWT = /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g;
const ASSIGNMENT = /(\b(?:token|secret|password|api[-_]?key|authorization)\s*[=:]\s*)([^\s,;&]+)/gi;

export function redactSecrets<T>(value: T, configuredSecrets: string[] = []): T {
  return redactValue(value, configuredSecrets) as T;
}

function redactValue(value: unknown, configuredSecrets: string[]): unknown {
  if (typeof value === "string") {
    let result = value.replace(JWT, "[REDACTED]").replace(ASSIGNMENT, "$1[REDACTED]");
    for (const secret of configuredSecrets.filter(Boolean)) {
      result = result.split(secret).join("[REDACTED]");
    }
    return result;
  }
  if (Array.isArray(value)) return value.map((item) => redactValue(item, configuredSecrets));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [
      key,
      SECRET_KEY.test(key) ? "[REDACTED]" : redactValue(item, configuredSecrets),
    ]));
  }
  return value;
}
