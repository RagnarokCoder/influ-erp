import { useNavigate } from 'react-router-dom';
import { HandCoins, FolderOpen, CalendarClock, Users, UserCheck, Coins, ChevronRight } from 'lucide-react';
import Panel from '../components/ui/Panel';
import KpiCard from '../components/ui/KpiCard';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import { EstadoCuentaAviso } from './Perfil';
import { estadoPortal } from './Operaciones';
import { useInflu, useVista, usuarioActual } from '../store/useInflu';
import { bloqueoPedir, finDeMes, inicioDeMes, porId, suma, vencimientoOp } from '../lib/derive';
import { estadoTone, formatDate, money } from '../lib/format';
import { HOY_ISO } from '../data/constantes';
import type { Operacion } from '../data/types';

// Pantallas 5 (dashboard del talento) y 23 (resumen de agencia): lo que
// recibió, lo que está en curso y lo que le toca hacer.
export const Resumen = () => {
  const navigate = useNavigate();
  const s = useInflu();
  const v = useVista();
  const u = usuarioActual(s)!;
  const esAgencia = u.rol === 'Agencia';
  const tal = porId(v.talentos, u.talentoId);
  const ag = porId(s.agencias, esAgencia ? u.agenciaId : tal?.agenciaId);

  const enCurso = v.operaciones.filter((o) => !['Liquidada', 'Rechazada'].includes(o.estatus));
  const activas = v.operaciones.filter((o) => o.estatus === 'Activa').sort((a, b) => vencimientoOp(a).localeCompare(vencimientoOp(b)));
  const proxima = activas.find((o) => vencimientoOp(o) >= HOY_ISO) ?? activas[0];
  const delMes = v.operaciones.filter((o) => o.adelanto && o.adelanto.fechaHora >= inicioDeMes());
  const pendientesTal = v.talentos.filter((t) => t.representacion === 'Pendiente');
  const confirmados = v.talentos.filter((t) => t.representacion === 'Confirmada');
  const vencenMes = activas.filter((o) => vencimientoOp(o) >= HOY_ISO && vencimientoOp(o) <= finDeMes());
  const porHacer = v.operaciones.filter((o) => u.rol === o.solicitante && (o.estatus === 'Por firmar' || o.estatus === 'Observada' || (o.estatus === 'Firmada' && !o.evidencia)));
  const bloqueo = esAgencia ? (ag?.cuenta !== 'Preaprobada' ? 'Tu agencia está en revisión.' : null) : bloqueoPedir(tal, s.agencias);
  const queHacer = (o: Operacion) => (o.estatus === 'Por firmar' ? 'Firmar en DocuSign' : o.estatus === 'Observada' ? 'Responder observación' : 'Cargar links y evidencia');

  return (
    <div className="px-4 md:px-10 py-6 md:py-8 max-w-[1400px] mx-auto flex flex-col gap-5">
      <div>
        <div className="text-[22px] font-semibold text-carbon">{esAgencia ? 'Resumen' : `Hola, ${u.nombre.split(' ')[0]}`}</div>
        <div className="text-[13px] text-ash">{esAgencia ? ag?.nombre : ag ? `Tu agencia: ${ag.nombre} · Representación ${tal?.representacion.toLowerCase()}` : 'Independiente'}</div>
      </div>

      {esAgencia && ag ? <EstadoCuentaAviso cuenta={ag.cuenta} resoluciones={ag.resoluciones} />
        : tal && <EstadoCuentaAviso cuenta={tal.cuenta} resoluciones={tal.resoluciones} extra={tal.cuenta !== 'Rechazada' && tal.representacion === 'Pendiente' ? `${ag?.nombre} todavía no confirma que te representa.` : undefined} />}

      {esAgencia ? (
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <KpiCard label="Talentos confirmados" value={String(confirmados.length)} icon={Users} />
          <KpiCard label="Pendientes de aprobar" value={String(pendientesTal.length)} note="eligieron tu agencia" icon={UserCheck} />
          <KpiCard label="Adelantos activos" value={money(suma(activas.map((o) => o.adelanto!.monto)))} note={`${activas.length} operaciones`} icon={Coins} />
          <KpiCard label="Vencen este mes" value={String(vencenMes.length)} note="facturas de marcas" icon={CalendarClock} />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <KpiCard label="Adelantado este mes" value={money(suma(delMes.map((o) => o.adelanto!.monto)))} icon={HandCoins} />
          <KpiCard label="Operaciones en curso" value={String(enCurso.length)} icon={FolderOpen} />
          <KpiCard label="Próximo vencimiento de marca" value={proxima ? formatDate(vencimientoOp(proxima), { day: 'numeric', month: 'short' }) : '—'} note={proxima ? porId(v.marcas, proxima.marcaId)?.nombre : undefined} icon={CalendarClock} />
        </div>
      )}

      {/* Demo Stay On Social (cambio 3): el banner de Kapital se oculta en Resumen (agencia) e Inicio (talento). */}

      {/* M7: recuadro destacado para iniciar un adelanto en cuatro pasos. */}
      {esAgencia && (
        <div className="rounded-[10px] border border-blue/25 bg-ice px-5 py-4 flex flex-col lg:flex-row lg:items-center gap-4">
          <div className="flex-1 min-w-0">
            <div className="text-[15px] font-semibold text-carbon">Pedir un adelanto</div>
            <div className="text-[12.5px] text-ash mt-0.5">Elige un talento aprobado, sube la factura y el contrato u orden de compra. Recibes el 80% al aprobarse; el 20% se liquida cuando paga la marca.</div>
            <div className="flex flex-wrap gap-x-5 gap-y-1 mt-2.5">
              {['1 · Talento', '2 · Colaboración', '3 · Factura y contrato u OC', '4 · Revisión y envío'].map((p) => (
                <span key={p} className="text-[11.5px] text-blue-link font-medium">{p}</span>
              ))}
            </div>
          </div>
          <Button disabled={!!bloqueo} onClick={() => navigate('/pedir-adelanto')}>Pedir adelanto <ChevronRight size={14} /></Button>
        </div>
      )}

      {porHacer.length > 0 && (
        <Panel title="Lo que te toca hacer">
          <div className="border-t border-hairline divide-y divide-hairline">
            {porHacer.map((o) => (
              <button key={o.id} onClick={() => navigate(`/operaciones?id=${o.id}`)} className="w-full px-5 py-3 flex items-center gap-3 hover:bg-frost text-left">
                <span className="font-mono text-[12px] text-blue-link">#{o.folio.slice(-4)}</span>
                <span className="flex-1 min-w-0 text-[13px] text-carbon truncate">{porId(v.marcas, o.marcaId)?.nombre}{esAgencia ? ` · ${porId(v.talentos, o.talentoId)?.nombre}` : ''}</span>
                <Badge tone={o.estatus === 'Observada' ? 'danger' : 'warning'}>{queHacer(o)}</Badge>
              </button>
            ))}
          </div>
        </Panel>
      )}

      <Panel title={esAgencia ? 'Actividad reciente' : 'Mis operaciones'} right={<Button disabled={!!bloqueo} onClick={() => navigate('/pedir-adelanto')}>{esAgencia ? 'Pedir adelanto' : 'Pedir tu adelanto'} <ChevronRight size={14} /></Button>}>
        <div className="border-t border-hairline overflow-x-auto">
          {v.operaciones.length === 0 ? <div className="px-5 py-8 text-center text-[13px] text-ash">Todavía no tienes operaciones.</div> : (
            <table className="w-full">
              <thead><tr className="border-b border-hairline bg-frost/60">{[...(esAgencia ? ['Talento'] : []), 'Marca', 'Monto', 'Estado', 'Vencimiento', ''].map((h) => <th key={h} className="px-5 py-2.5 text-left text-[12px] text-ash font-semibold">{h}</th>)}</tr></thead>
              <tbody>
                {[...v.operaciones].sort((a, b) => b.capturada.localeCompare(a.capturada)).slice(0, 8).map((o) => (
                  <tr key={o.id} className="border-b border-hairline last:border-0">
                    {esAgencia && <td className="px-5 py-3 text-[13.5px] whitespace-nowrap">{porId(v.talentos, o.talentoId)?.nombre.split(' ').slice(0, 1).join('')} {porId(v.talentos, o.talentoId)?.nombre.split(' ')[1]?.[0]}.</td>}
                    <td className="px-5 py-3 text-[13.5px] whitespace-nowrap">{porId(v.marcas, o.marcaId)?.nombre}</td>
                    <td className="px-5 py-3 text-[13.5px] tabular-nums whitespace-nowrap">{money(o.monto)}</td>
                    <td className="px-5 py-3 whitespace-nowrap"><Badge tone={estadoTone(o.estatus)}>{estadoPortal(o)}</Badge></td>
                    <td className="px-5 py-3 text-[13.5px] whitespace-nowrap">{o.adelanto ? formatDate(vencimientoOp(o), { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'}</td>
                    <td className="px-5 py-3 text-right"><Button size="sm" variant="ghost" onClick={() => navigate(`/operaciones?id=${o.id}`)}>Ver</Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Panel>
    </div>
  );
};
