import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { calcularJornada } from "../scoring/calcular-jornada";
import type {
  EntradaJornada,
  EntradaJugador,
  Posicion,
} from "../scoring/tipos";
import { aDesgloseVista } from "./historial";
import type { IconoEstado } from "./tipos";

function jugador(
  jugadorId: string,
  over: Partial<EntradaJugador> = {},
): EntradaJugador {
  return {
    jugadorId,
    valoracionFNB: 10,
    estado: "jugo",
    expulsado: false,
    posicionesValidas: ["B", "E"] as readonly [Posicion, Posicion],
    posicionAlineada: "B",
    esCapitan: false,
    ...over,
  };
}

function iconoDe(j: EntradaJugador): IconoEstado {
  if (j.estado === "lesionado") {
    return "lesionado";
  }
  if (j.estado === "no_convocado") {
    return "no_convocado";
  }
  if (j.estado === "dnp") {
    return "dnp";
  }
  return "jugo";
}

function metasDe(quinteto: readonly EntradaJugador[]) {
  return quinteto.map((j) => ({
    jugadorId: j.jugadorId,
    posicionAlineada: j.posicionAlineada,
    esCapitan: j.esCapitan,
    icono: iconoDe(j),
    expulsado: j.expulsado,
  }));
}

describe("desglose derivado del motor (RF-09, RF-10, RF-11)", () => {
  test("orden BASE→entrenador→+5→-N→subtotal→+3→-5→TOTAL 1:1 sin recalcular", () => {
    const quinteto = [
      jugador("a", { valoracionFNB: 12, esCapitan: true }),
      jugador("b", { valoracionFNB: 8 }),
      jugador("c", { valoracionFNB: 6 }),
      jugador("d", { valoracionFNB: 4 }),
      jugador("e", { valoracionFNB: 2 }),
    ];
    const entrada: EntradaJornada = {
      entrenador: "maider",
      quinteto,
      penalizacionRachaPorJugador: {},
      plantillaBaseMax: { maxBase: 12, capitanEsMaximo: true, jugoAlguno: true },
    };
    const calculado = calcularJornada(entrada);
    if ("error" in calculado) {
      throw new Error("el motor no debería fallar aquí");
    }
    const vista = aDesgloseVista({
      jornadaId: "j2",
      numeroJornada: 2,
      horaPartido: new Date("2026-10-11T18:00:00+02:00"),
      entrenador: "maider",
      resultado: calculado,
      metas: metasDe(quinteto),
    });
    expect(vista.lineas).toHaveLength(5);
    for (const linea of vista.lineas) {
      const original = calculado.porJugador.find(
        (d) => d.jugadorId === linea.jugadorId,
      );
      if (original === undefined) {
        throw new Error("línea sin origen en el motor");
      }
      // 1:1 sin recalcular a mano.
      expect(linea.base).toBe(original.base);
      expect(linea.trasEntrenador).toBe(original.trasEntrenador);
      expect(linea.bonusPosicion).toBe(original.bonusPosicion);
      expect(linea.penalizacionRacha).toBe(original.penalizacionRacha);
      // Orden fijo: subtotal compone trasEntrenador + bonus + racha.
      expect(linea.subtotal).toBe(
        linea.trasEntrenador + linea.bonusPosicion + linea.penalizacionRacha,
      );
    }
    expect(vista.bonusMvp).toBe(calculado.bonusMvp);
    expect(vista.penalizacionExpulsion).toBe(calculado.penalizacionExpulsion);
    // TOTAL compone subtotales + MVP + expulsión.
    const suma = vista.lineas.reduce((acc, l) => acc + l.subtotal, 0);
    expect(vista.total).toBe(suma + vista.bonusMvp + vista.penalizacionExpulsion);
  });

  test("cifra de entrenador solo en líneas; cabecera sin cifra (RF-10)", () => {
    const quinteto = [jugador("a"), jugador("b"), jugador("c"), jugador("d"), jugador("e")];
    const entrada: EntradaJornada = {
      entrenador: "pater",
      quinteto,
      penalizacionRachaPorJugador: {},
      plantillaBaseMax: { maxBase: 10, capitanEsMaximo: false, jugoAlguno: true },
    };
    const calculado = calcularJornada(entrada);
    if ("error" in calculado) {
      throw new Error("el motor no debería fallar aquí");
    }
    const vista = aDesgloseVista({
      jornadaId: "j2",
      numeroJornada: 2,
      horaPartido: new Date("2026-10-11T18:00:00+02:00"),
      entrenador: "pater",
      resultado: calculado,
      metas: metasDe(quinteto),
    });
    expect(vista.entrenador).toBe("pater");
    expect("trasEntrenador" in vista).toBe(false);
    expect("cifraEntrenador" in vista).toBe(false);
    expect("bonusEntrenador" in vista).toBe(false);
    for (const linea of vista.lineas) {
      expect("trasEntrenador" in linea).toBe(true);
    }
  });

  test("conceptos a cero explícitos, no omitidos (E-15)", () => {
    const quinteto = [
      jugador("a", { posicionAlineada: "P", posicionesValidas: ["B", "E"] as readonly [Posicion, Posicion] }),
      jugador("b"),
      jugador("c"),
      jugador("d"),
      jugador("e"),
    ];
    const entrada: EntradaJornada = {
      entrenador: "maider",
      quinteto,
      penalizacionRachaPorJugador: {},
      plantillaBaseMax: { maxBase: 10, capitanEsMaximo: false, jugoAlguno: true },
    };
    const calculado = calcularJornada(entrada);
    if ("error" in calculado) {
      throw new Error("el motor no debería fallar aquí");
    }
    const vista = aDesgloseVista({
      jornadaId: "j2",
      numeroJornada: 2,
      horaPartido: new Date("2026-10-11T18:00:00+02:00"),
      entrenador: "maider",
      resultado: calculado,
      metas: metasDe(quinteto),
    });
    const lineaA = vista.lineas.find((l) => l.jugadorId === "a");
    expect(lineaA?.bonusPosicion).toBe(0);
    expect("bonusPosicion" in (lineaA as object)).toBe(true);
    expect(lineaA?.penalizacionRacha).toBe(0);
    expect(vista.bonusMvp).toBe(0);
    expect(vista.penalizacionExpulsion).toBe(0);
    expect(vista.total).toBe(
      vista.lineas.reduce((acc, l) => acc + l.subtotal, 0),
    );
  });

  test("2 expulsados: señalados en línea y −10 con BASE intacta (E-13)", () => {
    const quinteto = [
      jugador("a", { valoracionFNB: 12, expulsado: true }),
      jugador("b", { valoracionFNB: 9, expulsado: true }),
      jugador("c"),
      jugador("d"),
      jugador("e"),
    ];
    const entrada: EntradaJornada = {
      entrenador: "maider",
      quinteto,
      penalizacionRachaPorJugador: {},
      plantillaBaseMax: { maxBase: 12, capitanEsMaximo: false, jugoAlguno: true },
    };
    const calculado = calcularJornada(entrada);
    if ("error" in calculado) {
      throw new Error("el motor no debería fallar aquí");
    }
    expect(calculado.expulsiones).toBe(2);
    expect(calculado.penalizacionExpulsion).toBe(-10);
    const vista = aDesgloseVista({
      jornadaId: "j2",
      numeroJornada: 2,
      horaPartido: new Date("2026-10-11T18:00:00+02:00"),
      entrenador: "maider",
      resultado: calculado,
      metas: metasDe(quinteto),
    });
    expect(vista.penalizacionExpulsion).toBe(-10);
    const expulsados = vista.lineas.filter((l) => l.expulsado);
    expect(expulsados.map((l) => l.jugadorId).sort()).toEqual(["a", "b"]);
    // BASE intacta: el expulsado conserva su valoración.
    expect(expulsados[0]?.base).toBe(12);
    expect(expulsados[1]?.base).toBe(9);
  });

  test("capitán MVP +3 sin multiplicar con Maider y con Páter (E-14)", () => {
    const base = [
      jugador("cap", { valoracionFNB: 14, esCapitan: true }),
      jugador("b", { valoracionFNB: 8 }),
      jugador("c", { valoracionFNB: 6 }),
      jugador("d", { valoracionFNB: 4 }),
      jugador("e", { valoracionFNB: 2 }),
    ];
    for (const entrenador of ["maider", "pater"] as const) {
      const entrada: EntradaJornada = {
        entrenador,
        quinteto: base,
        penalizacionRachaPorJugador: {},
        plantillaBaseMax: { maxBase: 14, capitanEsMaximo: true, jugoAlguno: true },
      };
      const calculado = calcularJornada(entrada);
      if ("error" in calculado) {
        throw new Error("el motor no debería fallar aquí");
      }
      expect(calculado.esMvp).toBe(true);
      expect(calculado.bonusMvp).toBe(3);
      const vista = aDesgloseVista({
        jornadaId: "j2",
        numeroJornada: 2,
        horaPartido: new Date("2026-10-11T18:00:00+02:00"),
        entrenador,
        resultado: calculado,
        metas: metasDe(base),
      });
      expect(vista.esMvp).toBe(true);
      expect(vista.bonusMvp).toBe(3);
      const cap = vista.lineas.find((l) => l.jugadorId === "cap");
      if (entrenador === "maider") {
        // 14 x1.5 = 21 half-up, +5 pos aparte; el +3 va a nivel jornada.
        expect(cap?.trasEntrenador).toBe(21);
      } else {
        expect(cap?.trasEntrenador).toBe(15);
      }
      const suma = vista.lineas.reduce((acc, l) => acc + l.subtotal, 0);
      expect(vista.total).toBe(suma + 3 + vista.penalizacionExpulsion);
    }
  });

  test("BASE 0 jugando (✅) permite MVP; 0 por lesión/DNP (🚑/❌) lo bloquea (E-20)", () => {
    const quintetoJugoCero = [
      jugador("cap", { valoracionFNB: 0, estado: "jugo", esCapitan: true }),
      jugador("b", { valoracionFNB: 0, estado: "jugo" }),
      jugador("c", { valoracionFNB: 0, estado: "jugo" }),
      jugador("d", { valoracionFNB: 0, estado: "jugo" }),
      jugador("e", { valoracionFNB: 0, estado: "jugo" }),
    ];
    const conJuego = calcularJornada({
      entrenador: "maider",
      quinteto: quintetoJugoCero,
      penalizacionRachaPorJugador: {},
      plantillaBaseMax: { maxBase: 0, capitanEsMaximo: true, jugoAlguno: true },
    });
    if ("error" in conJuego) {
      throw new Error("no debería fallar con ceros jugados");
    }
    expect(conJuego.esMvp).toBe(true);
    const quintetoLesion = [
      jugador("cap", { valoracionFNB: 9, estado: "lesionado", esCapitan: true }),
      jugador("b", { valoracionFNB: 8 }),
      jugador("c"),
      jugador("d"),
      jugador("e"),
    ];
    const conLesion = calcularJornada({
      entrenador: "maider",
      quinteto: quintetoLesion,
      penalizacionRachaPorJugador: {},
      plantillaBaseMax: { maxBase: 10, capitanEsMaximo: false, jugoAlguno: true },
    });
    if ("error" in conLesion) {
      throw new Error("no debería fallar con lesionado");
    }
    expect(conLesion.esMvp).toBe(false);
    const vista = aDesgloseVista({
      jornadaId: "j2",
      numeroJornada: 2,
      horaPartido: new Date("2026-10-11T18:00:00+02:00"),
      entrenador: "maider",
      resultado: conLesion,
      metas: metasDe(quintetoLesion),
    });
    const cap = vista.lineas.find((l) => l.jugadorId === "cap");
    expect(cap?.icono).toBe("lesionado");
    expect(cap?.base).toBe(0);
    expect(cap?.bonusPosicion).toBe(0);
    expect(cap?.penalizacionRacha).toBe(0);
  });

  test("baja actual no reescribe la línea histórica (E-12)", () => {
    const quinteto = [jugador("a"), jugador("b"), jugador("c"), jugador("d"), jugador("e")];
    const calculado = calcularJornada({
      entrenador: "maider",
      quinteto,
      penalizacionRachaPorJugador: {},
      plantillaBaseMax: { maxBase: 10, capitanEsMaximo: false, jugoAlguno: true },
    });
    if ("error" in calculado) {
      throw new Error("no debería fallar");
    }
    const vista = aDesgloseVista({
      jornadaId: "j2",
      numeroJornada: 2,
      horaPartido: new Date("2026-10-11T18:00:00+02:00"),
      entrenador: "maider",
      resultado: calculado,
      metas: metasDe(quinteto),
    });
    // La vista histórica no lleva etiqueta de baja: solo slot, capitán, icono y cifras.
    for (const linea of vista.lineas) {
      expect("baja" in linea).toBe(false);
      expect("activo" in linea).toBe(false);
    }
  });

  test("meta ausente lanza en lugar de inventar cifras (RF-09)", () => {
    const quinteto = [jugador("a"), jugador("b"), jugador("c"), jugador("d"), jugador("e")];
    const calculado = calcularJornada({
      entrenador: "maider",
      quinteto,
      penalizacionRachaPorJugador: {},
      plantillaBaseMax: { maxBase: 10, capitanEsMaximo: false, jugoAlguno: true },
    });
    if ("error" in calculado) {
      throw new Error("no debería fallar");
    }
    expect(() =>
      aDesgloseVista({
        jornadaId: "j2",
        numeroJornada: 2,
        horaPartido: new Date("2026-10-11T18:00:00+02:00"),
        entrenador: "maider",
        resultado: calculado,
        metas: metasDe(quinteto).slice(0, 4),
      }),
    ).toThrow();
  });
});

describe("anti-literal (E-20/puerta)", () => {
  test("mi-resultado/clasificacion no hardcodean +5 ni x1.5", () => {
    const raices = ["src/app/mi-resultado", "src/app/clasificacion"];
    const ficheros: string[] = [];
    for (const raiz of raices) {
      if (!existsSync(join(process.cwd(), raiz))) {
        continue;
      }
      const entradas = readdirSync(join(process.cwd(), raiz));
      for (const e of entradas) {
        if (e.endsWith(".tsx")) {
          ficheros.push(join(process.cwd(), raiz, e));
        }
      }
    }
    for (const f of ficheros) {
      const texto = readFileSync(f, "utf8");
      expect(texto.includes("+5")).toBe(false);
      expect(texto.includes("x1.5")).toBe(false);
    }
    expect(true).toBe(true);
  });
});
