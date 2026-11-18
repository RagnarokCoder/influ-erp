import type { Semaforo as S } from '../../data/types';

const COLOR: Record<S, string> = { Verde: 'bg-success', Amarillo: 'bg-warning', Rojo: 'bg-danger' };

/** Semáforo de la ficha del contrato: tres focos, el que aplica encendido. */
export default function Semaforo({ valor, compacto }: { valor: S | null; compacto?: boolean }) {
  if (!valor) return <span className="text-[12px] text-mist">IA leyendo…</span>;
  if (compacto) return <span className="inline-flex items-center gap-1.5 text-[12.5px] text-carbon"><span className={`w-2.5 h-2.5 rounded-full ${COLOR[valor]}`} />{valor}</span>;
  return (
    <span className="inline-flex items-center gap-1.5">
      {(['Verde', 'Amarillo', 'Rojo'] as S[]).map((x) => <span key={x} className={`w-3 h-3 rounded-full ${x === valor ? COLOR[x] : 'bg-pebble'}`} />)}
      <span className="text-[13px] font-semibold text-carbon ml-0.5">{valor}</span>
    </span>
  );
}
