import { describe, expect, test } from "vitest";
import { crearRegistroIdempotencia, hashContenido } from "./idempotencia";

describe("admin idempotencia (RF-15/E-16)", () => {
  test("mismo contenido mismo hash", () => {
    const a = { x: 1, y: [2, 3] };
    const b = { y: [2, 3], x: 1 };
    expect(hashContenido(a)).toBe(hashContenido(b));
  });

  test("distinto contenido distinto hash", () => {
    expect(hashContenido({ x: 1 })).not.toBe(hashContenido({ x: 2 }));
  });

  test("doble ejecución misma clave = 1 efecto", () => {
    const reg = crearRegistroIdempotencia<number>();
    let llamadas = 0;
    const efecto = () => {
      llamadas += 1;
      return 42;
    };
    const r1 = reg.ejecutar("k", efecto);
    const r2 = reg.ejecutar("k", efecto);
    expect(r1).toEqual({ valor: 42, repetido: false });
    expect(r2).toEqual({ valor: 42, repetido: true });
    expect(llamadas).toBe(1);
  });
});
