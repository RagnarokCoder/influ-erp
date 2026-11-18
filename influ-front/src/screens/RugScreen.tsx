import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Landmark, Clock, AlertTriangle, CheckCircle2, Copy } from 'lucide-react';
import Panel from '../components/ui/Panel';
import KpiCard from '../components/ui/KpiCard';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Archivo from '../components/ui/Archivo';
import EmptyState from '../components/ui/EmptyState';
import { Fila } from '../components/ui/Fila';
import { useInflu, useVista, rolActual } from '../store/useInflu';
import { autoriza } from '../lib/permisos';
import { corto, diasRugPorVencer, empresaDe, estadoRug, horasDesde, porId, suma } from '../lib/derive';
import { fechaHora, formatDate, money } from '../lib/format';
import { ALERTA_RUG_DIAS, INFLU, MODALIDAD_RUG, VIGENCIA_RUG_MESES } from '../data/constantes';
import type { Operacion } from '../data/types';

const FILTROS = ['Pendientes', 'Inscritas', 'Todas'] as const;

// Pantalla 18 (nueva). El RUG no tiene API: la plataforma precarga los datos,
// un usuario autorizado inscribe con su e.firma, sube la boleta y la IA lee el
// folio y la fecha. Sirve para la modalidad asistida o tercerizada (§8).
export const RugScreen = () => {
  const [params, setParams] = useSearchParams();
  const v = useVista();
  const s = useInflu();
  const rol = rolActual(s);
  const [filtro, setFiltro] = useState<(typeof FILTROS)[number]>('Pendientes');
  const [boleta, setBoleta] = useState<string[]>([]);
  const conRug = v.operaciones.filter((o) => o.rug);
  const pendiente = (o: Operacion) => ['En cola', 'Vence pronto', 'Por cerrar'].includes(estadoRug(o));
  const lista = conRug.filter((o) => filtro === 'Todas' || (filtro === 'Pendientes' ? pendiente(o) : o.rug!.estado === 'Inscrita'))
    .sort((a, b) => Number(pendiente(b)) - Number(pendiente(a)) || b.rug!.enCola.localeCompare(a.rug!.enCola));
  const sel = lista.find((o) => o.id === params.get('id')) ?? lista[0];
  const enCola = conRug.filter((o) => o.rug!.estado === 'En cola');
  const vencen = conRug.filter((o) => estadoRug(o) === 'Vence pronto');
  const horas = conRug.filter((o) => o.rug!.fechaInscripcion).map((o) => horasDesde(o.rug!.enCola, o.rug!.fechaInscripcion!));

  const badge = (o: Operacion) => {
    const e = estadoRug(o);
    const d = diasRugPorVencer(o);
    return e === 'En cola' ? <Badge tone="warning">En cola</Badge> : e === 'Vence pronto' ? <Badge tone="danger">Vence en {d} días</Badge>
      : e === 'Por cerrar' ? <Badge tone="warning">Por cancelar</Badge> : e === 'Inscrita' ? <Badge tone="success">Inscrita</Badge> : <Badge tone="neutral">{e}</Badge>;
  };

  return (
    <div className="px-4 md:px-10 py-6 md:py-8 max-w-[1600px] mx-auto flex flex-col gap-6">
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard label="En cola" value={String(enCola.length)} note="firmadas sin inscribir" icon={Landmark} />
        <KpiCard label="Inscritas vigentes" value={String(conRug.filter((o) => o.rug!.estado === 'Inscrita').length)} note={`vigencia de ${VIGENCIA_RUG_MESES} meses`} icon={CheckCircle2} />
        <KpiCard label={`Vencen en ${ALERTA_RUG_DIAS} días`} value={String(vencen.length)} note={vencen.map((o) => o.folio).join(', ') || 'ninguna'} icon={AlertTriangle} />
        <KpiCard label="Tiempo promedio de inscripción" value={horas.length ? `${Math.round((suma(horas) / horas.length) * 10) / 10} h` : '—'} note="de la firma a la boleta" icon={Clock} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_440px] gap-4 items-start">
        <Panel title="Inscripciones en el RUG" subtitle={`Modalidad: ${MODALIDAD_RUG === 'Asistida' ? 'asistida por la plataforma' : 'tercerizada con fedatario'}`}
          right={FILTROS.map((f) => <button key={f} onClick={() => setFiltro(f)} className={`px-3 py-1 rounded-full text-[12px] font-medium border ${filtro === f ? 'bg-carbon text-white border-carbon' : 'bg-white text-ash border-hairline'}`}>{f}</button>)}>
          {lista.length === 0 ? <EmptyState icon={Landmark} title="Nada en esta vista" message="Las cesiones firmadas entran a la cola solas." /> : (
            <div className="border-t border-hairline overflow-x-auto">
              <table className="w-full">
                <thead><tr className="border-b border-hairline">{['Op.', 'Otorgante', 'Monto', 'Folio', 'Estado'].map((h) => <th key={h} className="px-4 py-2.5 text-left text-[10px] uppercase tracking-wide text-mist font-medium">{h}</th>)}</tr></thead>
                <tbody>
                  {lista.map((o) => (
                    <tr key={o.id} onClick={() => setParams({ id: o.id })} className={`border-b border-hairline cursor-pointer ${sel?.id === o.id ? 'bg-ice' : 'hover:bg-haze'}`}>
                      <td className="px-4 py-2.5 font-mono text-[12px] text-blue-link">#{o.folio.slice(-4)}</td>
                      <td className="px-4 py-2.5 text-[13px]">{o.solicitante === 'Agencia' ? porId(v.agencias, o.agenciaId)?.nombre : corto(porId(v.talentos, o.talentoId)?.nombre ?? '')}</td>
                      <td className="px-4 py-2.5 text-[13px] tabular-nums">{money(o.monto)}</td>
                      <td className="px-4 py-2.5 font-mono text-[11.5px] text-ash">{o.rug!.folio ?? '—'}</td>
                      <td className="px-4 py-2.5">{badge(o)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        {sel?.rug && (() => {
          const otorgante = sel.solicitante === 'Agencia' ? porId(v.agencias, sel.agenciaId) : porId(v.talentos, sel.talentoId);
          const empresa = empresaDe(v, sel.marcaId);
          const datos = [
            ['Otorgante', `${otorgante?.nombre} · RFC ${sel.cfdi.emisor.rfc}`],
            ['Acreedor', `${INFLU.razonSocial} · RFC ${INFLU.rfc}`],
            ['Crédito cedido', `CFDI ${sel.cfdi.serieFolio} · UUID ${sel.cfdi.uuid}`],
            ['Monto', money(sel.monto)],
            ['Deudor', `${empresa?.razonSocial} · RFC ${empresa?.rfc}`],
            ['Fecha de la cesión', formatDate(sel.docusign?.firmado?.slice(0, 10))],
          ];
          return (
            <Panel title={sel.rug.estado === 'En cola' ? `Datos para inscribir · #${sel.folio.slice(-4)}` : `Inscripción · #${sel.folio.slice(-4)}`} right={badge(sel)}>
              <div className="border-t border-hairline px-5 py-1">
                {datos.map(([t, d]) => <Fila key={t} t={t} v={<span className="text-[12.5px]">{d}</span>} fuerte />)}
                {sel.rug.folio && (
                  <>
                    <Fila t="Folio (leído de la boleta)" v={sel.rug.folio} />
                    <Fila t="Inscrita" v={fechaHora(sel.rug.fechaInscripcion)} nota={`${sel.rug.usuario} · ${sel.rug.boleta}`} />
                    <Fila t="Vigencia" v={formatDate(sel.rug.vigencia)} tono={estadoRug(sel) === 'Vence pronto' ? 'danger' : undefined} />
                  </>
                )}
                {sel.rug.cierre && <Fila t={`${sel.rug.cierre.accion} al cerrar`} v={fechaHora(sel.rug.cierre.fechaHora)} nota={sel.rug.cierre.usuario} />}
              </div>
              <div className="px-5 pb-4 pt-2 flex flex-col gap-3">
                {sel.rug.estado === 'En cola' && (
                  <>
                    <Button size="sm" variant="ghost" className="self-start" onClick={() => { try { navigator.clipboard.writeText(datos.map(([t, d]) => `${t}: ${d}`).join('\n')); } catch { /* sin portapapeles */ } s.toast('Datos copiados: pégalos en el portal del RUG y firma con tu e.firma.'); }}><Copy size={13} /> Copiar datos</Button>
                    <Archivo titulo="Sube la boleta del RUG" ayuda="La IA lee el folio y la fecha del sello de tiempo" acepta=".pdf,.png,.jpg,.jpeg" archivos={boleta} onChange={setBoleta} ejemplo={`boleta_rug_${sel.folio.slice(-4)}.pdf`} />
                    <Button disabled={!autoriza.rug(rol) || !boleta.length} onClick={() => { if (s.inscribirRug(sel.id, boleta[0])) setBoleta([]); }}>Registrar inscripción</Button>
                  </>
                )}
                {sel.rug.estado === 'Inscrita' && (
                  <div className="flex gap-2 flex-wrap">
                    <Button size="sm" variant="outlined" disabled={!autoriza.rug(rol)} onClick={() => s.actualizarRug(sel.id)}>Actualizar vigencia</Button>
                    {sel.estatus === 'Liquidada' && <Button size="sm" variant="danger" disabled={!autoriza.rug(rol)} onClick={() => s.cancelarRug(sel.id)}>Cancelar inscripción</Button>}
                  </div>
                )}
                <div className="text-[11.5px] text-mist">Las operaciones en el RUG son gratuitas y surten efecto frente a terceros desde que el asiento queda firmado. Al cerrar la operación se actualiza o cancela la inscripción.</div>
              </div>
            </Panel>
          );
        })()}
      </div>
    </div>
  );
};
