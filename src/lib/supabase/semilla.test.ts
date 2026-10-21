import { describe, expect, test } from "vitest";
import { datosSemilla } from "./semilla";

describe("semilla 03 (RF-19)", () => {
  test("12 jugadores con uuid verificados y fecha_alta previa a J1/J2", () => {
    const d = datosSemilla();
    expect(d.jugadores).toHaveLength(12);
    const uuids = d.jugadores.map((j) => j.fnbUuid);
    expect(new Set(uuids).size).toBe(12);
    expect(uuids).toContain("c66dee66-eb38-11e9-83ca-0216824770c2");
    expect(uuids).toContain("c663ea09-eb38-11e9-83ca-0216824770c2");
    expect(uuids).toContain("c66df5a9-eb38-11e9-83ca-0216824770c2");
    expect(uuids).toContain("c67324d5-eb38-11e9-83ca-0216824770c2");
    expect(uuids).toContain("9fb20b1e-9742-43fc-9ea2-ddeef9fbeae5");
    expect(uuids).toContain("d441b014-9ee3-49e8-a1d0-b4b561dbf362");
    expect(uuids).toContain("6d3c74db-5426-42ad-8c5c-cc276a0489a4");
    expect(uuids).toContain("c66df169-eb38-11e9-83ca-0216824770c2");
    expect(uuids).toContain("579eb47a-d2f5-4125-81ec-2bdf9d050bd6");
    expect(uuids).toContain("c66df3c0-eb38-11e9-83ca-0216824770c2");
    expect(uuids).toContain("c6684685-eb38-11e9-83ca-0216824770c2");
    expect(uuids).toContain("c668475e-eb38-11e9-83ca-0216824770c2");
    for (const j of d.jugadores) {
      expect(j.fechaAlta).toBe("2026-09-01T00:00:00+02:00");
      expect(j.posicionesValidas).toHaveLength(2);
      expect(j.img).toBe("public/players/placeholder.webp");
    }
  });

  test("Maider/Páter con uuid, sin managers ficticios", () => {
    const d = datosSemilla();
    expect(d.entrenadores).toHaveLength(2);
    expect(
      d.entrenadores.find((e) => e.slug === "maider")?.fnbUuid,
    ).toBe("c663ff92-eb38-11e9-83ca-0216824770c2");
    expect(
      d.entrenadores.find((e) => e.slug === "pater")?.fnbUuid,
    ).toBe("c66dca7c-eb38-11e9-83ca-0216824770c2");
    expect(typeof d.adminUsername).toBe("string");
    expect(d.adminUsername.length).toBeGreaterThan(0);
  });

  test("J1 55483 papel + J2 55488 calculada con 11 valoraciones + VITAL no_convocado", () => {
    const d = datosSemilla();
    expect(d.jornadas).toHaveLength(2);
    const j1 = d.jornadas.find((j) => j.fnbMatchId === "55483");
    const j2 = d.jornadas.find((j) => j.fnbMatchId === "55488");
    expect(j1?.estado).toBe("papel");
    expect(j1?.fnbUniversallyId).toBeNull();
    expect(j1?.resultados).toHaveLength(0);
    expect(j2?.estado).toBe("calculada");
    expect(j2?.fnbUniversallyId).toBe("6acbcc7bd75749bb61a786f8");
    expect(j2?.resultados).toHaveLength(12);
    const vals = (j2?.resultados ?? [])
      .filter((r) => r.estado === "jugo")
      .map((r) => r.valoracion);
    expect(vals).toEqual([1, 6, 12, 7, 2, 0, 8, 1, -1, 13, -1]);
    const vital = (j2?.resultados ?? []).find(
      (r) => r.fnbUuid === "c668475e-eb38-11e9-83ca-0216824770c2",
    );
    expect(vital?.estado).toBe("no_convocado");
    expect(vital?.valoracion).toBe(0);
  });
});
