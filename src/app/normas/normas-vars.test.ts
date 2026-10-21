import { describe, expect, test } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import {
  BONUS_MVP,
  BONUS_POSICION,
  FACTOR_CAPITAN_DEN,
  FACTOR_CAPITAN_NUM,
  HORAS_CIERRE,
  PENALIZACION_POR_EXPULSADO,
  PENALIZACION_SIN_QUINTETO,
} from "@/src/lib/scoring/constantes";

const DIR_NORMAS = join(process.cwd(), "src", "app", "normas");
const RUTA_STRINGS = join(process.cwd(), "es", "strings.json");

function leerTsxNormas(): Array<{ readonly nombre: string; readonly texto: string }> {
  const entradas = readdirSync(DIR_NORMAS);
  return entradas
    .filter((n) => n.endsWith(".tsx") && !n.endsWith(".test.tsx"))
    .map((nombre) => ({
      nombre,
      texto: readFileSync(join(DIR_NORMAS, nombre), "utf8"),
    }));
}

describe("normas vars y fuente unica (RF-09, RF-11, E-01)", () => {
  test("constantes del motor exportadas sin defecto", () => {
    expect(typeof BONUS_POSICION).toBe("number");
    expect(typeof BONUS_MVP).toBe("number");
    expect(typeof PENALIZACION_POR_EXPULSADO).toBe("number");
    expect(typeof FACTOR_CAPITAN_NUM).toBe("number");
    expect(typeof FACTOR_CAPITAN_DEN).toBe("number");
    expect(typeof HORAS_CIERRE).toBe("number");
    expect(typeof PENALIZACION_SIN_QUINTETO).toBe("number");
  });

  test("tsx de normas importan constantes del motor", () => {
    const ficheros = leerTsxNormas();
    expect(ficheros.length).toBeGreaterThan(0);
    const conImport = ficheros.filter((f) =>
      f.texto.includes("src/lib/scoring/constantes"),
    );
    expect(conImport.length).toBeGreaterThan(0);
    const nombres = conImport.map((f) => f.nombre);
    expect(nombres).toContain("bloque.tsx");
  });

  test("cero literal de regla fuera de {var} en JSON y tsx", () => {
    const jsonCrudo = readFileSync(RUTA_STRINGS, "utf8");
    const ficheros = leerTsxNormas();
    const patrones: readonly RegExp[] = [
      /\+5/,
      /[−-]N/,
      /\+3/,
      /[−-]5/,
      /x1\.5/,
      /[−-]3h/,
      /[−-]10/,
    ];
    const sinVars = (s: string): string => s.replace(/\{[A-Za-z0-9_]+\}/g, "");
    const jsonSinVars = sinVars(jsonCrudo);
    for (const rx of patrones) {
      expect(jsonSinVars).not.toMatch(rx);
    }
    for (const f of ficheros) {
      const sin = sinVars(f.texto);
      for (const rx of patrones) {
        expect(sin, `${f.nombre} contiene literal ${String(rx)}`).not.toMatch(
          rx,
        );
      }
    }
  });

  test("ejemplo-pete avisa inmutabilidad y no calcula jornada", () => {
    const ficheros = leerTsxNormas();
    const ejemplo = ficheros.find((f) => f.nombre === "ejemplo-pete.tsx");
    expect(ejemplo).toBeDefined();
    expect(ejemplo?.texto).toContain("ui.normas.nota_pete");
    expect(ejemplo?.texto).not.toContain("calcularJornada");
    expect(ejemplo?.texto).not.toContain("calcularJugador");
    expect(ejemplo?.texto).not.toContain("Maider");
    expect(ejemplo?.texto).not.toContain("Páter");
    expect(ejemplo?.texto).not.toContain("username");
  });
});
