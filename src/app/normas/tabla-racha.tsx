import { penalizacionPara } from "@/src/lib/dominio/rachas";
import { HORAS_CIERRE } from "@/src/lib/scoring/constantes";

export function TablaRacha(): React.JSX.Element {
  void HORAS_CIERRE;
  const filas = Array.from({ length: 4 }, (_, i) => i + 1).map((n) => ({
    n,
    p: penalizacionPara(n),
  }));
  return (
    <div className="brutal-card w-full overflow-hidden p-2">
      <table className="w-full border-collapse text-center text-sm">
        <tbody>
          {filas.map((f) => (
            <tr key={f.n} className="border-t-[2px] border-[var(--ink-border)] first:border-t-0">
              <td className="font-display tabular-brutal min-h-[44px] px-2 py-2 text-[16px] leading-[20px] font-bold">{f.n}</td>
              <td className="font-display tabular-brutal px-2 py-2 text-[16px] leading-[20px] font-bold">{f.p}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
