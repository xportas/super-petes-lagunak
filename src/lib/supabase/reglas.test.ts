import { describe, expect, test } from "vitest";
import { calcularCierre } from "@/src/lib/dominio/cierre";
import { calcularRachas } from "@/src/lib/dominio/rachas";
import {
  bloqueaCalculoPorPendientes,
  debeMarcarPapel,
  esEnvioEnPlazo,
  esManagerActivoParaJornada,
  estadoTrasGracia,
  resolverEstadoConLesionadoPrevio,
  rompeRachaPapel,
  totalAusenciaSinQuinteto,
  totalJornadaPapel,
} from "./reglas";

describe("reglas derivadas (RF-06/RF-08/RF-11/RF-13/RF-14/RF-21)", () => {
  test("cierre = hora-3h e instante == cierre rechaza (E-06)", () => {
    const hora = new Date("2026-10-11T18:00:00+02:00");
    const cierre = calcularCierre(hora);
    expect(cierre.getTime()).toBe(hora.getTime() - 3 * 3600 * 1000);
    expect(esEnvioEnPlazo(cierre, hora)).toBe(false);
    expect(esEnvioEnPlazo(new Date(cierre.getTime() - 1), hora)).toBe(true);
    expect(esEnvioEnPlazo(new Date(cierre.getTime() + 1000), hora)).toBe(false);
  });

  test("cambio de hora no resucita tardíos ni anula válidos", () => {
    const vieja = new Date("2026-10-11T18:00:00+02:00");
    const nuevaTardia = new Date("2026-10-11T20:00:00+02:00");
    const nuevaTemprana = new Date("2026-10-11T16:00:00+02:00");
    const validoViejo = new Date("2026-10-11T14:59:59+02:00");
    expect(esEnvioEnPlazo(validoViejo, vieja)).toBe(true);
    expect(esEnvioEnPlazo(validoViejo, nuevaTardia)).toBe(true);
    const tardioViejo = new Date("2026-10-11T15:00:00+02:00");
    expect(esEnvioEnPlazo(tardioViejo, vieja)).toBe(false);
    expect(esEnvioEnPlazo(tardioViejo, nuevaTemprana)).toBe(false);
  });

  test("lesionado previo con 0 min/ausencia se respeta; con minutos pasa a jugo (E-02)", () => {
    expect(
      resolverEstadoConLesionadoPrevio("lesionado", 0, true),
    ).toBe("lesionado");
    expect(
      resolverEstadoConLesionadoPrevio("lesionado", null, false),
    ).toBe("lesionado");
    expect(resolverEstadoConLesionadoPrevio("lesionado", 12, true)).toBe("jugo");
    expect(resolverEstadoConLesionadoPrevio("disponible", 0, true)).toBe("dnp");
    expect(resolverEstadoConLesionadoPrevio("disponible", null, false)).toBe(
      "no_convocado",
    );
  });

  test("papel tras hora+24h con universallyid null: 0 excluida + rompe; en gracia sigue pendiente", () => {
    const hora = new Date("2026-10-03T18:00:00+02:00");
    const enGracia = new Date("2026-10-04T10:00:00+02:00");
    const trasGracia = new Date("2026-10-04T18:00:01+02:00");
    expect(debeMarcarPapel(hora, null, enGracia, true)).toBe(false);
    expect(estadoTrasGracia(hora, null, enGracia, true)).toBe("pendiente");
    expect(debeMarcarPapel(hora, null, trasGracia, true)).toBe(true);
    expect(estadoTrasGracia(hora, null, trasGracia, true)).toBe("papel");
    expect(debeMarcarPapel(hora, "6acbcc7bd75749bb61a786f8", trasGracia, true)).toBe(
      false,
    );
    expect(debeMarcarPapel(hora, null, trasGracia, false)).toBe(false);
    expect(totalJornadaPapel()).toBe(0);
    expect(rompeRachaPapel()).toBe(0);
  });

  test("papel rompe rachas via calcularRachas", () => {
    const rachas = calcularRachas([
      {
        jugadorId: "j1",
        jornadaId: "J0",
        horaPartido: new Date("2026-10-03T18:00:00+02:00"),
        numeroJornada: 0,
        estadoJornada: "calculada",
        alineado: true,
        quintetoValido: true,
      },
      {
        jugadorId: "j1",
        jornadaId: "J1",
        horaPartido: new Date("2026-10-04T18:00:00+02:00"),
        numeroJornada: 1,
        estadoJornada: "papel",
        alineado: true,
        quintetoValido: true,
      },
    ]);
    expect(rachas.get("j1")).toBe(0);
  });

  test("sin quinteto de activo: -10 sin fila + rompe; alta tardía sin retroactivo", () => {
    expect(totalAusenciaSinQuinteto()).toBe(-10);
    const hora = new Date("2026-10-11T18:00:00+02:00");
    const cierre = calcularCierre(hora);
    const antes = new Date(cierre.getTime() - 1);
    expect(esManagerActivoParaJornada(antes, cierre)).toBe(true);
    expect(esManagerActivoParaJornada(cierre, cierre)).toBe(false);
    expect(
      esManagerActivoParaJornada(new Date(cierre.getTime() + 1), cierre),
    ).toBe(false);
    expect(esManagerActivoParaJornada(null, cierre)).toBe(false);
  });

  test("NULL posiciones bloquea salvo papel (E-09/RF-21)", () => {
    expect(
      bloqueaCalculoPorPendientes([["B", "E"], null], "calculada"),
    ).toBe(true);
    expect(
      bloqueaCalculoPorPendientes([["B", "E"], null], "papel"),
    ).toBe(false);
    expect(
      bloqueaCalculoPorPendientes(
        [
          ["B", "E"],
          ["E", "A"],
        ],
        "calculada",
      ),
    ).toBe(false);
  });

  test("sin contador de racha persistido: racha siempre derivada", () => {
    const r1 = calcularRachas([
      {
        jugadorId: "a",
        jornadaId: "J1",
        horaPartido: new Date("2026-10-03T18:00:00+02:00"),
        numeroJornada: 1,
        estadoJornada: "calculada",
        alineado: true,
        quintetoValido: true,
      },
    ]);
    const r2 = calcularRachas([
      {
        jugadorId: "a",
        jornadaId: "J1",
        horaPartido: new Date("2026-10-03T18:00:00+02:00"),
        numeroJornada: 1,
        estadoJornada: "calculada",
        alineado: true,
        quintetoValido: true,
      },
      {
        jugadorId: "a",
        jornadaId: "J2",
        horaPartido: new Date("2026-10-11T18:00:00+02:00"),
        numeroJornada: 2,
        estadoJornada: "calculada",
        alineado: true,
        quintetoValido: true,
      },
    ]);
    expect(r1.get("a")).toBe(1);
    expect(r2.get("a")).toBe(2);
  });
});
