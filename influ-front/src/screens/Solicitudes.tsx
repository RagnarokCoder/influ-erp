import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ClipboardList, Coins, ShieldCheck, Send, Search, GripVertical, Check } from 'lucide-react';
import Panel from '../components/ui/Panel';
import KpiCard from '../components/ui/KpiCard';
import Badge from '../components/ui/Badge';
import { useArrastre } from '../components/ui/Kanban';
import Semaforo from '../components/operacion/Semaforo';
import DrawerOperacion from '../components/operacion/DrawerOperacion';
import { ModalPagoMarca } from '../components/operacion/Modales';
import { useInflu, useVista, rolActual } from '../store/useInflu';
import { autoriza } from '../lib/permisos';
import {
  bloqueosRevision, corto, cxcDe, diasVencida, estadoCesion, faltantesLiberar, horasDesde, liquidacion, montoAdelanto, ordenDe, pagoMarca, porId,
  saldoCxC, semaforoDe, suma, vencimientoOp,
} from '../lib/derive';
import { ahora, estadoTone, fechaHora, formatDate, money } from '../lib/format';
import { META_HORAS_COBRO, QUORUM_APROBACION, d } from '../data/constantes';
import type { Operacion } from '../data/types';

type Columna = 'Revision' | 'Por firmar' | 'Firmada' | 'Marca' | 'Liquidacion';

const COLUMNAS: { id: Columna; titulo: string; nota: string }[] = [
  { id: 'Revision', titulo: 'En revisión', nota: 'CFDI validado; ficha de la IA y votos' },
  { id: 'Por firmar', titulo: 'Por firmar', nota: 'Aprobada; documento único en DocuSign' },
  { id: 'Firmada', titulo: 'Instrucción de pago, RUG y evidencia', nota: 'Instrucción de pago aceptada, RUG y links' },
  { id: 'Marca', titulo: 'Esperando a la marca', nota: '80% liberado; la marca paga a Influ' },
  { id: 'Liquidacion', titulo: 'Por liquidar', nota: 'La marca pagó; orden del 20%' },
];

const columnaDe = (o: Operacion): Columna | null =>
  o.estatus === 'En revisión' || o.estatus === 'Observada' ? 'Revision' : o.estatus === 'Por firmar' ? 'Por firmar' : o.estatus === 'Firmada' ? 'Firmada'
    : o.estatus === 'Activa' ? 'Marca' : o.estatus === 'Por liquidar' || o.estatus === 'Liquidada' ? 'Liquidacion' : null;

/** Estado de la cola (pantalla 16). */
const estadoCola = (o: Operacion) =>
  o.estatus === 'Activa' ? 'Liberada' : o.estatus === 'Por liquidar' ? 'Marca pagó' : o.estatus;

// Pantalla 16 (cola de solicitudes con CFDI y semáforo de la IA) y el tablero
// de etapas: el pago de la marca y el remanente siguen en el mismo kanban.
export const Solicitudes = () => {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const vista = params.get('vista') === 'tablero' ? 'tablero' : 'cola';
  const v = useVista();
  const rol = useInflu(rolActual);
  const toast = useInflu((s) => s.toast);
  const [busca, setBusca] = useState('');
  const [abiertaId, setAbiertaId] = useState<string | null>(null);
  const [cobroId, setCobroId] = useState<string | null>(null);
  const interno = autoriza.revision(rol);
  const fh = ahora().fechaHora;

  const talento = (id: string) => porId(v.talentos, id)?.nombre ?? '';
  const marca = (id: string) => porId(v.marcas, id)?.nombre ?? '';
  const q = busca.trim().toLowerCase();
  const visibles = v.operaciones.filter((o) => !q || [o.folio, talento(o.talentoId), marca(o.marcaId), porId(v.agencias, o.agenciaId)?.nombre].some((t) => t?.toLowerCase().includes(q)));
  const enCurso = v.operaciones.filter((o) => !['Liquidada', 'Rechazada'].includes(o.estatus));
  const enTramite = v.operaciones.filter((o) => ['En revisión', 'Observada', 'Por firmar', 'Firmada'].includes(o.estatus)).sort((a, b) => a.capturada.localeCompare(b.capturada));
  const turno = (id: string) => enTramite.findIndex((x) => x.id === id) + 1;
  const porRevisar = v.operaciones.filter((o) => o.estatus === 'En revisión');
  const listas = v.operaciones.filter((o) => o.estatus === 'Firmada' && !faltantesLiberar(o).length);
  const rechazadas = v.operaciones.filter((o) => o.estatus === 'Rechazada' && o.capturada >= `${d(-30)}T00:00`);

  /** Lo que sigue para la operación y a qué pantalla lleva. */
  const accion = (o: Operacion): { texto: string; fn: () => void; deshabilitado?: boolean } | null => {
    if (o.estatus === 'En revisión') {
      if (o.analisis.estado === 'En curso') return { texto: `IA leyendo p. ${o.analisis.pagina + 1} de ${o.contrato.paginas}`, fn: () => {}, deshabilitado: true };
      return interno ? { texto: o.votos.length ? `Revisar · voto ${o.votos.length + 1} de ${QUORUM_APROBACION}` : 'Revisar ficha', fn: () => navigate(`/revision?id=${o.id}`) } : { texto: 'La revisa el equipo', fn: () => {}, deshabilitado: true };
    }
    if (o.estatus === 'Observada') return { texto: 'Esperando respuesta del solicitante', fn: () => navigate(`/revision?id=${o.id}`) };
    if (o.estatus === 'Por firmar') return { texto: 'Firma en DocuSign del solicitante', fn: () => navigate(`/operaciones?id=${o.id}`) };
    if (o.estatus === 'Firmada') {
      if (o.rug?.estado === 'En cola') return { texto: 'Inscribir en el RUG', fn: () => navigate(`/rug?id=${o.id}`) };
      if (!o.cesion?.acuse) return { texto: estadoCesion(o, fh) === 'Sin acuse' ? 'Instrucción de pago sin aceptar · reenviar' : 'Esperando que la marca acepte la instrucción de pago', fn: () => navigate('/cesiones') };
      if (!o.evidencia) return { texto: 'Esperando links y evidencia', fn: () => navigate(`/operaciones?id=${o.id}`) };
      const orden = ordenDe(o.id, 'Adelanto', v.ordenes);
      return { texto: orden ? `Orden ${orden.estatus.toLowerCase()}` : `Orden de pago ${money(montoAdelanto(o))}`, fn: () => navigate(orden ? `/pagos?orden=${orden.id}` : '/pagos') };
    }
    if (o.estatus === 'Activa') return interno ? { texto: 'Registrar pago de la marca', fn: () => setCobroId(o.id) } : { texto: `Esperando pago de ${marca(o.marcaId)}`, fn: () => {}, deshabilitado: true };
    if (o.estatus === 'Por liquidar') {
      const orden = ordenDe(o.id, 'Remanente', v.ordenes);
      return { texto: orden ? `Orden del 20% ${orden.estatus.toLowerCase()}` : `Orden del 20% · ${money(liquidacion(o, cxcDe(o.id, v.cxc)).neto)}`, fn: () => navigate(orden ? `/pagos?orden=${orden.id}` : '/pagos') };
    }
    if (o.estatus === 'Liquidada') return { texto: 'Ver operación', fn: () => navigate(`/operaciones?id=${o.id}`) };
    return null;
  };

  const { arrastrando, encima, tarjeta, columna } = useArrastre<Columna>((id, destino) => {
    const o = v.operaciones.find((x) => x.id === id);
    const desde = o && columnaDe(o);
    if (!o || !desde || desde === destino) return;
    const orden = COLUMNAS.map((c) => c.id);
    if (orden.indexOf(destino) !== orden.indexOf(desde) + 1) {
      toast(`${o.folio} avanza una etapa a la vez: de ${COLUMNAS[orden.indexOf(desde)].titulo} sigue ${COLUMNAS[orden.indexOf(desde) + 1]?.titulo ?? 'nada'}.`, 'error');
      return;
    }
    accion(o)?.fn();
  });

  const cobro = cobroId ? porId(v.operaciones, cobroId) : null;
  const abierta = abiertaId ? porId(v.operaciones, abiertaId) : null;

  return (
    <div className="px-4 md:px-10 py-6 md:py-8 max-w-[1600px] mx-auto flex flex-col gap-6">
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard label="Solicitudes en curso" value={String(enCurso.length)} note={`${porRevisar.length} esperan revisión`} icon={ClipboardList} />
        <KpiCard label="Monto en trámite" value={money(suma(enTramite.map((o) => o.monto)))} note="se adelanta el 80% del monto base" icon={Coins} />
        <KpiCard label="Semáforo rojo" value={String(porRevisar.filter((o) => semaforoDe(o) === 'Rojo').length + v.operaciones.filter((o) => o.estatus === 'Observada').length)} note="bloquean la aprobación u observadas" icon={ShieldCheck} />
        <KpiCard label="Listas para orden de pago" value={String(listas.length)} note={listas.map((o) => o.folio).join(', ') || 'esperan RUG, acuse o evidencia'} icon={Send} />
      </div>

      <Panel title="Solicitudes" subtitle={`${enCurso.length} en curso · ${porRevisar.length} esperan revisión`}
        right={
          <>
            {(['cola', 'tablero'] as const).map((x) => (
              <button key={x} onClick={() => setParams({ vista: x })} className={`px-3 py-1 rounded-full text-[12px] font-medium border ${vista === x ? 'bg-carbon text-white border-carbon' : 'bg-white text-ash border-hairline'}`}>{x === 'cola' ? 'Cola' : 'Tablero por etapa'}</button>
            ))}
            <div className="flex items-center gap-1.5 bg-frost border border-hairline rounded-full px-3 py-1.5">
              <Search size={13} className="text-ash" strokeWidth={1.6} />
              <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar..." className="bg-transparent text-[13px] outline-none w-36 placeholder:text-mist" />
            </div>
          </>
        }>
        {vista === 'cola' ? (
          <div className="border-t border-hairline overflow-x-auto">
            <table className="w-full">
              <thead><tr className="border-b border-hairline">{['Solicitud', 'Talento / agencia', 'Marca', 'Monto', 'CFDI', 'Contrato (IA)', 'Estado', 'Sigue'].map((h) => <th key={h} className="px-4 py-2.5 text-left text-[10px] uppercase tracking-wide text-mist font-medium whitespace-nowrap">{h}</th>)}</tr></thead>
              <tbody>
                {visibles.filter((o) => o.estatus !== 'Liquidada' || (o.capturada >= `${d(-30)}T00:00`)).sort((a, b) => b.folio.localeCompare(a.folio)).map((o) => {
                  const acc = accion(o);
                  return (
                    <tr key={o.id} onClick={() => setAbiertaId(o.id)} className="border-b border-hairline hover:bg-haze cursor-pointer">
                      <td className="px-4 py-2.5 font-mono text-[12.5px] whitespace-nowrap">#{o.folio.slice(-4)}</td>
                      <td className="px-4 py-2.5 text-[13px] whitespace-nowrap">{corto(talento(o.talentoId))} · {porId(v.agencias, o.agenciaId)?.nombre ?? 'Independiente'}</td>
                      <td className="px-4 py-2.5 text-[13px] whitespace-nowrap">{marca(o.marcaId)}</td>
                      <td className="px-4 py-2.5 text-[13px] tabular-nums whitespace-nowrap">{money(o.monto)}</td>
                      <td className="px-4 py-2.5">{o.validacion.motivo ? <Badge tone="danger">✗</Badge> : <span className="inline-flex w-6 h-6 rounded-full bg-success-wash items-center justify-center"><Check size={12} className="text-success" /></span>}</td>
                      <td className="px-4 py-2.5 whitespace-nowrap">{o.validacion.motivo ? <span className="text-[12px] text-mist">no se leyó</span> : <Semaforo valor={semaforoDe(o)} compacto />}</td>
                      <td className="px-4 py-2.5 whitespace-nowrap"><Badge tone={estadoTone(o.estatus)}>{estadoCola(o)}</Badge></td>
                      <td className="px-4 py-2.5 whitespace-nowrap">{acc && <button disabled={acc.deshabilitado} onClick={(e) => { e.stopPropagation(); acc.fn(); }} className="text-[12px] text-blue-link font-medium hover:underline disabled:text-mist disabled:no-underline">{acc.texto}</button>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3 p-4 border-t border-hairline">
            {COLUMNAS.map((col) => {
              const lista = visibles
                .filter((o) => columnaDe(o) === col.id && (o.estatus !== 'Liquidada' || (v.cxp.find((p) => p.operacionId === o.id)?.pago?.fecha ?? '') >= d(-30)))
                .sort((a, b) => col.id === 'Marca' ? vencimientoOp(a).localeCompare(vencimientoOp(b)) : a.capturada.localeCompare(b.capturada));
              const cifra = col.id === 'Marca' ? money(suma(lista.map((o) => { const c = cxcDe(o.id, v.cxc); return c ? saldoCxC(c) : 0; }))) : money(suma(lista.map((o) => o.monto)));
              return (
                <div key={col.id} {...columna(col.id)} className={`rounded-[10px] p-3 flex flex-col gap-3 min-h-40 border-2 border-dashed transition-colors ${encima === col.id ? 'bg-ice border-blue' : 'bg-frost border-transparent'}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div><div className="text-[14px] font-semibold text-carbon">{col.titulo}</div><div className="text-[11px] text-ash">{col.nota}</div></div>
                    <div className="text-[14px] font-semibold tabular-nums text-carbon shrink-0">{cifra}</div>
                  </div>
                  {lista.length === 0 && <div className="text-[12px] text-mist text-center py-6">Sin solicitudes</div>}
                  {lista.map((o) => {
                    const bloqueos = o.estatus === 'En revisión' ? bloqueosRevision(o) : [];
                    const faltan = o.estatus === 'Firmada' ? faltantesLiberar(o) : [];
                    const horas = horasDesde(o.capturada, fh);
                    const lenta = !o.adelanto && horas > META_HORAS_COBRO;
                    const c = cxcDe(o.id, v.cxc);
                    const vencida = o.estatus === 'Activa' && c ? diasVencida(c) : 0;
                    const acc = accion(o);
                    return (
                      <div key={o.id} {...tarjeta(o.id)} onClick={() => setAbiertaId(o.id)}
                        className={`group bg-white border rounded-[8px] p-3 cursor-grab hover:border-blue/40 transition-all ${bloqueos.length && o.analisis.estado === 'Lista' || o.estatus === 'Observada' ? 'border-danger/40' : 'border-hairline'} ${arrastrando === o.id ? 'opacity-40 scale-[0.98]' : ''}`}>
                        <div className="flex items-center gap-1.5">
                          <GripVertical size={12} className="text-pebble group-hover:text-mist" />
                          <span className="font-mono text-[13px] text-blue-link">#{o.folio.slice(-4)}</span>
                          {turno(o.id) > 0 && <span className="text-[10px] text-mist tabular-nums">turno {turno(o.id)}</span>}
                          <span className="ml-auto">{o.adelanto ? <Badge tone={vencida > 0 ? 'danger' : 'neutral'}>{formatDate(vencimientoOp(o), { day: 'numeric', month: 'short' })}</Badge> : <Semaforo valor={semaforoDe(o)} compacto />}</span>
                        </div>
                        <div className="text-[13.5px] text-carbon truncate mt-1">{talento(o.talentoId)}</div>
                        <div className="text-[11.5px] text-ash truncate">{marca(o.marcaId)} · {porId(v.agencias, o.agenciaId)?.nombre ?? 'independiente'} · {o.plazoDias} d</div>
                        <div className="flex items-baseline justify-between gap-2 mt-1.5 flex-wrap">
                          <span className="text-[13px] font-medium tabular-nums">{money(o.monto)}</span>
                          <span className="text-[12px] text-ash tabular-nums">{o.adelanto ? `pagado ${money(o.adelanto.monto)}` : `80% ${money(montoAdelanto(o))}`}</span>
                        </div>
                        {vencida > 0 && <div className="text-[11px] text-danger mt-1">La marca no ha pagado: {vencida} días vencida.</div>}
                        {o.estatus === 'Por liquidar' && <div className="text-[11px] text-ash mt-1">{marca(o.marcaId)} pagó el {formatDate(pagoMarca(c), { day: 'numeric', month: 'short' })}</div>}
                        {o.votos.length > 0 && o.estatus === 'En revisión' && <div className="text-[11px] text-ash mt-1">Votos {o.votos.length} de {QUORUM_APROBACION}: {o.votos.map((x) => x.usuario.split(' ')[0]).join(', ')}</div>}
                        <div className="text-[10.5px] text-mist mt-1">Capturó {o.capturadaPor.split(' ').slice(0, 2).join(' ')} · {fechaHora(o.capturada)}{lenta ? ` · ${horas} h` : ''}</div>
                        {bloqueos.length > 0 && o.analisis.estado === 'Lista' && <div className="text-[11px] text-danger mt-1.5">{bloqueos[0]}</div>}
                        {faltan.length > 0 && <div className="text-[11px] text-warning mt-1.5">Falta: {faltan.join(', ')}.</div>}
                        {acc && (
                          <button disabled={acc.deshabilitado} onClick={(e) => { e.stopPropagation(); acc.fn(); }}
                            className="mt-2.5 w-full rounded-full border border-blue-link text-blue-link text-[12px] font-medium py-1.5 hover:bg-ice disabled:opacity-40 disabled:cursor-not-allowed">
                            {acc.texto}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}
        {rechazadas.length > 0 && (
          <div className="px-5 py-3 border-t border-hairline text-[12px] text-ash flex flex-wrap gap-x-4 gap-y-1">
            <span className="text-mist">Rechazadas, 30 días:</span>
            {rechazadas.map((o) => (
              <button key={o.id} onClick={() => setAbiertaId(o.id)} className="hover:underline text-left">
                <span className="font-mono text-blue-link">#{o.folio.slice(-4)}</span> {talento(o.talentoId)} · {o.rechazo?.motivo}
              </button>
            ))}
          </div>
        )}
      </Panel>

      {abierta && <DrawerOperacion op={abierta} onClose={() => setAbiertaId(null)} onCobro={() => setCobroId(abierta.id)} />}
      {cobro && <ModalPagoMarca op={cobro} onClose={() => setCobroId(null)} />}
    </div>
  );
};
