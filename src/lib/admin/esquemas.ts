// Solo servidor: validación Zod de entradas Admin (RF-01, RF-05, RF-08, RF-09).
// Nunca importar desde 'use client'.
import { z } from "zod";

const posicionEnum = z.enum(["B", "E", "A", "AP", "P"]);

function esIsoParseable(valor: unknown): valor is string {
  if (typeof valor !== "string" || valor.length === 0) {
    return false;
  }
  const d = new Date(valor);
  return !Number.isNaN(d.getTime());
}

export const jornadaSchema = z
  .object({
    rival: z.string().min(1),
    horaPartido: z.string().min(1).refine(esIsoParseable, {
      message: "hora_invalida",
    }),
    localVisitante: z.enum(["local", "visitante"]),
    numeroLiga: z.number().int().positive().optional(),
    campo: z.string().optional(),
    municipio: z.string().optional(),
    marcadorLocal: z.number().int().optional(),
    marcadorVisitante: z.number().int().optional(),
  })
  .strict();

export const jugadorSchema = z
  .object({
    nombre: z.string().min(1),
    posicionesValidas: z.tuple([posicionEnum, posicionEnum]),
    dorsal: z.string().optional(),
    img: z.string().optional(),
    imgPete: z.string().optional(),
    nombrePete: z.string().optional(),
    descripcion: z.string().optional(),
    fnbUuid: z.string().uuid().optional(),
    estadoSanitario: z.enum(["disponible", "lesionado"]),
  })
  .strict();

const actaFilaSchema = z
  .object({
    jugadorId: z.string().uuid(),
    valoracion: z.number().int(),
    estado: z.enum(["jugo", "lesionado", "no_convocado", "dnp"]),
    expulsado: z.boolean(),
  })
  .strict()
  .superRefine((fila, ctx) => {
    const noJugo =
      fila.estado === "lesionado" ||
      fila.estado === "no_convocado" ||
      fila.estado === "dnp";
    if (fila.estado !== "jugo" && fila.expulsado) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "excluyente_lesion_expulsion",
        path: ["expulsado"],
      });
    }
    if (noJugo && fila.valoracion !== 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "cero_forzado",
        path: ["valoracion"],
      });
    }
  });

export const actaSchema = z.array(actaFilaSchema).min(1);

export const urlFnbSchema = z
  .string()
  .min(1)
  .refine(
    (valor) => {
      let url: URL;
      try {
        url = new URL(valor);
      } catch {
        return false;
      }
      if (!url.pathname.includes("pagina-partido")) {
        return false;
      }
      const id = url.searchParams.get("id");
      const uuid = url.searchParams.get("uuid");
      if (id !== null && id.trim().length > 0) {
        return true;
      }
      if (uuid !== null && uuid.trim().length > 0) {
        return true;
      }
      return false;
    },
    { message: "url_invalida" },
  );

export type JornadaSchemaInput = z.infer<typeof jornadaSchema>;
export type JugadorSchemaInput = z.infer<typeof jugadorSchema>;
export type ActaSchemaInput = z.infer<typeof actaSchema>;
