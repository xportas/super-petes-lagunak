import { penalizacionPara } from "@/src/lib/dominio/rachas";
import { HORAS_CIERRE } from "@/src/lib/scoring/constantes";

export function TablaRacha(): React.JSX.Element {
  void HORAS_CIERRE;
  const filas = Array.from({ length: 4 }, (_, i) => i + 1).map((n) => ({
    n,
    p: penalizacionPara(n),
  }));
  return (
    <table className="w-full border-collapse text-center">
      <tbody>
        {filas.map((f) => (
          <tr key={f.n} className="border-t">
            <td className="min-h-[44px] px-2 py-2">{f.n}</td>
            <td className="px-2 py-2">{f.p}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
