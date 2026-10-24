export type IconoBrutalNombre =
  | "balon"
  | "tabla"
  | "cromo"
  | "trofeo"
  | "medalla"
  | "entrenador"
  | "cambio"
  | "check"
  | "atras"
  | "stats"
  | "rayo"
  | "fuego"
  | "guardar"
  | "ajustes"
  | "normas"
  | "admin"
  | "historial"
  | "home"
  | "ayuda"
  | "cerrar"
  | "usuario";

const Trazos: Record<IconoBrutalNombre, React.JSX.Element> = {
  balon: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 3.5c-3.6 2.4-3.6 14.6 0 17M3.7 9.2c4.6.7 11.9.7 16.6 0M3.7 14.8c4.6-.7 11.9-.7 16.6 0" />
    </>
  ),
  tabla: (
    <>
      <path d="M4 20V9M10 20V4M16 20v-8M21 20H3" />
    </>
  ),
  cromo: (
    <>
      <rect x="6" y="3.5" width="12" height="17" rx="2" />
      <circle cx="12" cy="10" r="2.6" />
      <path d="M8.5 17.5h7" />
    </>
  ),
  trofeo: (
    <>
      <path d="M8 4h8v5a4 4 0 0 1-8 0V4ZM8 5H4.5A2.5 2.5 0 0 0 7 10M16 5h3.5A2.5 2.5 0 0 1 17 10M12 13v4M8.5 20h7M10 17h4" />
    </>
  ),
  medalla: (
    <>
      <circle cx="12" cy="14" r="4.5" />
      <path d="M8.5 10 6 4h4l2 4 2-4h4l-2.5 6" />
    </>
  ),
  entrenador: (
    <>
      <circle cx="12" cy="8" r="3.4" />
      <path d="M5 20c1.2-3.4 4-5 7-5s5.8 1.6 7 5" />
    </>
  ),
  cambio: (
    <>
      <path d="M4 8h13l-3-3M20 16H7l3 3" />
    </>
  ),
  check: (
    <>
      <path d="m5 12.5 4.5 4.5L19 7.5" />
    </>
  ),
  atras: (
    <>
      <path d="M19 12H5M10 6l-6 6 6 6" />
    </>
  ),
  stats: (
    <>
      <path d="M4 19.5h16M6 16l4-5 3 3 4-7" />
    </>
  ),
  rayo: (
    <>
      <path d="M13 3 5 13.5h5L10.5 21l8-10.5h-5L13 3Z" />
    </>
  ),
  fuego: (
    <>
      <path d="M12 21c-4 0-6.5-2.8-6.5-6.2 0-2.5 1.4-4.4 2.7-5.8.4 1 1 1.8 2 2.3.2-1.9 1.2-4 3-5.3-.3 2.7.8 4.4 1.9 6 1 1.4 2.4 2.7 2.4 5C17.5 19.4 15.4 21 12 21Z" />
    </>
  ),
  guardar: (
    <>
      <path d="M6 4h9l4 4v12H6V4ZM9 4v5h6V4M9 20v-7h6v7" />
    </>
  ),
  ajustes: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2.8v3M12 18.2v3M2.8 12h3M18.2 12h3M5.2 5.2l2.1 2.1M16.7 16.7l2.1 2.1M18.8 5.2l-2.1 2.1M7.3 16.7l-2.1 2.1" />
    </>
  ),
  normas: (
    <>
      <path d="M6 3.5h9L19 7.5V20.5H6V3.5ZM9 11h6M9 14.5h6" />
    </>
  ),
  admin: (
    <>
      <path d="M4 7.5 12 4l8 3.5v9L12 20l-8-3.5v-9ZM12 12m-2.5 0a2.5 2.5 0 1 0 5 0 2.5 2.5 0 0 0-5 0Z" />
    </>
  ),
  historial: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3.5 2" />
    </>
  ),
  home: (
    <>
      <path d="m4 11 8-7 8 7M6 9.5V20h12V9.5" />
    </>
  ),
  ayuda: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M9.5 9.5A2.5 2.5 0 0 1 12 8c1.4 0 2.5 1 2.5 2.2 0 1.7-2 2-2.5 3.3M12 16.8v.4" />
    </>
  ),
  cerrar: (
    <>
      <path d="m6 6 12 12M18 6 6 18" />
    </>
  ),
  usuario: (
    <>
      <circle cx="12" cy="8" r="3.4" />
      <path d="M5 20c1.2-3.4 4-5 7-5s5.8 1.6 7 5" />
    </>
  ),
};

export function IconoBrutal(props: {
  readonly nombre: IconoBrutalNombre;
  readonly clase?: string;
}): React.JSX.Element {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={props.clase ?? "h-5 w-5"}
    >
      {Trazos[props.nombre]}
    </svg>
  );
}
