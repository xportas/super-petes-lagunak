import { describe, expect, test } from "vitest";
import { normalizarActa } from "./parseo-acta";
import actaJ2 from "./fixtures/j2-55488-acta.json";

describe("fnb parseo-acta (T-08, RF-06/RF-07/RF-08)", () => {
  test("filtra teamIdExtern 11659 e importa 11 con trunc", () => {
    const r = normalizarActa(actaJ2, "11659", { fnbMatchId: "55488", fnbUniversallyId: "6acbcc7bd75749bb61a786f8" });
    expect("error" in r).toBe(false);
    if ("error" in r) return;
    expect(r.porJugador).toHaveLength(11);
    expect(r.fnbMatchId).toBe("55488");
    const porNombre = new Map(r.porJugador.map((p) => [p.nombreActa, p] as const));
    expect(porNombre.get("IKER BALDA AFONSO")?.valoracionTruncada).toBe(12);
    expect(porNombre.get("ASIER VALENCIA ARBIZU")?.valoracionTruncada).toBe(13);
    expect(porNombre.get("MARCOS GOMEZ ARNEDO")?.valoracionTruncada).toBe(0);
  });

  test("timePlayed>0 jugo, presente 0 dnp", () => {
    const raw = {
      teams: [
        {
          teamIdExtern: 11659,
          players: [
            {
              uuid: "u-jugo",
              name: "JUGO UNO",
              dorsal: "8",
              timePlayed: 10,
              data: { valoration: 5.9, personal: 0, unsportsmanslike: 0, disqualification: 0, technique: 0, scuffle: 0, coachTechnical: 0 },
            },
            {
              uuid: "u-dnp",
              name: "DNP DOS",
              dorsal: "9",
              timePlayed: 0,
              data: { valoration: 0, personal: 0, unsportsmanslike: 0, disqualification: 0, technique: 0, scuffle: 0, coachTechnical: 0 },
            },
          ],
        },
      ],
    };
    const r = normalizarActa(raw, "11659", { fnbMatchId: "1", fnbUniversallyId: "u" });
    if ("error" in r) throw new Error("no debería fallar");
    const porUuid = new Map(r.porJugador.map((p) => [p.fnbUuid, p] as const));
    expect(porUuid.get("u-jugo")?.estadoPropuesto).toBe("jugo");
    expect(porUuid.get("u-jugo")?.valoracionTruncada).toBe(5);
    expect(porUuid.get("u-dnp")?.estadoPropuesto).toBe("dnp");
  });

  test("MARCOS 16 con 5 personales queda expulsado con BASE intacta", () => {
    const r = normalizarActa(actaJ2, "11659", { fnbMatchId: "55488", fnbUniversallyId: "u" });
    if ("error" in r) throw new Error("no debería fallar");
    const marcos = r.porJugador.find((p) => p.dorsal === "16") ?? null;
    expect(marcos).not.toBeNull();
    expect(marcos?.expulsado).toBe(true);
    expect(marcos?.valoracionTruncada).toBe(0);
    expect(marcos?.estadoPropuesto).toBe("jugo");
  });

  test("MVP FNB ignorado: ningún flag externo se lee", () => {
    const rawConMvp = {
      teams: [
        {
          teamIdExtern: 11659,
          players: [
            {
              uuid: "u-1",
              name: "A UNO",
              dorsal: "8",
              timePlayed: 10,
              data: { valoration: 13, personal: 0, unsportsmanslike: 0, disqualification: 0, technique: 0, scuffle: 0, coachTechnical: 0 },
              mvp: true,
            },
          ],
        },
      ],
    };
    const r = normalizarActa(rawConMvp, "11659", { fnbMatchId: "1", fnbUniversallyId: "u" });
    if ("error" in r) throw new Error("no debería fallar");
    expect(r.porJugador).toHaveLength(1);
    expect("mvp" in (r.porJugador[0] as unknown as Record<string, unknown>)).toBe(false);
  });

  test("dorsal distinto no cambia vínculo: se conserva tal cual sin usarlo para mapear", () => {
    const r = normalizarActa(actaJ2, "11659", { fnbMatchId: "55488", fnbUniversallyId: "u" });
    if ("error" in r) throw new Error("no debería fallar");
    const iker = r.porJugador.find((p) => p.nombreActa === "IKER BALDA AFONSO") ?? null;
    expect(iker?.dorsal).toBe("12");
    expect(iker?.fnbUuid).toBe("c66df5a9-eb38-11e9-83ca-0216824770c2");
  });

  test("sin equipo 11659 devuelve error sin bloquear resto", () => {
    const r = normalizarActa({ teams: [{ teamIdExtern: 999, players: [] }] }, "11659", {
      fnbMatchId: "1",
      fnbUniversallyId: "u",
    });
    expect("error" in r).toBe(true);
  });
});
