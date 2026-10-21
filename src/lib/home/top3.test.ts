import { describe, expect, test } from "vitest";
import {
  puestosOlimpicos,
  resolverUltimaCalculada,
  top3Jugadores,
  top3Managers,
} from "./top3";

describe("puestosOlimpicos", () => {
  test("empate en cabeza comparte puesto y salta al 3 (1,1,3)", () => {
    const filas = [
      { id: "a", puntos: 20 },
      { id: "b", puntos: 20 },
      { id: "c", puntos: 15 },
    ];
    const conPuesto = puestosOlimpicos(filas, (f) => f.puntos);
    expect(conPuesto.map((f) => f.puesto)).toEqual([1, 1, 3]);
  });

  test("corte duro en 3 filas con 4 empatados", () => {
    const entrada = new Map([
      ["m1", { username: "anna", puntos: 10 }],
      ["m2", { username: "bob", puntos: 10 }],
      ["m3", { username: "carla", puntos: 10 }],
      ["m4", { username: "dani", puntos: 10 }],
    ]);
    const top = top3Managers(entrada, "J2");
    expect(top).toHaveLength(3);
    expect(top.map((f) => f.puesto)).toEqual([1, 1, 1]);
  });
});

describe("top3Managers (RF-09, E-05/E-06)", () => {
  test("excluye Admin y -10 (sin envío)", () => {
    const entrada = new Map([
      ["admin", { username: "admin", puntos: 99, esAdmin: true as const }],
      ["sin", { username: "sinquinteto", puntos: -10 }],
      ["ok1", { username: "maria", puntos: 12 }],
    ]);
    const top = top3Managers(entrada, "J2");
    expect(top.map((f) => f.username)).toEqual(["maria"]);
    expect(top[0]?.puesto).toBe(1);
    expect(top[0]?.jornadaEtiqueta).toBe("J2");
  });

  test("ordena por puntos DESC y desempata por username ci", () => {
    const entrada = new Map([
      ["b", { username: "bob", puntos: 10 }],
      ["a", { username: "Anna", puntos: 10 }],
      ["c", { username: "carla", puntos: 12 }],
    ]);
    const top = top3Managers(entrada, "J2");
    expect(top.map((f) => f.username)).toEqual(["carla", "Anna", "bob"]);
    expect(top.map((f) => f.puesto)).toEqual([1, 2, 2]);
  });

  test("entrada vacía devuelve vacío (Sin datos)", () => {
    expect(top3Managers(new Map(), "J2")).toEqual([]);
  });
});

describe("top3Jugadores (RF-10, E-06)", () => {
  test("ordena por BASE DESC, excluye Maider/Páter y desempata por nombre real", () => {
    const bases = [
      { jugadorId: "maider", nombre: "Maider", base: 99, esEntrenador: true as const },
      { jugadorId: "pater", nombre: "Páter", base: 99, esEntrenador: true as const },
      { jugadorId: "b", nombre: "Zoe", base: 12 },
      { jugadorId: "a", nombre: "arnau", base: 12 },
      { jugadorId: "c", nombre: "Marta", base: 7 },
    ];
    const top = top3Jugadores(bases, "J2");
    expect(top.map((f) => f.jugadorId)).toEqual(["a", "b", "c"]);
    expect(top.map((f) => f.puesto)).toEqual([1, 1, 3]);
  });

  test("incluye 0 y negativos ordenados", () => {
    const bases = [
      { jugadorId: "a", nombre: "A", base: 0 },
      { jugadorId: "b", nombre: "B", base: -1 },
      { jugadorId: "c", nombre: "C", base: 5 },
    ];
    const top = top3Jugadores(bases, "J2");
    expect(top.map((f) => f.base)).toEqual([5, 0, -1]);
  });

  test("modo Pete no altera el corte (usa nombre real)", () => {
    const bases = [
      { jugadorId: "a", nombre: "Arnau", nombrePete: "Zzz", base: 10 },
      { jugadorId: "b", nombre: "Bruno", nombrePete: "Aaa", base: 10 },
      { jugadorId: "c", nombre: "Carla", nombrePete: "Mmm", base: 10 },
      { jugadorId: "d", nombre: "Dani", nombrePete: "Bbb", base: 10 },
    ];
    const top = top3Jugadores(bases, "J2");
    expect(top.map((f) => f.jugadorId)).toEqual(["a", "b", "c"]);
  });
});

describe("resolverUltimaCalculada re-exportada (RF-08, E-01)", () => {
  test("sin calculada devuelve null", () => {
    expect(
      resolverUltimaCalculada([
        {
          jornadaId: "j1",
          numeroJornada: 1,
          horaPartido: new Date("2026-10-03T18:00:00+02:00"),
          estado: "papel" as const,
        },
      ]),
    ).toBeNull();
  });
});
