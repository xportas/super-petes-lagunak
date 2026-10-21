import { describe, expect, test } from "vitest";
import type { FilaRateLimit } from "./tipos";
import {
  DURACION_BLOQUEO_MS,
  MAX_INTENTOS_FALLIDOS,
  VENTANA_FALLOS_MS,
  estaBloqueado,
  evaluarIntento,
  siguienteFilaTrasFallo,
  sujetoPara,
} from "./rate-limit";

function filaBase(sobra: Partial<FilaRateLimit> = {}): FilaRateLimit {
  return {
    alcance: "login",
    sujeto: "arnau",
    intentos: 1,
    primerFalloAt: new Date("2026-10-11T10:00:00+02:00"),
    bloqueadoHasta: null,
    ...sobra,
  };
}

describe("rate-limit puro evaluarIntento (RF-05 E-04)", () => {
  test("sin fila permite y pide reiniciar ventana", () => {
    const ahora = new Date("2026-10-11T10:00:00+02:00");
    expect(evaluarIntento(null, ahora)).toEqual({
      permitido: true,
      reiniciarVentana: true,
    });
    expect(estaBloqueado(null, ahora)).toBe(false);
  });

  test("4 fallos permiten (intentos=4 dentro de ventana)", () => {
    const primer = new Date("2026-10-11T10:00:00+02:00");
    const ahora = new Date(primer.getTime() + 5 * 60 * 1000);
    const fila = filaBase({ intentos: 4, primerFalloAt: primer });
    expect(evaluarIntento(fila, ahora).permitido).toBe(true);
    expect(evaluarIntento(fila, ahora).reiniciarVentana).toBe(false);
    expect(estaBloqueado(fila, ahora)).toBe(false);
  });

  test("5o fallo fija bloqueado_hasta=+15m", () => {
    const primer = new Date("2026-10-11T10:00:00+02:00");
    const ahora = new Date(primer.getTime() + 5 * 60 * 1000);
    const fila = filaBase({ intentos: 4, primerFalloAt: primer });
    const sig = siguienteFilaTrasFallo(fila, ahora);
    expect(sig.intentos).toBe(MAX_INTENTOS_FALLIDOS);
    expect(sig.bloqueadoHasta?.getTime()).toBe(
      ahora.getTime() + DURACION_BLOQUEO_MS,
    );
  });

  test("intento en bloqueo no alarga ni permite", () => {
    const primer = new Date("2026-10-11T10:00:00+02:00");
    const bloqueo = new Date(primer.getTime() + 10 * 60 * 1000);
    const fila = filaBase({
      intentos: 5,
      primerFalloAt: primer,
      bloqueadoHasta: bloqueo,
    });
    const durante = new Date(bloqueo.getTime() - 60 * 1000);
    expect(evaluarIntento(fila, durante)).toEqual({
      permitido: false,
      reiniciarVentana: false,
    });
    expect(estaBloqueado(fila, durante)).toBe(true);
    const sig = siguienteFilaTrasFallo(fila, durante);
    expect(sig.bloqueadoHasta?.getTime()).toBe(bloqueo.getTime());
    expect(sig.intentos).toBe(5);
  });

  test(">15m reinicia a 1", () => {
    const primer = new Date("2026-10-11T10:00:00+02:00");
    const ahora = new Date(primer.getTime() + VENTANA_FALLOS_MS + 1);
    const fila = filaBase({ intentos: 3, primerFalloAt: primer });
    expect(evaluarIntento(fila, ahora).reiniciarVentana).toBe(true);
    const sig = siguienteFilaTrasFallo(fila, ahora);
    expect(sig.intentos).toBe(1);
    expect(sig.primerFalloAt.getTime()).toBe(ahora.getTime());
    expect(sig.bloqueadoHasta).toBe(null);
  });

  test("tras expirar bloqueo reinicia", () => {
    const primer = new Date("2026-10-11T10:00:00+02:00");
    const bloqueo = new Date(primer.getTime() + 5 * 60 * 1000);
    const fila = filaBase({
      intentos: 5,
      primerFalloAt: primer,
      bloqueadoHasta: bloqueo,
    });
    const despues = new Date(bloqueo.getTime());
    expect(evaluarIntento(fila, despues).permitido).toBe(true);
    expect(evaluarIntento(fila, despues).reiniciarVentana).toBe(true);
    expect(estaBloqueado(fila, despues)).toBe(false);
    const sig = siguienteFilaTrasFallo(fila, despues);
    expect(sig.intentos).toBe(1);
  });

  test("incremento intermedio sin bloquear", () => {
    const primer = new Date("2026-10-11T10:00:00+02:00");
    const ahora = new Date(primer.getTime() + 60 * 1000);
    const fila = filaBase({ intentos: 1, primerFalloAt: primer });
    const sig = siguienteFilaTrasFallo(fila, ahora);
    expect(sig.intentos).toBe(2);
    expect(sig.bloqueadoHasta).toBe(null);
  });

  test("primera falla crea fila con 1", () => {
    const ahora = new Date("2026-10-11T10:00:00+02:00");
    const sig = siguienteFilaTrasFallo(null, ahora);
    expect(sig).toEqual({
      intentos: 1,
      primerFalloAt: ahora,
      bloqueadoHasta: null,
    });
  });

  test("alcances aislados por sujeto", () => {
    expect(sujetoPara("login", { usernameNorm: "arnau" })).toBe("arnau");
    expect(sujetoPara("login", {})).toBe("desconocido");
    expect(sujetoPara("cambiar_password", { usuarioId: "u-1" })).toBe("u-1");
    expect(sujetoPara("cambiar_password", {})).toBe("desconocido");
    expect(sujetoPara("registro", { ip: "1.2.3.4" })).toBe("1.2.3.4");
    expect(sujetoPara("registro", {})).toBe("127.0.0.1");
    expect(sujetoPara("login", { usernameNorm: "" })).toBe("desconocido");
    expect(sujetoPara("cambiar_password", { usuarioId: "" })).toBe(
      "desconocido",
    );
    expect(sujetoPara("registro", { ip: "" })).toBe("127.0.0.1");
  });

  test("sin bloqueo estaBloqueado falso", () => {
    const ahora = new Date("2026-10-11T10:00:00+02:00");
    expect(estaBloqueado(filaBase(), ahora)).toBe(false);
  });
});
