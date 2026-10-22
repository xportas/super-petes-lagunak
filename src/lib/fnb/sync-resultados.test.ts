import { describe, expect, test } from "vitest";
import {
  debeAutoCrearPendiente,
  debeSaltarManual,
  decidirPapel,
  decidirSyncResultado,
  hayPendienteSinPosiciones,
  resolverEstadoConLesionado,
  resolverEstadoJornadaTrasActa,
} from "./sync-resultados";

const HORA = new Date("2026-10-11T18:00:00+02:00");

describe("fnb sync-resultados (T-10, RF-04/RF-06/RF-09/RF-10/RF-12)", () => {
  test("decidirSyncResultado solo si hora+3h<=ahora", () => {
    const antes = new Date(HORA.getTime() + 2 * 3600 * 1000);
    expect(
      decidirSyncResultado({ horaPartido: HORA, estado: "pendiente", origen: null, lastResultSync: null, ahora: antes }),
    ).toBe(false);
    const despues = new Date(HORA.getTime() + 3 * 3600 * 1000);
    expect(
      decidirSyncResultado({ horaPartido: HORA, estado: "pendiente", origen: null, lastResultSync: null, ahora: despues }),
    ).toBe(true);
  });

  test("decidirSyncResultado respeta throttle 1h", () => {
    const ahora = new Date(HORA.getTime() + 5 * 3600 * 1000);
    expect(
      decidirSyncResultado({
        horaPartido: HORA,
        estado: "pendiente",
        origen: null,
        lastResultSync: new Date(ahora.getTime() - 30 * 60 * 1000),
        ahora,
      }),
    ).toBe(false);
    expect(
      decidirSyncResultado({
        horaPartido: HORA,
        estado: "pendiente",
        origen: null,
        lastResultSync: new Date(ahora.getTime() - 61 * 60 * 1000),
        ahora,
      }),
    ).toBe(true);
  });

  test("manual bloquea auto aunque haya ventana", () => {
    const ahora = new Date(HORA.getTime() + 5 * 3600 * 1000);
    expect(
      decidirSyncResultado({ horaPartido: HORA, estado: "calculada", origen: "manual", lastResultSync: null, ahora }),
    ).toBe(false);
    expect(debeSaltarManual("manual", false)).toBe(true);
    expect(debeSaltarManual("manual", true)).toBe(false);
    expect(debeSaltarManual("fnb", false)).toBe(false);
    expect(debeSaltarManual(null, false)).toBe(false);
  });

  test("corrección fnb sí reimporta cuando throttle vence", () => {
    const ahora = new Date(HORA.getTime() + 6 * 3600 * 1000);
    expect(
      decidirSyncResultado({ horaPartido: HORA, estado: "calculada", origen: "fnb", lastResultSync: null, ahora }),
    ).toBe(true);
  });

  test("decidirPapel J1 en gracia queda pendiente con manual", () => {
    const enGracia = new Date(HORA.getTime() + 23 * 3600 * 1000);
    expect(decidirPapel({ state: "1", universallyid: null, horaPartido: HORA, ahora: enGracia })).toBe("pendiente");
  });

  test("decidirPapel tras 24h con state=1 y null pasa a papel", () => {
    const tras = new Date(HORA.getTime() + 24 * 3600 * 1000);
    expect(decidirPapel({ state: "1", universallyid: null, horaPartido: HORA, ahora: tras })).toBe("papel");
    expect(decidirPapel({ state: "1", universallyid: "u", horaPartido: HORA, ahora: tras })).toBe("pendiente");
    expect(decidirPapel({ state: "0", universallyid: null, horaPartido: HORA, ahora: tras })).toBe("pendiente");
  });

  test("resolverEstadoConLesionado respeta lesionado con 0 o ausencia y pasa a jugo con minutos", () => {
    expect(resolverEstadoConLesionado({ estadoPropuesto: "no_convocado", lesionadoPrevio: true, minutos: 0 })).toBe("lesionado");
    expect(resolverEstadoConLesionado({ estadoPropuesto: "dnp", lesionadoPrevio: true, minutos: 0 })).toBe("lesionado");
    expect(resolverEstadoConLesionado({ estadoPropuesto: "jugo", lesionadoPrevio: true, minutos: 12 })).toBe("jugo");
    expect(resolverEstadoConLesionado({ estadoPropuesto: "jugo", lesionadoPrevio: false, minutos: 12 })).toBe("jugo");
    expect(resolverEstadoConLesionado({ estadoPropuesto: "dnp", lesionadoPrevio: false, minutos: 0 })).toBe("dnp");
    expect(resolverEstadoConLesionado({ estadoPropuesto: "no_convocado", lesionadoPrevio: false, minutos: 0 })).toBe(
      "no_convocado",
    );
  });

  test("lock concurrente: segunda lectura con throttle actualizado sirve BD", () => {
    const ahora = new Date(HORA.getTime() + 5 * 3600 * 1000);
    const primera = decidirSyncResultado({ horaPartido: HORA, estado: "pendiente", origen: null, lastResultSync: null, ahora });
    expect(primera).toBe(true);
    // Tras ejecutar, lastResultSync se actualiza a ahora: la concurrente ya no ejecuta.
    const segunda = decidirSyncResultado({
      horaPartido: HORA,
      estado: "pendiente",
      origen: null,
      lastResultSync: ahora,
      ahora,
    });
    expect(segunda).toBe(false);
  });

  test("jugador nuevo sin uuid pendiente auto-crea y bloquea cálculo", () => {
    expect(debeAutoCrearPendiente({ tipo: "pendiente" })).toBe(true);
    expect(debeAutoCrearPendiente({ tipo: "uuid", id: "x" })).toBe(false);
    expect(debeAutoCrearPendiente({ tipo: "nombre-unico", id: "x" })).toBe(false);
    expect(hayPendienteSinPosiciones([{ posicionesValidas: null }])).toBe(true);
    expect(hayPendienteSinPosiciones([{ posicionesValidas: ["B", "E"] }])).toBe(false);
    expect(resolverEstadoJornadaTrasActa({ estadoPrevio: "pendiente", hayPendiente: true, actaCompleta: true })).toBe(
      "pendiente",
    );
    expect(resolverEstadoJornadaTrasActa({ estadoPrevio: "calculada", hayPendiente: true, actaCompleta: true })).toBe(
      "invalidada",
    );
    expect(
      resolverEstadoJornadaTrasActa({ estadoPrevio: "pendiente", hayPendiente: false, actaCompleta: true }),
    ).toBe("calculada");
  });
});
