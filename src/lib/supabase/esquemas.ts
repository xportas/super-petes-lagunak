import { z } from "zod";
import { esquemaPosicion } from "@/src/lib/dominio/esquemas";

export const esquemaPosicionesValidas = z.tuple([
  esquemaPosicion,
  esquemaPosicion,
]);

const uuidSchema = z.string().uuid();

export const esquemaGuardarAlineacion = z
  .object({
    jornadaId: uuidSchema,
    jugadorIds: z.array(uuidSchema).length(5),
    posicionPorJugador: z.record(uuidSchema, esquemaPosicion),
    entrenador: z.enum(["maider", "pater"]),
    capitanId: uuidSchema,
    instanteInicio: z.date(),
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
    for (const id of valor.jugadorIds) {
      if (valor.posicionPorJugador[id] === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "sin_posicion",
          path: ["posicionPorJugador", id],
        });
      }
    }
  });

export const esquemaActaManual = z
  .array(
    z.object({
      jugadorId: uuidSchema,
      valoracion: z.number().int(),
      estado: z.enum(["jugo", "lesionado", "no_convocado", "dnp"]),
      expulsado: z.boolean(),
    }),
  )
  .superRefine((filas, ctx) => {
    filas.forEach((fila, indice) => {
      const noJugo =
        fila.estado === "lesionado" ||
        fila.estado === "no_convocado" ||
        fila.estado === "dnp";
      if (noJugo && fila.expulsado) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "lesion_expulsion_excluyentes",
          path: [indice, "expulsado"],
        });
      }
      if (noJugo && fila.valoracion !== 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "no_jugado_valoracion_debe_ser_cero",
          path: [indice, "valoracion"],
        });
      }
    });
  });

export const esquemaJugadorSeed = z.object({
  nombre: z.string().min(1),
  nombreFnb: z.string().min(1),
  dorsal: z.number().int().min(0).nullable(),
  posicionesValidas: esquemaPosicionesValidas,
  nombrePete: z.string().nullable(),
  img: z.string().min(1),
  imgPete: z.string().min(1),
  descripcion: z.string(),
  fnbUuid: uuidSchema,
});

export type GuardarAlineacionInput = z.infer<typeof esquemaGuardarAlineacion>;
export type ActaManualInput = z.infer<typeof esquemaActaManual>;
export type JugadorSeedInput = z.infer<typeof esquemaJugadorSeed>;

export function parsearDesconocido(
  esquema: z.ZodTypeAny,
  valor: unknown,
): { readonly ok: true; readonly valor: unknown } | { readonly ok: false } {
  const r = esquema.safeParse(valor);
  if (r.success) {
    return { ok: true, valor: r.data as unknown };
  }
  return { ok: false };
}
