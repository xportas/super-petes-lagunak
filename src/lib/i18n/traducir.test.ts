import { afterEach, describe, expect, test, vi } from "vitest";
import * as diccionarioModulo from "./diccionario";
import { traducir } from "./index";
import type { ClaveI18n, Diccionario, VarsDe } from "./tipos";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("traducir", () => {
  test("interpola {time} en ui.home.countdown", () => {
    expect(traducir("es", "ui.home.countdown", { time: "2h" })).toBe(
      "Cierre en 2h",
    );
  });

  test("interpola {nombre} en ui.ejemplo.saludo", () => {
    expect(traducir("es", "ui.ejemplo.saludo", { nombre: "Pete" })).toBe(
      "Hola, Pete",
    );
  });

  test("clave dinámica inexistente devuelve la clave y avisa (E-03 dinámica)", () => {
    const localeDinamico: string = "es";
    const claveDinamica: string = "no.existe.dinamica";
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(traducir(localeDinamico, claveDinamica)).toBe(claveDinamica);
    expect(spy).toHaveBeenCalled();
  });

  test("valor no-string lanza error de contenido (E-05)", () => {
    vi.spyOn(diccionarioModulo, "cargarDiccionario").mockReturnValue(
      { corrupto: { clave: 123 } } as unknown as Diccionario,
    );
    const localeDinamico: string = "es";
    const claveDinamica: string = "corrupto.clave";
    expect(() => traducir(localeDinamico, claveDinamica)).toThrow();
  });

  test("{malformada sin cierre se deja como literal", () => {
    vi.spyOn(diccionarioModulo, "cargarDiccionario").mockReturnValue({
      prueba: { rota: "Hola {malformada" },
    });
    const localeDinamico: string = "es";
    const claveDinamica: string = "prueba.rota";
    expect(traducir(localeDinamico, claveDinamica)).toBe("Hola {malformada");
  });

  test("param extra en llamada dinámica se ignora en runtime", () => {
    const localeDinamico: string = "es";
    const claveDinamica: string = "ui.home.countdown";
    expect(
      traducir(localeDinamico, claveDinamica, {
        time: "1h",
        extra: "ignorado",
      }),
    ).toBe("Cierre en 1h");
  });

  test("{var} faltante avisa y devuelve la clave sin frase incompleta (E-04 dinámica)", () => {
    const localeDinamico: string = "es";
    const claveDinamica: string = "ui.home.countdown";
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(traducir(localeDinamico, claveDinamica)).toBe(claveDinamica);
    expect(spy).toHaveBeenCalled();
    spy.mockClear();
    expect(traducir(localeDinamico, claveDinamica, { otro: "x" })).toBe(
      claveDinamica,
    );
    expect(spy).toHaveBeenCalled();
  });

  test("clave sin variables se resuelve tal cual", () => {
    expect(traducir("es", "errors.close.passed")).toBe("Cierre pasado");
  });

  test("interpola valores numéricos", () => {
    const localeDinamico: string = "es";
    const claveDinamica: string = "ui.home.countdown";
    expect(traducir(localeDinamico, claveDinamica, { time: 5 })).toBe(
      "Cierre en 5",
    );
  });

  test("clave que atraviesa un string devuelve la clave y avisa", () => {
    const localeDinamico: string = "es";
    const claveDinamica: string = "ui.home.countdown.extra";
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(traducir(localeDinamico, claveDinamica)).toBe(claveDinamica);
    expect(spy).toHaveBeenCalled();
  });
});

// E-03 estático: clave inexistente no es ClaveI18n
// @ts-expect-error - E-03: clave inexistente
const _claveMala: ClaveI18n = "clave.que.no.existe";
void _claveMala;

// E-04 estático: falta {time}
// @ts-expect-error - E-04: falta la variable declarada
const _faltaTime: Record<VarsDe<"ui.home.countdown">, string | number> = {};
void _faltaTime;

// E-04 estático: sobra {extra}
const _sobraExtra: Record<VarsDe<"ui.home.countdown">, string | number> = {
  time: "x",
  // @ts-expect-error - E-04: sobra un parámetro no declarado
  extra: "y",
};
void _sobraExtra;
