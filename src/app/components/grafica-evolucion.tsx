import type { EvolucionFila } from "@/src/lib/ficha/tipos";

const ANCHO = 320;
const ALTO = 120;
const MARGEN = 12;

export function GraficaEvolucion(props: {
  readonly filas: readonly EvolucionFila[];
}): React.JSX.Element | null {
  if (props.filas.length === 0) {
    return null;
  }
  const valores = props.filas.map((f) => f.base);
  const max = Math.max(0, ...valores);
  const min = Math.min(0, ...valores);
  const rango = max - min === 0 ? 1 : max - min;
  const pasoX =
    props.filas.length === 1
      ? 0
      : (ANCHO - MARGEN * 2) / (props.filas.length - 1);
  const puntos = props.filas.map((f, i) => {
    const x =
      props.filas.length === 1 ? ANCHO / 2 : MARGEN + i * pasoX;
    const y =
      MARGEN +
      ((max - f.base) / rango) * (ALTO - MARGEN * 2);
    return { x, y, etiqueta: f.etiqueta, base: f.base };
  });
  const yCero = MARGEN + ((max - 0) / rango) * (ALTO - MARGEN * 2);
  const linea =
    puntos.length === 1
      ? null
      : `M ${puntos.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" L ")}`;
  return (
    <div className="grafica-scroll w-full overflow-x-auto rounded border">
      <svg
        viewBox={`0 0 ${ANCHO} ${ALTO}`}
        role="img"
        className="min-h-[120px] w-full min-w-[280px]"
      >
        <line
          x1={MARGEN}
          x2={ANCHO - MARGEN}
          y1={yCero}
          y2={yCero}
          strokeWidth={1}
        />
        {linea !== null ? <path d={linea} fill="none" strokeWidth={2} /> : null}
        {puntos.map((p) => (
          <g key={p.etiqueta}>
            <circle cx={p.x} cy={p.y} r={4} />
            <text x={p.x} y={ALTO - 1} textAnchor="middle" fontSize={9}>
              {p.etiqueta}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
