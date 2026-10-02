import type { HostPolicy } from "../types.js";

export const defaultHostPolicy: HostPolicy = {
  allowedHosts: [],
  allowLocalhost: true,
};

export function isAllowedHost(rawUrl: string, policy: HostPolicy = defaultHostPolicy): boolean {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return false;
  }

  if (policy.allowLocalhost && (url.hostname === "localhost" || url.hostname === "127.0.0.1" || url.hostname === "::1")) {
    return true;
  }

  return policy.allowedHosts.some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`));
}
