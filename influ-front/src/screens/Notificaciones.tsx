import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CalendarClock, CheckCircle2, Clock, FileText, AlertTriangle, HandCoins, MessageCircle, Inbox, Mail } from 'lucide-react';
import Panel from '../components/ui/Panel';
import KpiCard from '../components/ui/KpiCard';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import EmptyState from '../components/ui/EmptyState';
import { useInflu, useVista, rolActual } from '../store/useInflu';
import { autoriza, carteraPropia, puedeVer } from '../lib/permisos';
import { notificaciones, porId, type Notificacion, type TipoNotificacion } from '../lib/derive';
import { ahora, estadoTone, fechaHora } from '../lib/format';
import { HOY_ISO, WHATSAPP_INFLU, d } from '../data/constantes';

const TIPOS: TipoNotificacion[] = ['Registros', 'Solicitudes', 'Contrato (IA)', 'Cesión y RUG', 'Evidencia', 'Pagos', 'Vencimientos'];

/** Etiqueta visible de cada tipo (el valor interno del union se conserva). */
const etiquetaTipo = (t: 'Todas' | TipoNotificacion) => (t === 'Cesión y RUG' ? 'Instrucción de pago y RUG' : t);

const ICONOS: Record<Notificacion['icono'], { icon: typeof Bell; color: string }> = {
  reloj: { icon: Clock, color: 'text-warning' },
  ok: { icon: CheckCircle2, color: 'text-success' },
  documento: { icon: FileText, color: 'text-ash' },
  alerta: { icon: AlertTriangle, color: 'text-danger' },
  pago: { icon: HandCoins, color: 'text-blue-link' },
};

/** "Hace 2 h" · "Ayer" · "3 oct" a partir de la fecha fija y el reloj real. */
function hace(fh: string) {
  const h = Math.round((new Date(ahora().fechaHora).getTime() - new Date(fh).getTime()) / 36e5);
  if (fh.startsWith(HOY_ISO)) return h <= 0 ? 'Ahora' : `Hace ${h} h`;
  if (fh.startsWith(d(-1))) return 'Ayer';
  const dias = Math.round((new Date(`${HOY_ISO}T12:00`).getTime() - new Date(`${fh.slice(0, 10)}T12:00`).getTime()) / 864e5);
  return dias > 0 && dias < 7 ? `Hace ${dias} días` : fechaHora(fh).split(' · ')[0];
}

// Etapa 11 y pantalla 22: las notificaciones internas suman registros por
// preaprobar, confirmaciones pendientes, vigencia del RUG y semáforos rojos. Al
// talento y a la agencia les llegan las de su cartera; por WhatsApp solo sale
// el aviso de pago, y a la marca, los emails de instrucción de pago y cobranza.
export const Notificaciones = () => {
  const navigate = useNavigate();
  const v = useVista();
  const rol = useInflu(rolActual);
  const reenviar = useInflu((s) => s.reenviarMensaje);
  const [filtro, setFiltro] = useState<'Todas' | TipoNotificacion>('Todas');
  const interno = !carteraPropia(rol);
  const todas = notificaciones(v, ahora().fechaHora, interno).filter((n) => n.fechaHora >= `${d(-45)}T00:00`);
  const lista = todas.filter((n) => filtro === 'Todas' || n.tipo === filtro);
  const mensajes = [...v.mensajes].sort((a, b) => (a.estatus === 'Fallido' ? -1 : b.estatus === 'Fallido' ? 1 : b.fechaHora.localeCompare(a.fechaHora)));
  const fallidos = v.mensajes.filter((m) => m.estatus === 'Fallido');
  const urgentes = todas.filter((n) => n.urgente);
  const abrir = (n: Notificacion) => navigate(n.ruta && puedeVer(rol, n.ruta) ? n.ruta : n.operacionId && puedeVer(rol, '/operaciones') ? `/operaciones?id=${n.operacionId}` : '/solicitudes');
  const correos = [...v.correos].sort((a, b) => b.fechaHora.localeCompare(a.fechaHora)).slice(0, 20);

  return (
    <div className="px-4 md:px-10 py-6 md:py-8 max-w-[1600px] mx-auto flex flex-col gap-6">
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard label="Avisos de hoy" value={String(todas.filter((n) => n.fechaHora.startsWith(HOY_ISO)).length)} note={`${todas.length} en 45 días`} icon={Bell} />
        <KpiCard label="Urgentes" value={String(urgentes.length)} note={interno ? 'registros, acuses, RUG, semáforos y vencimientos' : 'vence en 1 día o ya venció'} icon={CalendarClock} />
        <KpiCard label="Avisos de pago por WhatsApp" value={String(v.mensajes.filter((m) => m.fechaHora >= `${d(-30)}T00:00`).length)} note={`30 días · desde ${WHATSAPP_INFLU}`} icon={MessageCircle} />
        <KpiCard label="No entregados" value={String(fallidos.length)} note={fallidos.map((m) => m.nombre.split(' ')[0]).join(', ') || 'todos entregados'} icon={AlertTriangle} />
      </div>

      <Panel title={interno ? 'Alertas · notificaciones internas del equipo' : 'Tus notificaciones'} subtitle="Estos avisos quedan aquí. Por WhatsApp solo sale la confirmación de que un pago fue enviado.">
        <div className="flex gap-1.5 px-5 pb-4 flex-wrap">
          {(['Todas', ...TIPOS] as const).map((t) => (
            <button key={t} onClick={() => setFiltro(t)}
              className={`px-3 py-1 rounded-full text-[12px] font-medium border transition-colors ${filtro === t ? 'bg-carbon text-white border-carbon' : 'bg-white text-ash border-hairline hover:bg-frost'}`}>
              {etiquetaTipo(t)}<span className="ml-1.5 opacity-60">{t === 'Todas' ? todas.length : todas.filter((n) => n.tipo === t).length}</span>
            </button>
          ))}
        </div>
        <div className="border-t border-hairline divide-y divide-hairline max-h-[560px] overflow-y-auto">
          {lista.length === 0 && <EmptyState icon={Inbox} title="Sin notificaciones" message="Ajusta el filtro: aquí aparecen vencimientos, adelantos, evidencias y solicitudes." />}
          {lista.map((n) => {
            const I = ICONOS[n.icono];
            return (
              <button key={n.id} onClick={() => abrir(n)} className={`w-full text-left px-5 py-3 flex gap-3 hover:bg-frost transition-colors ${n.urgente ? 'bg-ice/70' : ''}`}>
                <span className="w-8 h-8 rounded-[8px] border border-hairline bg-white flex items-center justify-center shrink-0">
                  <I.icon size={15} strokeWidth={1.7} className={I.color} />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-[13px] font-medium text-carbon">{n.titulo}</span>
                  <span className="block text-[12px] text-ash break-words">{n.detalle}</span>
                </span>
                <span className="text-[11px] text-mist shrink-0 whitespace-nowrap">{hace(n.fechaHora)}</span>
              </button>
            );
          })}
        </div>
      </Panel>

      {interno && (
        <Panel title="Emails a marcas y usuarios" subtitle="Instrucción de pago, reenvíos, recordatorios de pago, pago recibido y resolución de cuentas (proveedor con seguimiento de entrega y apertura)">
          <div className="border-t border-hairline divide-y divide-hairline max-h-[320px] overflow-y-auto">
            {correos.length === 0 && <div className="px-5 py-4 text-[12px] text-mist">Sin emails.</div>}
            {correos.map((c) => (
              <div key={c.id} className="px-5 py-2.5 flex items-center gap-3 text-[13px] flex-wrap">
                <Mail size={14} className="text-ash shrink-0" />
                <span className="flex-1 min-w-[220px]"><span className="block text-carbon">{c.asunto}</span><span className="block text-[11.5px] text-ash">{c.para} · {c.tipo}</span></span>
                <span className="text-[11.5px] text-mist">{fechaHora(c.fechaHora)}</span>
                <Badge tone={c.estatus === 'Rebotado' ? 'danger' : c.estatus === 'Abierto' ? 'success' : 'blue'}>{c.estatus}</Badge>
              </div>
            ))}
          </div>
        </Panel>
      )}

      <Panel title="Avisos de pago por WhatsApp" subtitle={`El único mensaje externo: sale de ${WHATSAPP_INFLU} a quien elige la agencia en su preferencia (o al talento independiente).`}>
        <div className="border-t border-hairline overflow-x-auto">
          {mensajes.length === 0 ? <EmptyState icon={MessageCircle} title="Sin avisos de pago" message="Se envían cuando se libera un adelanto o se liquida un remanente." /> : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-hairline">
                  {['Fecha y hora', 'Operación', 'Destinatario', 'WhatsApp', 'Aviso', 'Estatus', ''].map((h, i) => (
                    <th key={h || i} className="px-4 py-2.5 text-left text-[10px] uppercase tracking-wide text-mist font-medium whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {mensajes.slice(0, 25).map((m) => (
                  <tr key={m.id} className="border-b border-hairline last:border-0" title={m.contenido}>
                    <td className="px-4 py-2.5 text-[12.5px] tabular-nums whitespace-nowrap">{fechaHora(m.fechaHora)}</td>
                    <td className="px-4 py-2.5 font-mono text-[12px] text-blue-link whitespace-nowrap">{porId(v.operaciones, m.operacionId)?.folio}</td>
                    <td className="px-4 py-2.5 text-[13px] whitespace-nowrap">{m.nombre} <span className="text-[11px] text-ash">· {m.destinatario.toLowerCase()}</span></td>
                    <td className="px-4 py-2.5 text-[12.5px] text-ash whitespace-nowrap tabular-nums">{m.telefono}</td>
                    <td className="px-4 py-2.5 text-[13px] whitespace-nowrap">{m.tipo}</td>
                    <td className="px-4 py-2.5 whitespace-nowrap"><Badge tone={estadoTone(m.estatus)}>{m.estatus === 'Fallido' ? 'No entregado' : m.estatus}</Badge></td>
                    <td className="px-4 py-2.5 text-right whitespace-nowrap">
                      {m.estatus === 'Fallido' && (autoriza.mensajes(rol)
                        ? <Button size="sm" variant="outlined" onClick={() => reenviar(m.id)}>Reenviar</Button>
                        : <span className="text-[11px] text-mist">Lo reenvía el equipo</span>)}
                    </td>
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
