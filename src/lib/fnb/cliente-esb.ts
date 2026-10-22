import { ESB_BASE } from "./constantes";

interface SobreEsb<T> {
  readonly result: string;
  readonly errorCode: number;
  readonly message: string;
  readonly messageData: T;
}

function esSobreEsb(valor: unknown): valor is SobreEsb<unknown> {
  if (typeof valor !== "object" || valor === null) {
    return false;
  }
  const v = valor as Record<string, unknown>;
  return typeof v["result"] === "string" && "messageData" in v;
}

export async function fetchEsb<T>(path: string, fetchFn: typeof fetch = fetch): Promise<T> {
  const res = await fetchFn(`${ESB_BASE}${path}`, {
    headers: { federation: "fnb" },
  });
  if (!res.ok) {
    throw new Error(`FNB_HTTP ${res.status}`);
  }
  const b64 = (await res.text()).trim();
  const texto = Buffer.from(b64, "base64").toString("utf-8");
  let parsed: unknown;
  try {
    parsed = JSON.parse(texto) as unknown;
  } catch {
    throw new Error("FNB_ESB_ERROR json");
  }
  if (!esSobreEsb(parsed)) {
    throw new Error("FNB_ESB_ERROR forma");
  }
  if (parsed.result !== "OK") {
    const detalle = typeof parsed.message === "string" && parsed.message.length > 0 ? parsed.message : `ESB Error ${parsed.errorCode}`;
    throw new Error(`FNB_ESB_ERROR ${detalle}`);
  }
  return parsed.messageData as T;
}
