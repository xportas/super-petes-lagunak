import { z } from "zod";

export const esquemaMatchFnb = z.object({
  idMatch: z.string(),
  universallyid: z.string().nullable(),
  numMatchDay: z.string(),
  matchDay: z.string(),
  state: z.string(),
  idLocalTeam: z.string(),
  nameLocalTeam: z.string(),
  idVisitorTeam: z.string(),
  nameVisitorTeam: z.string(),
  nameField: z.string().nullable(),
  adressField: z.string().nullable(),
  nameTown: z.string().nullable(),
  localScore: z.string().nullable(),
  visitorScore: z.string().nullable(),
});

export const esquemaFitxaPartit = z.object({
  match: esquemaMatchFnb,
});

export const esquemaMsStatsPlayer = z.object({
  uuid: z.string(),
  name: z.string(),
  dorsal: z.string(),
  timePlayed: z.number(),
  data: z.object({
    valoration: z.number(),
    personal: z.number().int().min(0),
    unsportsmanslike: z.number().int().min(0),
    disqualification: z.number().int().min(0),
    technique: z.number().int().min(0),
    scuffle: z.number().int().min(0),
    coachTechnical: z.number().int().min(0),
    benchTechnical: z.number().int().min(0).optional(),
  }),
});

export const esquemaMsStats = z.object({
  teams: z.array(
    z.object({
      teamIdExtern: z.number(),
      players: z.array(esquemaMsStatsPlayer),
    }),
  ),
});

export const esquemaUrlFnb = z.union([
  z.object({ idMatch: z.string().min(1) }),
  z.object({ uuid: z.string().min(1) }),
]);

export type MatchFnbEsquema = z.infer<typeof esquemaMatchFnb>;
export type MsStatsEsquema = z.infer<typeof esquemaMsStats>;
export type UrlFnbEsquema = z.infer<typeof esquemaUrlFnb>;

export function parsearUrlFnb(url: string): UrlFnbEsquema | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (!parsed.pathname.includes("pagina-partido")) {
    return null;
  }
  const id = parsed.searchParams.get("id");
  const uuid = parsed.searchParams.get("uuid");
  if (id !== null && id.trim().length > 0) {
    const r = esquemaUrlFnb.safeParse({ idMatch: id.trim() });
    return r.success ? r.data : null;
  }
  if (uuid !== null && uuid.trim().length > 0) {
    const r = esquemaUrlFnb.safeParse({ uuid: uuid.trim() });
    return r.success ? r.data : null;
  }
  return null;
}
