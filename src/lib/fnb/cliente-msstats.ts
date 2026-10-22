import { MSSTATS_BASE } from "./constantes";

export async function fetchMsStats<T>(path: string, fetchFn: typeof fetch = fetch): Promise<T> {
  const res = await fetchFn(`${MSSTATS_BASE}${path}`, {
    headers: { federation: "fnb" },
  });
  if (!res.ok) {
    throw new Error(`FNB_HTTP ${res.status}`);
  }
  return (await res.json()) as T;
}
