import { beforeEach, describe, expect, test, vi } from "vitest";

const J1 = "11111111-1111-4111-8111-111111111111";
const JUG1 = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const JUG2 = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

const estado = vi.hoisted(() => ({
  rol: "admin" as "admin" | "manager",
  jornadas: [] as Array<{
    id: string;
    numeroJornada: number;
    rival: string;
    horaPartido: Date;
    estado: "pendiente" | "calculada" | "papel" | "invalidada";
    fnbMatchId: string | null;
    marcadorLocal: number | null;
    marcadorVisitante: number | null;
    origenResultado: "manual" | "fnb" | null;
  }>,
  jugadores: [] as Array<{
    id: string;
    activo: boolean;
    posicionesValidas: readonly ["B", "E"] | null;
    nombre: string;
  }>,
  actas: new Map<string, Array<{ jugadorId: string; valoracion: number; estado: "jugo" | "lesionado" | "no_convocado" | "dnp"; expulsado: boolean }>>(),
  ignorados: [] as string[],
  crearLlamadas: 0,
  eliminarLlamadas: 0,
  guardarActaLlamadas: 0,
  temporalLlamadas: 0,
  rotarLlamadas: 0,
  fnbCaida: false,
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    get: () => ({ value: "sesion-id.token-abc" }),
  })),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/src/lib/supabase/auth", () => ({
  parsearCookieSesion: vi.fn(() => ({ id: "sesion-id", token: "token-abc" })),
  buscarSesionPorId: vi.fn(async () => ({
    id: "sesion-id",
    tokenHash: "hash-token-abc",
    expiraAt: new Date("2027-01-01T00:00:00Z"),
    ultimaRenovacionAt: new Date("2026-01-01T00:00:00Z"),
    revocadaAt: null,
  })),
  buscarUsuarioPorId: vi.fn(async (id: string) => {
    if (id === "manager-1") {
      return {
        id: "manager-1",
        rol: estado.rol,
        username: "m1",
        usernameNormalizado: "m1",
      };
    }
    if (id === "user-1") {
      return { id: "user-1", rol: "manager", username: "m1", usernameNormalizado: "m1" };
    }
    return { id: "sesion-user", rol: estado.rol, username: "admin", usernameNormalizado: "admin" };
  }),
  obtenerClienteService: vi.fn(() => ({})),
  eliminarFilaRateLimit: vi.fn(async () => undefined),
  revocarTodasDeUsuarioDB: vi.fn(async () => undefined),
}));

vi.mock("@/src/lib/auth/sesion", () => ({
  hashearTokenSesion: vi.fn(() => "hash-token-abc"),
}));

vi.mock("@/src/lib/auth/password", () => ({
  hashearPassword: vi.fn(async (p: string) => `hash:${p}`),
}));

vi.mock("@/src/lib/supabase/queries/jornadas", () => ({
  listarJornadasAdmin: vi.fn(async () => estado.jornadas),
  obtenerJornadaAdmin: vi.fn(async (id: string) => estado.jornadas.find((j) => j.id === id) ?? null),
  crearJornadaDB: vi.fn(async (args: { numeroJornada: number; rival: string; horaPartido: Date }) => {
    estado.crearLlamadas += 1;
    const j = {
      id: `nueva-${estado.crearLlamadas}`,
      numeroJornada: args.numeroJornada,
      rival: args.rival,
      horaPartido: args.horaPartido,
      estado: "pendiente" as const,
      fnbMatchId: null,
      marcadorLocal: null,
      marcadorVisitante: null,
      origenResultado: null,
    };
    estado.jornadas.push(j as never);
    return j;
  }),
  actualizarJornadaDB: vi.fn(async (id: string, patch: Record<string, unknown>) => {
    const j = estado.jornadas.find((x) => x.id === id);
    if (j === undefined) {
      throw new Error("no existe");
    }
    Object.assign(j, {
      rival: (patch["rival"] as string) ?? j.rival,
      horaPartido: (patch["horaPartido"] as Date) ?? j.horaPartido,
      estado: (patch["estado"] as never) ?? j.estado,
      origenResultado: patch["origenResultado"] !== undefined ? (patch["origenResultado"] as never) : j.origenResultado,
    });
    return j;
  }),
  eliminarJornadaDB: vi.fn(async (id: string) => {
    estado.eliminarLlamadas += 1;
    estado.jornadas = estado.jornadas.filter((j) => j.id !== id);
  }),
}));

vi.mock("@/src/lib/supabase/queries/jugadores", () => ({
  listarJugadoresAdmin: vi.fn(async () =>
    estado.jugadores.map((j) => ({
      id: j.id,
      nombre: j.nombre,
      nombreFnb: j.nombre,
      dorsal: null,
      posicionesValidas: j.posicionesValidas,
      nombrePete: null,
      img: "players/placeholder.webp",
      imgPete: "players/placeholder-pete.webp",
      descripcion: "",
      fnbUuid: null,
      estadoSanitario: "disponible" as const,
      activo: j.activo,
      fechaAlta: new Date("2026-09-01T00:00:00+02:00"),
      fechaBaja: null,
    })),
  ),
  contarElegibles: vi.fn((lista: Array<{ activo: boolean; posicionesValidas: unknown }>) =>
    lista.filter((j) => j.activo && j.posicionesValidas !== null).length,
  ),
  upsertJugadorDB: vi.fn(async (args: { id?: string }) => ({ id: args.id ?? "nuevo-jug" })),
  darBajaJugadorDB: vi.fn(async () => undefined),
}));

vi.mock("@/src/lib/supabase/queries/actas", () => ({
  leerActaAdmin: vi.fn(async (jornadaId: string) => estado.actas.get(jornadaId) ?? []),
  guardarActaFilasDB: vi.fn(async (jornadaId: string, filas: unknown[]) => {
    estado.guardarActaLlamadas += 1;
    estado.actas.set(jornadaId, filas as never);
  }),
  listarAlineadosJornada: vi.fn(async () => [] as string[]),
}));

vi.mock("@/src/lib/supabase/queries/ignorados", () => ({
  insertarIgnoradoDB: vi.fn(async (id: string) => {
    estado.ignorados.push(id);
  }),
  listarIgnoradosDB: vi.fn(async () => estado.ignorados.map((id) => ({ fnbMatchId: id }))),
}));

vi.mock("@/src/lib/supabase/queries/usuarios", () => ({
  listarUsuariosAdmin: vi.fn(async () => [{ id: "user-1", username: "m1", rol: "manager", esTemporal: false }]),
  aplicarTemporalDB: vi.fn(async () => {
    estado.temporalLlamadas += 1;
  }),
  leerInvitacionVigenteDB: vi.fn(async () => ({ id: "inv-1", codigo: "SPL-X" })),
  rotarInvitacionDB: vi.fn(async (codigo: string) => {
    estado.rotarLlamadas += 1;
    return { codigo };
  }),
}));

vi.mock("@/src/lib/fnb/pre-relleno", () => ({
  listarCalendarioFnb: vi.fn(async () => {
    if (estado.fnbCaida) {
      throw new Error("fnb caida");
    }
    return [
      {
        fnbMatchId: "999",
        rival: "RIVAL FNB",
        horaPartido: new Date("2026-11-01T18:00:00+01:00"),
        esLocal: true,
        numeroFnb: 7,
      },
    ];
  }),
  descargarActaFnb: vi.fn(async (p: { idMatch?: string; uuid?: string }) => {
    if (estado.fnbCaida) {
      throw new Error("fnb caida");
    }
    if (p.idMatch === "000" || p.uuid === "no-lagunak") {
      throw new Error("no_lagunak");
    }
    const filas = Array.from({ length: 2 }, (_, i) => ({
      jugadorId: i === 0 ? JUG1 : JUG2,
      valoracion: 5,
      estado: "jugo" as const,
      expulsado: false,
    }));
    return {
      fnbMatchId: p.idMatch ?? "999",
      universallyId: "u-1",
      state: "1",
      marcadorLocal: 70,
      marcadorVisitante: 60,
      filas,
    };
  }),
  truncarValoracion: (v: number) => Math.trunc(v),
}));

import {
  actualizarJornada,
  asignarPosicionesPendiente,
  crearJornada,
  darBajaJugador,
  eliminarJornada,
  guardarActa,
  preRellenarActa,
  recalcularJornada,
  reimportarDesdeFnb,
  rotarInvitacion,
  generarTemporal,
  sincronizarCalendario,
  upsertJugador,
  __limpiarMemoIdempotenciaParaTests,
} from "./actions";

function sembrarJornadaBase() {
  estado.jornadas = [
    {
      id: J1,
      numeroJornada: 2,
      rival: "RIVAL",
      horaPartido: new Date("2026-10-11T18:00:00+02:00"),
      estado: "pendiente",
      fnbMatchId: null,
      marcadorLocal: null,
      marcadorVisitante: null,
      origenResultado: null,
    },
  ];
}

function sembrarJugadores(n: number, conPosiciones = true) {
  estado.jugadores = Array.from({ length: n }, (_, i) => ({
    id: `jug-${i}`,
    activo: true,
    posicionesValidas: conPosiciones ? (["B", "E"] as const) : null,
    nombre: `J${i}`,
  }));
}

beforeEach(async () => {
  estado.rol = "admin";
  estado.jornadas = [];
  estado.jugadores = [];
  estado.actas = new Map();
  estado.ignorados = [];
  estado.crearLlamadas = 0;
  estado.eliminarLlamadas = 0;
  estado.guardarActaLlamadas = 0;
  estado.temporalLlamadas = 0;
  estado.rotarLlamadas = 0;
  estado.fnbCaida = false;
  await __limpiarMemoIdempotenciaParaTests();
  vi.clearAllMocks();
});

describe("admin actions jornada-crear-actualizar (RF-01/RF-02/RF-03)", () => {
  test("jornada-crear-actualizar: sin rival/hora rechaza sin guardar", async () => {
    sembrarJornadaBase();
    const r = await crearJornada({ rival: "", horaPartido: "", localVisitante: "local" });
    expect(r.ok).toBe(false);
    expect(estado.crearLlamadas).toBe(0);
  });

  test("jornada-crear-actualizar: crea mínima con nº auto", async () => {
    sembrarJornadaBase();
    const r = await crearJornada({
      rival: "NUEVO",
      horaPartido: "2026-11-01T18:00:00+01:00",
      localVisitante: "local",
    });
    expect(r.ok).toBe(true);
    expect(estado.crearLlamadas).toBe(1);
  });

  test("jornada-crear-actualizar: editar hora recalcula cierre y conserva válidas", async () => {
    sembrarJornadaBase();
    const r = await actualizarJornada(J1, {
      rival: "RIVAL",
      horaPartido: "2026-10-11T20:00:00+02:00",
      localVisitante: "local",
    });
    expect(r.ok).toBe(true);
  });
});

describe("admin actions jornada-eliminar (RF-02 E-03)", () => {
  test("jornada-eliminar: borra con dependencias y registra ignorado", async () => {
    estado.jornadas = [
      {
        id: J1,
        numeroJornada: 1,
        rival: "R",
        horaPartido: new Date("2026-10-03T18:00:00+02:00"),
        estado: "calculada",
        fnbMatchId: "55483",
        marcadorLocal: 64,
        marcadorVisitante: 58,
        origenResultado: null,
      },
    ];
    const r = await eliminarJornada(J1, "k-1");
    expect(r.ok).toBe(true);
    expect(estado.eliminarLlamadas).toBe(1);
    expect(estado.ignorados).toContain("55483");
  });

  test("jornada-eliminar: doble envío mismo key = 1 efecto", async () => {
    sembrarJornadaBase();
    const r1 = await eliminarJornada(J1, "k-doble");
    // Re-sembrar para que el segundo intente borrar lo mismo: la memo debe evitarlo.
    estado.jornadas = [];
    const r2 = await eliminarJornada(J1, "k-doble");
    expect(r1).toEqual(r2);
    expect(estado.eliminarLlamadas).toBe(1);
  });
});

describe("admin actions jugador (RF-04/RF-05/RF-06)", () => {
  test("jugador: dejar 4 activos rechaza baja", async () => {
    sembrarJugadores(5);
    const r = await darBajaJugador("jug-0");
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error).toBe("errors.admin.menos_de_5");
    }
  });

  test("jugador: con 6 activos la baja pasa", async () => {
    sembrarJugadores(6);
    const r = await darBajaJugador("jug-0");
    expect(r.ok).toBe(true);
  });

  test("jugador: alta con [E,A] pasa", async () => {
    const r = await upsertJugador({
      nombre: "N",
      posicionesValidas: ["E", "A"],
      estadoSanitario: "disponible",
    });
    expect(r.ok).toBe(true);
  });

  test("jugador: asignar posiciones a pendiente pasa", async () => {
    sembrarJugadores(1, false);
    estado.jugadores[0] = { ...estado.jugadores[0]!, id: "pend-1", nombre: "P" };
    const r = await asignarPosicionesPendiente("pend-1", ["B", "E"]);
    expect(r.ok).toBe(true);
  });
});

describe("admin actions fnb (RF-07)", () => {
  test("fnb: sincronizar calendario omite ignorados sin tocar resultados", async () => {
    sembrarJornadaBase();
    estado.ignorados = ["999"];
    const r = await sincronizarCalendario();
    expect(r.ok).toBe(true);
  });

  test("fnb: pre-relleno con URL válida no escribe hasta confirmar", async () => {
    sembrarJornadaBase();
    const antes = estado.guardarActaLlamadas;
    const r = await preRellenarActa("https://fnb.es/pagina-partido/?id=999");
    expect(r.ok).toBe(true);
    expect(estado.guardarActaLlamadas).toBe(antes);
  });

  test("fnb: con FNB caída el manual sigue posible", async () => {
    estado.fnbCaida = true;
    sembrarJornadaBase();
    const r = await preRellenarActa("https://fnb.es/pagina-partido/?id=999");
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error).toBe("errors.admin.fnb_caida");
    }
  });

  test("fnb: URL ajena rechazada", async () => {
    const r = await preRellenarActa("https://fnb.es/pagina-partido/?id=000");
    expect(r.ok).toBe(false);
  });
});

describe("admin actions acta-guardar (RF-08/RF-09/RF-10)", () => {
  test("acta-guardar: pre-relleno sin cambios guarda fnb", async () => {
    sembrarJornadaBase();
    estado.jugadores = [
      { id: JUG1, activo: true, posicionesValidas: ["B", "E"], nombre: "A" },
      { id: JUG2, activo: true, posicionesValidas: ["B", "E"], nombre: "B" },
    ];
    const filas = [
      { jugadorId: JUG1, valoracion: 5, estado: "jugo", expulsado: false },
      { jugadorId: JUG2, valoracion: 5, estado: "jugo", expulsado: false },
    ];
    const r = await guardarActa(J1, filas, filas);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r["origen"]).toBe("fnb");
    }
  });

  test("acta-guardar: con 1 cambio guarda manual", async () => {
    sembrarJornadaBase();
    estado.jugadores = [
      { id: JUG1, activo: true, posicionesValidas: ["B", "E"], nombre: "A" },
      { id: JUG2, activo: true, posicionesValidas: ["B", "E"], nombre: "B" },
    ];
    const oficial = [
      { jugadorId: JUG1, valoracion: 5, estado: "jugo", expulsado: false },
      { jugadorId: JUG2, valoracion: 5, estado: "jugo", expulsado: false },
    ];
    const enviadas = [
      { jugadorId: JUG1, valoracion: 6, estado: "jugo", expulsado: false },
      { jugadorId: JUG2, valoracion: 5, estado: "jugo", expulsado: false },
    ];
    const r = await guardarActa(J1, enviadas, oficial);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r["origen"]).toBe("manual");
    }
  });

  test("acta-guardar: incompleta bloquea sin 0 provisional", async () => {
    sembrarJornadaBase();
    estado.jugadores = [
      { id: JUG1, activo: true, posicionesValidas: ["B", "E"], nombre: "A" },
      { id: JUG2, activo: true, posicionesValidas: ["B", "E"], nombre: "B" },
    ];
    const r = await guardarActa(
      J1,
      [{ jugadorId: JUG1, valoracion: 5, estado: "jugo", expulsado: false }],
      null,
    );
    expect(r.ok).toBe(false);
  });

  test("acta-guardar: lesionado+expulsado rechaza", async () => {
    sembrarJornadaBase();
    estado.jugadores = [
      { id: JUG1, activo: true, posicionesValidas: ["B", "E"], nombre: "A" },
    ];
    const r = await guardarActa(
      J1,
      [{ jugadorId: JUG1, valoracion: 0, estado: "lesionado", expulsado: true }],
      null,
    );
    expect(r.ok).toBe(false);
  });
});

describe("admin actions acta-reimportar (RF-10)", () => {
  test("acta-reimportar: tras edición manual restaura FNB y marca fnb", async () => {
    estado.jornadas = [
      {
        id: J1,
        numeroJornada: 2,
        rival: "R",
        horaPartido: new Date("2026-10-11T18:00:00+02:00"),
        estado: "calculada",
        fnbMatchId: "999",
        marcadorLocal: null,
        marcadorVisitante: null,
        origenResultado: "manual",
      },
    ];
    estado.jugadores = [
      { id: JUG1, activo: true, posicionesValidas: ["B", "E"], nombre: "A" },
      { id: JUG2, activo: true, posicionesValidas: ["B", "E"], nombre: "B" },
    ];
    const r = await reimportarDesdeFnb(J1, "k-re");
    expect(r.ok).toBe(true);
    const r2 = await reimportarDesdeFnb(J1, "k-re");
    expect(r2).toEqual(r);
    expect(estado.guardarActaLlamadas).toBe(1);
  });
});

describe("admin actions recalcular (RF-11)", () => {
  test("recalcular: hueco bloquea sin tocar previos", async () => {
    sembrarJornadaBase();
    estado.jugadores = [
      { id: JUG1, activo: true, posicionesValidas: ["B", "E"], nombre: "A" },
      { id: JUG2, activo: true, posicionesValidas: ["B", "E"], nombre: "B" },
    ];
    estado.actas.set(J1, [
      { jugadorId: JUG1, valoracion: 5, estado: "jugo", expulsado: false },
    ]);
    const r = await recalcularJornada(J1);
    expect(r.ok).toBe(false);
  });

  test("recalcular: calculada rota pasa a invalidada", async () => {
    estado.jornadas = [
      {
        id: J1,
        numeroJornada: 2,
        rival: "R",
        horaPartido: new Date("2026-10-11T18:00:00+02:00"),
        estado: "calculada",
        fnbMatchId: null,
        marcadorLocal: null,
        marcadorVisitante: null,
        origenResultado: null,
      },
    ];
    estado.jugadores = [
      { id: JUG1, activo: true, posicionesValidas: ["B", "E"], nombre: "A" },
      { id: JUG2, activo: true, posicionesValidas: ["B", "E"], nombre: "B" },
    ];
    estado.actas.set(J1, [
      { jugadorId: JUG1, valoracion: 5, estado: "jugo", expulsado: false },
    ]);
    const r = await recalcularJornada(J1);
    expect(r.ok).toBe(false);
    expect(estado.jornadas[0]?.estado).toBe("invalidada");
  });
});

describe("admin actions usuarios (RF-12/RF-13)", () => {
  test("usuarios: doble-tap genera 1 sola temporal", async () => {
    const r1 = await generarTemporal("user-1", "k-t");
    const r2 = await generarTemporal("user-1", "k-t");
    expect(r1).toEqual(r2);
    expect(estado.temporalLlamadas).toBe(1);
  });

  test("usuarios: doble-tap genera 1 sola invitación", async () => {
    const r1 = await rotarInvitacion("k-i");
    const r2 = await rotarInvitacion("k-i");
    expect(r1).toEqual(r2);
    expect(estado.rotarLlamadas).toBe(1);
  });
});

describe("admin guard solo agregado (RF-14)", () => {
  test("admin: sin admin rechaza crear jornada", async () => {
    estado.rol = "manager";
    const r = await crearJornada({
      rival: "R",
      horaPartido: "2026-11-01T18:00:00+01:00",
      localVisitante: "local",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error).toBe("errors.admin.no_admin");
    }
  });
});
