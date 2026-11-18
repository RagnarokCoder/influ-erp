import { Check } from 'lucide-react';

// Recorrido de la operación en el portal: Carga · Validación · Firma ·
// Evidencia · Pago · Liquidación. Lo cumplido en verde, la etapa actual en azul.
export default function Stepper({ pasos, actual, completo }: { pasos: string[]; actual: number; completo?: boolean }) {
  return (
    <div className="flex items-start w-full overflow-x-auto pb-1">
      {pasos.map((p, i) => {
        const hecho = completo || i < actual;
        const activo = !completo && i === actual;
        return (
          <div key={p} className="flex items-start flex-1 min-w-[64px] last:flex-none">
            <div className="flex flex-col items-center gap-1.5 min-w-[64px]">
              <span className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold border-2 ${
                hecho ? 'bg-success border-success text-white' : activo ? 'bg-white border-blue text-blue-link' : 'bg-white border-hairline text-mist'
              }`}>
                {hecho ? <Check size={13} strokeWidth={2.4} /> : i + 1}
              </span>
              <span className={`text-[11px] whitespace-nowrap ${activo ? 'text-carbon font-semibold' : 'text-ash'}`}>{p}</span>
            </div>
            {i < pasos.length - 1 && <div className={`flex-1 h-0.5 mt-3.5 mx-1 rounded-full ${hecho ? 'bg-success' : 'bg-pebble'}`} />}
          </div>
        );
      })}
    </div>
  );
}
