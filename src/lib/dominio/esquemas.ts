import { z } from "zod";

export const esquemaPosicion = z.enum(["B", "E", "A", "AP", "P"]);

export const esquemaPosicionesValidas = z.tuple([
  esquemaPosicion,
  esquemaPosicion,
]);

export const esquemaEntrenador = z.enum(["maider", "pater"]);

export const esquemaConteosFaltas = z.object({
  descalificacion: z.number().int().min(0),
  pelea: z.number().int().min(0),
  antideportivas: z.number().int().min(0),
  tecnicas: z.number().int().min(0),
  tecnicaEntrenador: z.number().int().min(0),
  personales: z.number().int().min(0),
});

export const esquemaQuintetoInput = z
  .object({
    jugadorIds: z.array(z.string().min(1)).length(5),
    posicionPorJugador: z.record(z.string(), esquemaPosicion),
    entrenador: esquemaEntrenador,
    capitanId: z.string().min(1),
  })
  .superRefine((valor, ctx) => {
    const vistos = new Set<string>();
    for (const id of valor.jugadorIds) {
      if (vistos.has(id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "duplicados",
          path: ["jugadorIds"],
        });
        break;
      }
      vistos.add(id);
    }
    if (!valor.jugadorIds.includes(valor.capitanId)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "capitan_fuera",
        path: ["capitanId"],
      });
    }
  });

export const esquemaActaJugador = z.object({
  valoracionFNB: z.number().int(),
  estado: z.enum(["jugo", "lesionado", "no_convocado", "dnp"]),
  conteos: esquemaConteosFaltas,
});
