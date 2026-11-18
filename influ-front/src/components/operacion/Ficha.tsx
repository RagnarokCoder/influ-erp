import { useState } from 'react';
import { Pencil, AlertTriangle, XCircle } from 'lucide-react';
import Panel from '../ui/Panel';
import Semaforo from './Semaforo';
import { useInflu, rolActual } from '../../store/useInflu';
import { autoriza } from '../../lib/permisos';
import { fechaHora } from '../../lib/format';
import type { Operacion } from '../../data/types';

/**
 * Ficha del contrato (MVP Fase 1 §4): cada dato con su cita a cláusula y
 * página, su confianza y su alerta. El equipo corrige y la corrección queda.
 */
export default function Ficha({ op }: { op: Operacion }) {
  const s = useInflu();
  const puede = autoriza.ficha(rolActual(s)) && ['En revisión', 'Observada'].includes(op.estatus);
  const [editando, setEditando] = useState<string | null>(null);
  const [valor, setValor] = useState('');
  const a = op.analisis;

  if (a.estado === 'En curso') {
    return (
      <Panel title="Ficha del contrato (IA)" right={<span className="text-[12px] text-warning font-medium">En curso</span>}>
        <div className="border-t border-hairline px-5 py-4 text-[13px] text-ash">
          La IA está leyendo el contrato: partes, fechas, monto, entregables, KPIs, penas, cesión e incumplimiento.
          <div className="mt-3 h-1.5 rounded-full bg-pebble overflow-hidden"><div className="h-full bg-blue transition-all" style={{ width: `${Math.round((a.pagina / op.contrato.paginas) * 100)}%` }} /></div>
          <div className="text-[12px] mt-1.5">Leyendo página {Math.min(op.contrato.paginas, a.pagina + 1)} de {op.contrato.paginas}</div>
        </div>
      </Panel>
    );
  }
  return (
    <Panel title="Ficha del contrato (IA)" subtitle={`${op.contrato.archivo} · ${op.contrato.paginas} págs. · leída ${fechaHora(a.fin)}`} right={<Semaforo valor={a.semaforo ?? 'Verde'} />}>
      <div className="border-t border-hairline divide-y divide-hairline">
        {a.campos.map((c) => (
          <div key={c.clave} className="px-5 py-2.5">
            <div className="flex items-start justify-between gap-3">
              <span className="text-[13px] text-ash shrink-0 w-[150px]">{c.etiqueta}</span>
              {editando === c.clave ? (
                <span className="flex-1 flex gap-2">
                  <input value={valor} onChange={(e) => setValor(e.target.value)} className="flex-1 border border-hairline rounded-[6px] px-2 py-1 text-[13px]" autoFocus />
                  <button onClick={() => { if (s.corregirCampo(op.id, c.clave, valor)) setEditando(null); }} className="text-[12px] text-blue-link font-medium">Guardar</button>
                  <button onClick={() => setEditando(null)} className="text-[12px] text-ash">Cancelar</button>
                </span>
              ) : (
                <span className="flex-1 text-right">
                  <span className="text-[13px] font-semibold text-carbon">{c.valor}</span>
                  <span className="text-[11px] text-mist font-medium"> cl. {c.cita.clausula} · p.{c.cita.pagina}</span>
                  {puede && <button onClick={() => { setEditando(c.clave); setValor(c.valor); }} className="ml-1.5 align-middle text-mist hover:text-blue-link" title="Corregir"><Pencil size={12} /></button>}
                </span>
              )}
            </div>
            <div className="flex items-center justify-end gap-2 mt-0.5 text-[10.5px] text-mist">
              <span>confianza {Math.round(c.confianza * 100)}%</span>
              {c.correccion && <span className="text-blue-link">corrigió {c.correccion.usuario.split(' ')[0]} · antes "{c.correccion.anterior}"</span>}
            </div>
            {c.alerta && (
              <div className={`mt-1 flex gap-1.5 text-[11.5px] ${c.alerta.nivel === 'Rojo' ? 'text-danger' : 'text-warning'}`}>
                {c.alerta.nivel === 'Rojo' ? <XCircle size={13} className="shrink-0 mt-px" /> : <AlertTriangle size={13} className="shrink-0 mt-px" />} {c.alerta.texto}
              </div>
            )}
          </div>
        ))}
      </div>
    </Panel>
  );
}
