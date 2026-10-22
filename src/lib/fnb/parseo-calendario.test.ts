import { describe, expect, test } from "vitest";
import { detectarSegundaFase, fusionarCalendario, normalizarJornada } from "./parseo-calendario";
import j1 from "./fixtures/j1-55483.json";
import j2 from "./fixtures/j2-55488.json";

describe("fnb parseo-calendario (T-06, RF-02/RF-03/RF-13)", () => {
  test("J2 local con marcador y acta: rival visitante y finalizado", () => {
    const r = normalizarJornada(j2);
    expect("error" in r).toBe(false);
    if ("error" in r) return;
    expect(r.fnbMatchId).toBe("55488");
    expect(r.fnbUniversallyId).toBe("6acbcc7bd75749bb61a786f8");
    expect(r.esLocal).toBe(true);
    expect(r.rival).toBe("PAYVI TABERNA SANDUZELAI");
    expect(r.finalizado).toBe(true);
    expect(r.marcadorLocal).toBe(67);
    expect(r.marcadorVisitante).toBe(42);
    expect(r.numeroJornadaFnb).toBe(2);
  });

  test("J1 visitante sin acta: universally null y finalizado con marcador", () => {
    const r = normalizarJornada(j1);
    expect("error" in r).toBe(false);
    if ("error" in r) return;
    expect(r.fnbUniversallyId).toBeNull();
    expect(r.esLocal).toBe(false);
    expect(r.rival).toBe("BERRIOZAR MKE");
    expect(r.finalizado).toBe(true);
    expect(r.marcadorLocal).toBe(64);
    expect(r.marcadorVisitante).toBe(58);
  });

  test("futuro state=0 solo calendario sin acta ni marcador exigible", () => {
    const futuro = { ...j2, state: "0", universallyid: null, localScore: null, visitorScore: null };
    const r = normalizarJornada(futuro);
    expect("error" in r).toBe(false);
    if ("error" in r) return;
    expect(r.finalizado).toBe(false);
    expect(r.marcadorLocal).toBeNull();
    expect(r.fnbUniversallyId).toBeNull();
  });

  test("matchDay ininterpretable devuelve SIN_HORA", () => {
    const r = normalizarJornada({ ...j2, matchDay: "no-fecha" });
    expect(r).toEqual({ error: "SIN_HORA" });
  });

  test("idLocalTeam decide local y rival", () => {
    const local = normalizarJornada(j2);
    const visi = normalizarJornada(j1);
    if ("error" in local || "error" in visi) throw new Error("fixture inválido");
    expect(local.esLocal).toBe(true);
    expect(visi.esLocal).toBe(false);
  });

  test("numMatchDay reiniciado en 1 detecta segunda fase sin colisionar", () => {
    const existentes = [
      { fnbMatchId: "55483", numeroJornada: 1, numeroJornadaFnb: 1 },
      { fnbMatchId: "55488", numeroJornada: 2, numeroJornadaFnb: 2 },
    ];
    const entrantes = [
      { ...j2, idMatch: "55488" },
      { ...j2, idMatch: "60001", numMatchDay: "1", matchDay: "2027-01-10 18:00:00" },
    ];
    expect(detectarSegundaFase(existentes, entrantes)).toBe(true);
    const fusion = fusionarCalendario({
      existentes,
      entrantes: entrantes
        .map((e) => normalizarJornada(e))
        .filter((r): r is Extract<typeof r, { fnbMatchId: string }> => !("error" in r)),
      ignorados: [],
      maxNumeroLiga: 2,
    });
    expect(fusion.nuevas).toHaveLength(1);
    expect(fusion.nuevas[0]?.numeroJornadaFnb).toBe(1);
    expect(fusion.nuevas[0]?.numeroJornada).toBeGreaterThan(2);
  });

  test("fnb_partidos_ignorados no se recrea", () => {
    const fusion = fusionarCalendario({
      existentes: [],
      entrantes: [normalizarJornada(j2)].filter(
        (r): r is Extract<typeof r, { fnbMatchId: string }> => !("error" in r),
      ),
      ignorados: ["55488"],
      maxNumeroLiga: 0,
    });
    expect(fusion.nuevas).toHaveLength(0);
  });

  test("aplazado o state distinto de 1 queda no finalizado sin cálculo", () => {
    const r = normalizarJornada({ ...j2, state: "0" });
    if ("error" in r) throw new Error("fixture inválido");
    expect(r.finalizado).toBe(false);
  });
});
