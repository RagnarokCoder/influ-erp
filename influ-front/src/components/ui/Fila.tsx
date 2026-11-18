import type React from 'react';
import { CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';

/** Renglón etiqueta–valor de los paneles de detalle. */
export const Fila = ({ t, v, fuerte, tono, nota }: { t: React.ReactNode; v: React.ReactNode; fuerte?: boolean; tono?: 'danger' | 'success' | 'warning'; nota?: string }) => (
  <div className="flex items-start justify-between gap-3 py-2.5 border-b border-hairline last:border-0">
    <span className="min-w-0">
      <span className={`block text-[13px] ${fuerte ? 'font-semibold text-carbon' : 'text-ash'}`}>{t}</span>
      {nota && <span className="block text-[11px] text-mist">{nota}</span>}
    </span>
    <span className={`text-[13px] tabular-nums text-right ${fuerte ? 'font-semibold' : 'font-medium'} ${tono === 'danger' ? 'text-danger' : tono === 'success' ? 'text-success' : tono === 'warning' ? 'text-warning' : 'text-carbon'}`}>{v}</span>
  </div>
);

/** Un chequeo automático: verde si pasa, rojo si no, ámbar si pide revisión. */
export const Check = ({ ok, texto, aviso, detalle }: { ok: boolean; texto: React.ReactNode; aviso?: boolean; detalle?: string }) => (
  <div className="flex items-start gap-2.5 py-1.5">
    {ok ? <CheckCircle2 size={17} className="text-success shrink-0 mt-px" /> : aviso ? <AlertTriangle size={17} className="text-warning shrink-0 mt-px" /> : <XCircle size={17} className="text-danger shrink-0 mt-px" />}
    <span className="min-w-0">
      <span className="block text-[13px] text-carbon">{texto}</span>
      {detalle && <span className="block text-[11px] text-ash">{detalle}</span>}
    </span>
  </div>
);

/** Chips de selección múltiple (nichos, tipo de contenido). */
export function Chips<T extends string>({ opciones, valor, onChange, solo }: { opciones: readonly T[]; valor: T[]; onChange: (v: T[]) => void; solo?: boolean }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {opciones.map((o) => {
        const activo = valor.includes(o);
        return (
          <button key={o} type="button" onClick={() => onChange(solo ? [o] : activo ? valor.filter((x) => x !== o) : [...valor, o])}
            className={`px-3 py-1 rounded-full text-[12.5px] border transition-colors ${activo ? 'bg-carbon text-white border-carbon' : 'bg-white text-smoke border-hairline hover:bg-frost'}`}>
            {o}
          </button>
        );
      })}
    </div>
  );
}
