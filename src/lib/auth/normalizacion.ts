const USERNAME_RE = /^[A-Za-z0-9_-]+$/;
const MIN_USERNAME = 3;
const MAX_USERNAME = 20;

export function normalizarUsername(valor: unknown): string {
  if (typeof valor !== "string") {
    throw new TypeError("username no es texto");
  }
  return valor.trim().toLowerCase();
}

export function esFormatoUsernameValido(valor: unknown): boolean {
  if (typeof valor !== "string") {
    return false;
  }
  const recortado = valor.trim();
  if (recortado.length < MIN_USERNAME || recortado.length > MAX_USERNAME) {
    return false;
  }
  return USERNAME_RE.test(recortado);
}

export function esPasswordValida(valor: unknown): boolean {
  if (typeof valor !== "string") {
    return false;
  }
  if (valor.length < 8 || valor.length > 72) {
    return false;
  }
  return valor.trim().length >= 1;
}

export function normalizarCodigoInvitacion(valor: unknown): string {
  if (typeof valor !== "string") {
    throw new TypeError("codigo no es texto");
  }
  return valor.trim().toLowerCase();
}

export function extraerIP(cabeceras: {
  readonly get: (nombre: string) => string | null;
}): string {
  const directa = cabeceras.get("x-forwarded-for");
  if (typeof directa === "string" && directa.trim().length > 0) {
    const primera = directa.split(",")[0];
    if (typeof primera === "string") {
      const recortada = primera.trim();
      if (recortada.length > 0) {
        return recortada;
      }
    }
  }
  const real = cabeceras.get("x-real-ip");
  if (typeof real === "string" && real.trim().length > 0) {
    return real.trim();
  }
  return "127.0.0.1";
}
