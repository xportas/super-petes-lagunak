function estable(v: unknown): string {
  if (v === null) {
    return "null";
  }
  if (v instanceof Date) {
    return `date:${v.toISOString()}`;
  }
  const t = typeof v;
  if (t === "string") {
    return `str:${v as string}`;
  }
  if (t === "number" || t === "boolean") {
    return `${t}:${String(v)}`;
  }
  if (t === "undefined") {
    return "undef";
  }
  if (Array.isArray(v)) {
    return `[${(v as readonly unknown[]).map((e) => estable(e)).join(",")}]`;
  }
  if (t === "object") {
    const obj = v as Record<string, unknown>;
    const claves = Object.keys(obj).sort();
    const partes = claves.map((k) => `${JSON.stringify(k)}:${estable(obj[k])}`);
    return `{${partes.join(",")}}`;
  }
  return `${t}:${String(v)}`;
}

// Hash estable para idempotencia (RF-15/E-16). cyrb53 determinista.
export function hashContenido(v: unknown): string {
  const texto = estable(v);
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < texto.length; i += 1) {
    const ch = texto.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 =
    Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^
    Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 =
    Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^
    Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const a = (h2 >>> 0).toString(16).padStart(8, "0");
  const b = (h1 >>> 0).toString(16).padStart(8, "0");
  return `${a}${b}`;
}

export function crearRegistroIdempotencia<T>(): {
  readonly ejecutar: (clave: string, efecto: () => T) => { readonly valor: T; readonly repetido: boolean };
  readonly tamano: () => number;
} {
  const vistos = new Map<string, T>();
  return {
    ejecutar: (clave: string, efecto: () => T) => {
      const previo = vistos.get(clave);
      if (previo !== undefined) {
        return { valor: previo, repetido: true };
      }
      const valor = efecto();
      vistos.set(clave, valor);
      return { valor, repetido: false };
    },
    tamano: () => vistos.size,
  };
}

const ALFABETO_CODIGOS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generarCodigoAleatorio(prefijoMinusculas: string): string {
  const az = ALFABETO_CODIGOS;
  let cuerpo = "";
  try {
    const buf = new Uint32Array(12);
    globalThis.crypto?.getRandomValues?.(buf);
    for (const n of buf) {
      cuerpo += az[Number(n) % az.length];
    }
  } catch {
    for (let i = 0; i < 12; i += 1) {
      cuerpo += az[Math.floor(Math.random() * az.length)];
    }
  }
  if (cuerpo.length === 0) {
    for (let i = 0; i < 12; i += 1) {
      cuerpo += az[Math.floor(Math.random() * az.length)];
    }
  }
  return `${prefijoMinusculas.toUpperCase()}${cuerpo}`;
}
