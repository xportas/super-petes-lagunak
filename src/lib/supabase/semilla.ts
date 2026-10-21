export interface JugadorSemilla {
  readonly nombre: string;
  readonly nombreFnb: string;
  readonly dorsal: number | null;
  readonly posicionesValidas: readonly [string, string];
  readonly nombrePete: string | null;
  readonly img: string;
  readonly imgPete: string;
  readonly descripcion: string;
  readonly fnbUuid: string;
  readonly fechaAlta: string;
}

export interface EntrenadorSemilla {
  readonly slug: "maider" | "pater";
  readonly nombre: string;
  readonly img: string;
  readonly fnbUuid: string;
}

export interface ResultadoSemilla {
  readonly fnbUuid: string;
  readonly valoracion: number;
  readonly estado: "jugo" | "lesionado" | "no_convocado" | "dnp";
  readonly expulsado: boolean;
}

export interface JornadaSemilla {
  readonly numeroJornada: number;
  readonly numeroJornadaFnb: number;
  readonly rival: string;
  readonly esLocal: boolean;
  readonly horaPartido: string;
  readonly estado: "papel" | "calculada";
  readonly fnbMatchId: string;
  readonly fnbUniversallyId: string | null;
  readonly marcadorLocal: number | null;
  readonly marcadorVisitante: number | null;
  readonly origenResultado: "manual" | "fnb" | null;
  readonly resultados: readonly ResultadoSemilla[];
}

export interface DatosSemilla {
  readonly jugadores: readonly JugadorSemilla[];
  readonly entrenadores: readonly EntrenadorSemilla[];
  readonly jornadas: readonly JornadaSemilla[];
  readonly adminUsername: string;
  readonly adminPasswordHash: string;
  readonly codigoInvitacion: string;
}

const FECHA_ALTA = "2026-09-01T00:00:00+02:00";

function leerEnvConFallback(nombre: string, fallback: string): string {
  const v = process.env[nombre];
  if (typeof v === "string" && v.length > 0) {
    return v;
  }
  return fallback;
}

export function datosSemilla(): DatosSemilla {
  const jugadores: readonly JugadorSemilla[] = [
    {
      nombre: "Mario Sarasa",
      nombreFnb: "MARIO SARASA GIL",
      dorsal: 8,
      posicionesValidas: ["B", "E"],
      nombrePete: null,
      img: "public/players/placeholder.webp",
      imgPete: "public/players/placeholder-pete.webp",
      descripcion: "Base de la casa",
      fnbUuid: "c66dee66-eb38-11e9-83ca-0216824770c2",
      fechaAlta: FECHA_ALTA,
    },
    {
      nombre: "Inari Iturri",
      nombreFnb: "INARI ITURRI CILVETI",
      dorsal: 10,
      posicionesValidas: ["E", "A"],
      nombrePete: null,
      img: "public/players/placeholder.webp",
      imgPete: "public/players/placeholder-pete.webp",
      descripcion: "Exterior completísimo",
      fnbUuid: "c663ea09-eb38-11e9-83ca-0216824770c2",
      fechaAlta: FECHA_ALTA,
    },
    {
      nombre: "Iker Balda",
      nombreFnb: "IKER BALDA AFONSO",
      dorsal: 12,
      posicionesValidas: ["B", "AP"],
      nombrePete: null,
      img: "public/players/placeholder.webp",
      imgPete: "public/players/placeholder-pete.webp",
      descripcion: "Anotador voraz",
      fnbUuid: "c66df5a9-eb38-11e9-83ca-0216824770c2",
      fechaAlta: FECHA_ALTA,
    },
    {
      nombre: "Iñigo Ortega",
      nombreFnb: "IÑIGO ORTEGA CARCAMO",
      dorsal: 14,
      posicionesValidas: ["AP", "P"],
      nombrePete: null,
      img: "public/players/placeholder.webp",
      imgPete: "public/players/placeholder-pete.webp",
      descripcion: "Músculo interior",
      fnbUuid: "c67324d5-eb38-11e9-83ca-0216824770c2",
      fechaAlta: FECHA_ALTA,
    },
    {
      nombre: "Xabier Portas",
      nombreFnb: "XABIER PORTAS GONZALEZ",
      dorsal: 15,
      posicionesValidas: ["E", "AP"],
      nombrePete: null,
      img: "public/players/placeholder.webp",
      imgPete: "public/players/placeholder-pete.webp",
      descripcion: "Comodín táctico",
      fnbUuid: "9fb20b1e-9742-43fc-9ea2-ddeef9fbeae5",
      fechaAlta: FECHA_ALTA,
    },
    {
      nombre: "Marcos Gómez",
      nombreFnb: "MARCOS GOMEZ ARNEDO",
      dorsal: 16,
      posicionesValidas: ["AP", "P"],
      nombrePete: null,
      img: "public/players/placeholder.webp",
      imgPete: "public/players/placeholder-pete.webp",
      descripcion: "Pívot fajador",
      fnbUuid: "d441b014-9ee3-49e8-a1d0-b4b561dbf362",
      fechaAlta: FECHA_ALTA,
    },
    {
      nombre: "Andoni Estirado",
      nombreFnb: "ANDONI ESTIRADO GAISAN",
      dorsal: 17,
      posicionesValidas: ["B", "P"],
      nombrePete: null,
      img: "public/players/placeholder.webp",
      imgPete: "public/players/placeholder-pete.webp",
      descripcion: "Todo pista",
      fnbUuid: "6d3c74db-5426-42ad-8c5c-cc276a0489a4",
      fechaAlta: FECHA_ALTA,
    },
    {
      nombre: "Javier Bringas",
      nombreFnb: "JAVIER BRINGAS BASTERRA",
      dorsal: 21,
      posicionesValidas: ["E", "P"],
      nombrePete: null,
      img: "public/players/placeholder.webp",
      imgPete: "public/players/placeholder-pete.webp",
      descripcion: "Tirador de rachas",
      fnbUuid: "c66df169-eb38-11e9-83ca-0216824770c2",
      fechaAlta: FECHA_ALTA,
    },
    {
      nombre: "Oskar Zurdo",
      nombreFnb: "OSKAR ZURDO FERNANDEZ",
      dorsal: 22,
      posicionesValidas: ["B", "AP"],
      nombrePete: null,
      img: "public/players/placeholder.webp",
      imgPete: "public/players/placeholder-pete.webp",
      descripcion: "Director silencioso",
      fnbUuid: "579eb47a-d2f5-4125-81ec-2bdf9d050bd6",
      fechaAlta: FECHA_ALTA,
    },
    {
      nombre: "Asier Valencia",
      nombreFnb: "ASIER VALENCIA ARBIZU",
      dorsal: 23,
      posicionesValidas: ["AP", "P"],
      nombrePete: null,
      img: "public/players/placeholder.webp",
      imgPete: "public/players/placeholder-pete.webp",
      descripcion: "Referencia interior",
      fnbUuid: "c66df3c0-eb38-11e9-83ca-0216824770c2",
      fechaAlta: FECHA_ALTA,
    },
    {
      nombre: "Marc Catalán",
      nombreFnb: "MARC CATALAN FEIJOO",
      dorsal: 30,
      posicionesValidas: ["E", "AP"],
      nombrePete: null,
      img: "public/players/placeholder.webp",
      imgPete: "public/players/placeholder-pete.webp",
      descripcion: "Rebote y brega",
      fnbUuid: "c6684685-eb38-11e9-83ca-0216824770c2",
      fechaAlta: FECHA_ALTA,
    },
    {
      nombre: "David Vital",
      nombreFnb: "DAVID VITAL PAGOLA",
      dorsal: null,
      posicionesValidas: ["B", "E"],
      nombrePete: null,
      img: "public/players/placeholder.webp",
      imgPete: "public/players/placeholder-pete.webp",
      descripcion: "Canterano en órbita",
      fnbUuid: "c668475e-eb38-11e9-83ca-0216824770c2",
      fechaAlta: FECHA_ALTA,
    },
  ];

  const entrenadores: readonly EntrenadorSemilla[] = [
    {
      slug: "maider",
      nombre: "Maider",
      img: "public/coaches/maider.webp",
      fnbUuid: "c663ff92-eb38-11e9-83ca-0216824770c2",
    },
    {
      slug: "pater",
      nombre: "Páter",
      img: "public/coaches/pater.webp",
      fnbUuid: "c66dca7c-eb38-11e9-83ca-0216824770c2",
    },
  ];

  const j1Resultados: readonly ResultadoSemilla[] = [];

  const j2Resultados: readonly ResultadoSemilla[] = [
    {
      fnbUuid: "c66dee66-eb38-11e9-83ca-0216824770c2",
      valoracion: 1,
      estado: "jugo",
      expulsado: false,
    },
    {
      fnbUuid: "c663ea09-eb38-11e9-83ca-0216824770c2",
      valoracion: 6,
      estado: "jugo",
      expulsado: false,
    },
    {
      fnbUuid: "c66df5a9-eb38-11e9-83ca-0216824770c2",
      valoracion: 12,
      estado: "jugo",
      expulsado: false,
    },
    {
      fnbUuid: "c67324d5-eb38-11e9-83ca-0216824770c2",
      valoracion: 7,
      estado: "jugo",
      expulsado: false,
    },
    {
      fnbUuid: "9fb20b1e-9742-43fc-9ea2-ddeef9fbeae5",
      valoracion: 2,
      estado: "jugo",
      expulsado: false,
    },
    {
      fnbUuid: "d441b014-9ee3-49e8-a1d0-b4b561dbf362",
      valoracion: 0,
      estado: "jugo",
      expulsado: true,
    },
    {
      fnbUuid: "6d3c74db-5426-42ad-8c5c-cc276a0489a4",
      valoracion: 8,
      estado: "jugo",
      expulsado: false,
    },
    {
      fnbUuid: "c66df169-eb38-11e9-83ca-0216824770c2",
      valoracion: 1,
      estado: "jugo",
      expulsado: false,
    },
    {
      fnbUuid: "579eb47a-d2f5-4125-81ec-2bdf9d050bd6",
      valoracion: -1,
      estado: "jugo",
      expulsado: false,
    },
    {
      fnbUuid: "c66df3c0-eb38-11e9-83ca-0216824770c2",
      valoracion: 13,
      estado: "jugo",
      expulsado: false,
    },
    {
      fnbUuid: "c6684685-eb38-11e9-83ca-0216824770c2",
      valoracion: -1,
      estado: "jugo",
      expulsado: false,
    },
    {
      fnbUuid: "c668475e-eb38-11e9-83ca-0216824770c2",
      valoracion: 0,
      estado: "no_convocado",
      expulsado: false,
    },
  ];

  const jornadas: readonly JornadaSemilla[] = [
    {
      numeroJornada: 1,
      numeroJornadaFnb: 1,
      rival: "BERRIOZAR MKE",
      esLocal: false,
      horaPartido: "2026-10-03T18:00:00+02:00",
      estado: "papel",
      fnbMatchId: "55483",
      fnbUniversallyId: null,
      marcadorLocal: 64,
      marcadorVisitante: 58,
      origenResultado: null,
      resultados: j1Resultados,
    },
    {
      numeroJornada: 2,
      numeroJornadaFnb: 2,
      rival: "PAYVI TABERNA SANDUZELAI",
      esLocal: true,
      horaPartido: "2026-10-11T18:00:00+02:00",
      estado: "calculada",
      fnbMatchId: "55488",
      fnbUniversallyId: "6acbcc7bd75749bb61a786f8",
      marcadorLocal: 67,
      marcadorVisitante: 42,
      origenResultado: "fnb",
      resultados: j2Resultados,
    },
  ];

  return {
    jugadores,
    entrenadores,
    jornadas,
    adminUsername: leerEnvConFallback("ADMIN_USERNAME", "admin"),
    adminPasswordHash: leerEnvConFallback(
      "ADMIN_PASSWORD_HASH",
      "dev-hash-pendiente-de-cambio",
    ),
    codigoInvitacion: leerEnvConFallback(
      "CODIGO_INVITACION",
      "DEV-INVITACION-03",
    ),
  };
}
