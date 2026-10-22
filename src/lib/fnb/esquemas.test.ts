import { describe, expect, test } from "vitest";
import { esquemaMatchFnb, esquemaMsStats, esquemaMsStatsPlayer, esquemaUrlFnb } from "./esquemas";

const J2_CALENDARIO = {
  idMatch: "55488",
  universallyid: "6acbcc7bd75749bb61a786f8",
  numMatchDay: "2",
  matchDay: "2026-10-11 18:00:00",
  state: "1",
  idLocalTeam: "11659",
  nameLocalTeam: "LAGUNAK A",
  idVisitorTeam: "11763",
  nameVisitorTeam: "PAYVI TABERNA SANDUZELAI",
  nameField: "PDVO. LAGUNAK",
  adressField: "Ronda Barañain s/n",
  nameTown: "Barañáin",
  localScore: "67",
  visitorScore: "42",
};

const J1_SIN_ACTA = {
  ...J2_CALENDARIO,
  idMatch: "55483",
  universallyid: null,
  numMatchDay: "1",
  matchDay: "2026-10-03 18:00:00",
  idLocalTeam: "99999",
  nameLocalTeam: "BERRIOZAR MKE",
  idVisitorTeam: "11659",
  nameVisitorTeam: "LAGUNAK A",
  localScore: "64",
  visitorScore: "58",
};

describe("fnb esquemas (T-04, RF-01/RF-11)", () => {
  test("esquemaMatchFnb acepta J2 válido", () => {
    expect(esquemaMatchFnb.safeParse(J2_CALENDARIO).success).toBe(true);
  });

  test("esquemaMatchFnb acepta universallyid null (J1 papel)", () => {
    expect(esquemaMatchFnb.safeParse(J1_SIN_ACTA).success).toBe(true);
  });

  test("esquemaMatchFnb rechaza sin idMatch", () => {
    const { idMatch: _omit, ...resto } = J2_CALENDARIO;
    void _omit;
    expect(esquemaMatchFnb.safeParse(resto).success).toBe(false);
  });

  test("esquemaMsStatsPlayer acepta conteos J2", () => {
    const player = {
      uuid: "c66df5a9-eb38-11e9-83ca-0216824770c2",
      name: "IKER BALDA AFONSO",
      dorsal: "12",
      timePlayed: 21,
      data: {
        valoration: 12,
        personal: 2,
        unsportsmanslike: 0,
        disqualification: 0,
        technique: 0,
        scuffle: 0,
        coachTechnical: 0,
      },
    };
    expect(esquemaMsStatsPlayer.safeParse(player).success).toBe(true);
  });

  test("esquemaMsStats acepta teams con teamIdExtern numérico", () => {
    const raw = {
      teams: [
        {
          teamIdExtern: 11659,
          players: [
            {
              uuid: "u-1",
              name: "A",
              dorsal: "8",
              timePlayed: 10,
              data: {
                valoration: 1,
                personal: 0,
                unsportsmanslike: 0,
                disqualification: 0,
                technique: 0,
                scuffle: 0,
                coachTechnical: 0,
              },
            },
          ],
        },
      ],
    };
    expect(esquemaMsStats.safeParse(raw).success).toBe(true);
  });

  test("esquemaUrlFnb distingue ?id= frente a ?uuid=", () => {
    expect(esquemaUrlFnb.safeParse({ idMatch: "55488" }).success).toBe(true);
    expect(esquemaUrlFnb.safeParse({ uuid: "6acbcc7bd75749bb61a786f8" }).success).toBe(true);
    expect(esquemaUrlFnb.safeParse({}).success).toBe(false);
    expect(esquemaUrlFnb.safeParse({ idMatch: "" }).success).toBe(false);
  });
});
