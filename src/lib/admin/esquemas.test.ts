import { describe, expect, test } from "vitest";
import {
  actaSchema,
  jornadaSchema,
  jugadorSchema,
  urlFnbSchema,
} from "./esquemas";

const UUID = "11111111-1111-4111-8111-111111111111";

describe("admin esquemas Zod servidor (RF-01/RF-05/RF-08/RF-09)", () => {
  test("jornada rechaza sin rival/hora", () => {
    expect(
      jornadaSchema.safeParse({
        rival: "",
        horaPartido: "2026-07-11T18:00:00+02:00",
        localVisitante: "local",
      }).success,
    ).toBe(false);
    expect(
      jornadaSchema.safeParse({
        rival: "R",
        horaPartido: "no-fecha",
        localVisitante: "local",
      }).success,
    ).toBe(false);
  });

  test("jugador rechaza lesionado+expulsado vía acta, y 1.5 no es int", () => {
    const r = actaSchema.safeParse([
      { jugadorId: UUID, valoracion: 0, estado: "lesionado", expulsado: true },
    ]);
    expect(r.success).toBe(false);
    const r2 = actaSchema.safeParse([
      { jugadorId: UUID, valoracion: 1.5, estado: "jugo", expulsado: false },
    ]);
    expect(r2.success).toBe(false);
  });

  test("acta rechaza esquema con campo mvp", () => {
    const r = actaSchema.safeParse([
      {
        jugadorId: UUID,
        valoracion: 5,
        estado: "jugo",
        expulsado: false,
        mvp: true,
      },
    ]);
    expect(r.success).toBe(false);
  });

  test("jornada rechaza campo cierre", () => {
    const r = jornadaSchema.safeParse({
      rival: "R",
      horaPartido: "2026-07-11T18:00:00+02:00",
      localVisitante: "local",
      cierre: "2026-07-11T15:00:00+02:00",
    });
    expect(r.success).toBe(false);
  });

  test("jugador acepta tuple [E,A] y fnbUuid opcional", () => {
    expect(
      jugadorSchema.safeParse({
        nombre: "N",
        posicionesValidas: ["E", "A"],
        estadoSanitario: "disponible",
      }).success,
    ).toBe(true);
    expect(
      jugadorSchema.safeParse({
        nombre: "N",
        posicionesValidas: ["E"],
        estadoSanitario: "disponible",
      }).success,
    ).toBe(false);
  });

  test("urlFnb acepta ?id= y ?uuid=, rechaza otras", () => {
    expect(
      urlFnbSchema.safeParse("https://x.es/pagina-partido/?id=123").success,
    ).toBe(true);
    expect(
      urlFnbSchema.safeParse("https://x.es/pagina-partido/?uuid=abc").success,
    ).toBe(true);
    expect(urlFnbSchema.safeParse("https://x.es/otra/?id=1").success).toBe(
      false,
    );
    expect(urlFnbSchema.safeParse("no-url").success).toBe(false);
  });
});
