import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FileCheck2, Link2 } from 'lucide-react';
import Panel from '../components/ui/Panel';
import KpiCard from '../components/ui/KpiCard';
import Badge from '../components/ui/Badge';
import Select from '../components/ui/Select';
import EmptyState from '../components/ui/EmptyState';
import { useVista } from '../store/useInflu';
import { nombreMarca, nombreTalento, piezasDe, porId, textoEntregable, totalesPiezas } from '../lib/derive';
import { fechaHora } from '../lib/format';
import type { Operacion } from '../data/types';

// Cambio 11: sección Evidencia del panel interno. Lista las operaciones con
// evidencia cargada o pendiente: talento o agencia, marca, entregables, el link
// de cada publicación, el resultado del análisis de la IA contra los requisitos
// del contrato (cambio 21), la declaración (completa o parcial) y el estado.
// También muestra las métricas internas (cambio 2: vistas solo de Reels).

type EstadoEvidencia = 'Verificada' | 'Observada' | 'Pendiente';

const estadoDe = (o: Operacion): EstadoEvidencia => {
  if (!o.evidencia) return 'Pendiente';
  return o.evidencia.sugerencia.verificados >= o.evidencia.sugerencia.total ? 'Verificada' : 'Observada';
};
const tono = (e: EstadoEvidencia) => (e === 'Verificada' ? 'success' : e === 'Observada' ? 'warning' : 'neutral');

export const Evidencia = () => {
  const v = useVista();
  const [params] = useSearchParams();
  const [estado, setEstado] = useState<string>('Todas');
  const [marca, setMarca] = useState<string>(params.get('marca') ?? 'Todas');

  // Operaciones que ya pidieron adelanto: tienen o esperan evidencia con links.
  const base = useMemo(
    () => v.operaciones
      .filter((o) => ['Firmada', 'Activa', 'Por liquidar', 'Liquidada'].includes(o.estatus))
      .sort((a, b) => (b.evidencia?.fechaHora ?? b.capturada).localeCompare(a.evidencia?.fechaHora ?? a.capturada)),
    [v.operaciones],
  );
  const marcasConEvidencia = [...new Set(base.map((o) => nombreMarca(v, o.marcaId)))].sort();
  const filas = base.filter((o) => (estado === 'Todas' || estadoDe(o) === estado) && (marca === 'Todas' || nombreMarca(v, o.marcaId) === marca));

  const verificadas = base.filter((o) => estadoDe(o) === 'Verificada').length;
  const pendientes = base.filter((o) => estadoDe(o) === 'Pendiente').length;
  const observadas = base.filter((o) => estadoDe(o) === 'Observada').length;

  return (
    <div className="px-4 md:px-10 py-6 md:py-8 max-w-[1600px] mx-auto flex flex-col gap-6">
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard label="Operaciones con evidencia" value={String(base.length)} note="firmadas o adelantadas" icon={FileCheck2} />
        <KpiCard label="Verificadas" value={String(verificadas)} note="links completos y analizados" />
        <KpiCard label="Observadas" value={String(observadas)} note="cumplimiento parcial" />
        <KpiCard label="Pendientes" value={String(pendientes)} note="esperan los links del talento o la agencia" />
      </div>

      <Panel
        title="Evidencia de campaña"
        subtitle="El talento o la agencia sube los links; la IA los analiza contra el contrato y el equipo interno ve el resultado."
        right={
          <div className="flex gap-2">
            <Select value={estado} onChange={(e) => setEstado(e.target.value)}>
              {['Todas', 'Verificada', 'Observada', 'Pendiente'].map((x) => <option key={x} value={x}>{x === 'Todas' ? 'Todos los estados' : x}</option>)}
            </Select>
            <Select value={marca} onChange={(e) => setMarca(e.target.value)}>
              <option value="Todas">Todas las marcas</option>
              {marcasConEvidencia.map((x) => <option key={x} value={x}>{x}</option>)}
            </Select>
          </div>
        }
      >
        {filas.length === 0 ? (
          <EmptyState icon={FileCheck2} title="Sin evidencia" message="Aparece cuando el talento o la agencia carga los links de las publicaciones." />
        ) : (
          <div className="border-t border-hairline overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-hairline">
                  {['Op.', 'Talento / agencia', 'Marca', 'Entregables y links', 'Análisis IA vs contrato', 'Métricas internas', 'Declaración', 'Estado'].map((h, i) => (
                    <th key={h || i} className="px-4 py-2.5 text-left text-[10px] uppercase tracking-wide text-mist font-medium whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filas.map((o) => {
                  const piezas = piezasDe(o.id, v.piezas);
                  const t = totalesPiezas(piezas);
                  const reels = piezas.filter((p) => p.formato !== 'Story');
                  const ag = porId(v.agencias, o.agenciaId);
                  const quien = o.solicitante === 'Agencia' && ag ? ag.nombre : nombreTalento(v, o.talentoId);
                  const e = estadoDe(o);
                  const total = o.evidencia?.sugerencia.total ?? o.entregables.reduce((s, x) => s + x.cantidad, 0);
                  const okIA = o.evidencia ? o.evidencia.sugerencia.verificados : piezas.filter((p) => p.verificacion.ok).length;
                  return (
                    <tr key={o.id} className="border-b border-hairline last:border-0 align-top">
                      <td className="px-4 py-3 font-mono text-[12px] text-blue-link whitespace-nowrap">#{o.folio.slice(-4)}</td>
                      <td className="px-4 py-3 text-[13px] whitespace-nowrap">{quien}<div className="text-[11px] text-mist">{o.solicitante === 'Agencia' ? 'Agencia' : 'Talento'}</div></td>
                      <td className="px-4 py-3 text-[13px] whitespace-nowrap">{nombreMarca(v, o.marcaId)}</td>
                      <td className="px-4 py-3 text-[12.5px] min-w-[220px]">
                        <div className="text-ash mb-1">{o.entregables.map(textoEntregable).join(' + ')}</div>
                        {piezas.length === 0 ? <span className="text-mist text-[12px]">Sin links cargados</span> : (
                          <div className="flex flex-col gap-0.5">
                            {piezas.map((p) => (
                              <span key={p.id} className="flex items-center gap-1 text-[11.5px] text-smoke">
                                <Link2 size={11} className="text-ash shrink-0" />
                                {p.link ? <a href={p.link} target="_blank" rel="noopener noreferrer" className="text-blue-link hover:underline truncate max-w-[220px]">{p.formato} {p.indice} · {p.red}</a> : <span>{p.formato} {p.indice} · link por subir</span>}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-[12.5px] whitespace-nowrap">
                        <Badge tone={okIA >= total ? 'success' : okIA ? 'warning' : 'neutral'}>{okIA} de {total} aprobados</Badge>
                        <div className="text-[11px] text-mist mt-1">red, formato, fecha y mención</div>
                      </td>
                      <td className="px-4 py-3 text-[12.5px] whitespace-nowrap tabular-nums">
                        {piezas.length ? <>Vistas {t.vistas.toLocaleString('es-MX')}<div className="text-[11px] text-mist">solo Reels · {reels.length} pz</div></> : '—'}
                      </td>
                      <td className="px-4 py-3 text-[12.5px] whitespace-nowrap">{o.evidencia ? o.evidencia.alcance + (o.evidencia.alcance === 'Hitos parciales' ? ` · ${o.evidencia.porcentaje}%` : '') : '—'}</td>
                      <td className="px-4 py-3 whitespace-nowrap"><Badge tone={tono(e)}>{e}</Badge><div className="text-[11px] text-mist mt-1">{o.evidencia ? fechaHora(o.evidencia.fechaHora) : 'sin cargar'}</div></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <div className="px-5 py-3 text-[11.5px] text-mist border-t border-hairline">
          El talento y la agencia solo suben los links de cada publicación. La IA analiza el contenido contra cada requisito del contrato (red social, formato, fecha de publicación, mención de la marca, hashtags) y marca cada entregable como aprobado o no aprobado. El grado de cumplimiento y las métricas internas (vistas de Reels) solo se ven aquí.
        </div>
      </Panel>
    </div>
  );
};
