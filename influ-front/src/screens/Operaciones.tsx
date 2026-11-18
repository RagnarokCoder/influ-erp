import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Bell, Inbox, Search, Link2, BarChart3, FileText } from 'lucide-react';
import Panel from '../components/ui/Panel';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Stepper from '../components/ui/Stepper';
import Archivo from '../components/ui/Archivo';
import EmptyState from '../components/ui/EmptyState';
import { Check, Fila } from '../components/ui/Fila';
import { ModalFirma } from '../components/operacion/Modales';
import CartaCesion from '../components/operacion/CartaCesion';
import { useInflu, useVista, usuarioActual } from '../store/useInflu';
import { autoriza, puedeVer } from '../lib/permisos';
import {
  ETAPAS, beneficiario, cxcDe, cxpDe, documentoUnico, empresaDe, etapa, liquidacion, montoAdelanto, montoBaseOp, notificaciones,
  pagoMarca, piezasDe, plazoReal, porId, recordatorios, textoEntregable, variableAcumulada, vencimientoOp,
} from '../lib/derive';
import { ahora, diffDays, estadoTone, fechaHora, formatDate, money } from '../lib/format';
import { COMISION_FIJA, HOY_ISO, PORCENTAJE_ADELANTO, QUORUM_APROBACION, TASA_MENSUAL } from '../data/constantes';
import type { Operacion } from '../data/types';

const ESTATUS = ['En revisión', 'Observada', 'Por firmar', 'Firmada', 'Activa', 'Por liquidar', 'Liquidada', 'Rechazada'] as const;
const pct = (n: number) => `${String(n * 100).replace('.', ',')}%`;

/** Cómo ve el talento el estado de su operación (pantalla 5). */
export const estadoPortal = (o: Operacion) =>
  o.estatus === 'Activa' ? 'Adelanto liberado' : o.estatus === 'Firmada' ? 'Evidencia' : o.estatus === 'Por liquidar' ? 'Marca pagó' : o.estatus;

// Portal del talento y de la agencia: la lista de sus operaciones y el
// recorrido de cada una (pantallas 8 a 14 del flujo de Fase 1).
export const Operaciones = () => {
  const [params, setParams] = useSearchParams();
  const id = params.get('id');
  const v = useVista();
  const op = id ? v.operaciones.find((o) => o.id === id) : undefined;
  if (op) return <Detalle op={op} onVolver={() => setParams({})} />;
  return <Lista abrir={(x) => setParams({ id: x })} />;
};

function Lista({ abrir }: { abrir: (id: string) => void }) {
  const v = useVista();
  const u = useInflu(usuarioActual);
  const [busca, setBusca] = useState('');
  const [filtro, setFiltro] = useState('Todos');
  const conTalento = u?.rol !== 'Talento';
  const q = busca.trim().toLowerCase();
  const filas = useMemo(() => v.operaciones
    .filter((o) => filtro === 'Todos' || o.estatus === filtro)
    .filter((o) => !q || [o.folio, porId(v.marcas, o.marcaId)?.nombre, porId(v.talentos, o.talentoId)?.nombre].some((t) => t?.toLowerCase().includes(q)))
    .sort((a, b) => b.capturada.localeCompare(a.capturada)), [v, filtro, q]);

  return (
    <div className="px-4 md:px-10 py-6 md:py-8 max-w-[1600px] mx-auto">
      <Panel title={u?.rol === 'Agencia' ? 'Adelantos de tus talentos' : 'Mis operaciones'} subtitle="Cada adelanto con su etapa: CFDI y contrato, aprobación, firma, aceptación de marca, evidencia, adelanto y liquidación."
        right={
          <div className="flex items-center gap-1.5 bg-frost border border-hairline rounded-full px-3 py-1.5">
            <Search size={13} className="text-ash" strokeWidth={1.6} />
            <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar..." className="bg-transparent text-[13px] outline-none w-36 placeholder:text-mist" />
          </div>
        }>
        <div className="flex gap-1.5 px-5 pb-4 flex-wrap">
          {['Todos', ...ESTATUS].map((e) => (
            <button key={e} onClick={() => setFiltro(e)}
              className={`px-3 py-1 rounded-full text-[12px] font-medium border transition-colors ${filtro === e ? 'bg-carbon text-white border-carbon' : 'bg-white text-ash border-hairline hover:bg-frost'}`}>
              {e}<span className="ml-1.5 opacity-60">{e === 'Todos' ? v.operaciones.length : v.operaciones.filter((o) => o.estatus === e).length}</span>
            </button>
          ))}
        </div>
        {filas.length === 0 ? (
          <EmptyState icon={Inbox} title="Sin operaciones" message="Ajusta la búsqueda o el filtro, o pide tu primer adelanto." />
        ) : (
          <div className="overflow-x-auto border-t border-hairline">
            <table className="w-full">
              <thead>
                <tr className="border-b border-hairline">
                  {['Operación', 'Marca', ...(conTalento ? ['Talento'] : []), 'Monto', 'Adelanto', 'Vencimiento', 'Etapa', 'Estado'].map((h) => (
                    <th key={h} className={`px-4 py-2.5 text-[10px] uppercase tracking-wide text-mist font-medium whitespace-nowrap ${['Monto', 'Adelanto'].includes(h) ? 'text-right' : 'text-left'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filas.map((o) => (
                  <tr key={o.id} onClick={() => abrir(o.id)} className="border-b border-hairline hover:bg-haze cursor-pointer">
                    <td className="px-4 py-2.5 font-mono text-[12px] text-blue-link whitespace-nowrap">#{o.folio.slice(-4)}</td>
                    <td className="px-4 py-2.5 text-[13px] whitespace-nowrap">{porId(v.marcas, o.marcaId)?.nombre}</td>
                    {conTalento && <td className="px-4 py-2.5 text-[13px] whitespace-nowrap">{porId(v.talentos, o.talentoId)?.nombre}</td>}
                    <td className="px-4 py-2.5 text-[13px] text-right tabular-nums whitespace-nowrap">{money(o.monto)}</td>
                    <td className="px-4 py-2.5 text-[13px] text-right tabular-nums whitespace-nowrap">{o.adelanto ? money(o.adelanto.monto) : <span className="text-mist">—</span>}</td>
                    <td className="px-4 py-2.5 text-[12.5px] text-ash whitespace-nowrap">{o.estatus === 'Rechazada' ? '—' : formatDate(vencimientoOp(o), { day: '2-digit', month: '2-digit', year: 'numeric' })}</td>
                    <td className="px-4 py-2.5 text-[12.5px] text-ash whitespace-nowrap">{o.estatus === 'Rechazada' ? '—' : o.estatus === 'Liquidada' ? 'Cerrada' : `${etapa(o) + 1} de ${ETAPAS.length} · ${ETAPAS[etapa(o)]}`}</td>
                    <td className="px-4 py-2.5 whitespace-nowrap"><Badge tone={estadoTone(o.estatus)}>{estadoPortal(o)}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}

function Detalle({ op, onVolver }: { op: Operacion; onVolver: () => void }) {
  const navigate = useNavigate();
  const s = useInflu();
  const v = useVista();
  const u = usuarioActual(s);
  const [firmar, setFirmar] = useState(false);
  const marca = porId(v.marcas, op.marcaId);
  const tal = porId(v.talentos, op.talentoId);
  const b = beneficiario(op, v);
  const soySolicitante = u?.rol === op.solicitante;
  const c = cxcDe(op.id, v.cxc);
  const p = cxpDe(op.id, v.cxp);
  const venc = vencimientoOp(op);
  const interno = !['Agencia', 'Talento'].includes(u?.rol ?? '');
  const avisos = notificaciones(v, ahora().fechaHora, interno).filter((n) => n.operacionId === op.id).slice(0, 7);
  const titulo = op.estatus === 'En revisión' || op.estatus === 'Observada' ? 'Solicitud enviada' : op.estatus === 'Por firmar' ? 'Firma el documento único'
    : op.estatus === 'Firmada' ? 'Evidencia' : op.estatus === 'Activa' ? (diffDays(op.adelanto!.fechaHora.slice(0, 10), HOY_ISO) <= 3 ? '¡Adelanto liberado!' : 'Seguimiento')
      : op.estatus === 'Liquidada' ? 'Operación cerrada' : op.estatus === 'Por liquidar' ? 'La marca pagó' : 'Solicitud rechazada';

  return (
    <div className="px-4 md:px-10 py-6 md:py-8 max-w-[1250px] mx-auto flex flex-col gap-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <button onClick={onVolver} className="flex items-center gap-1 text-[12px] text-blue-link hover:underline mb-1"><ArrowLeft size={13} /> Mis operaciones</button>
          <div className="text-[22px] font-semibold text-carbon leading-tight">{titulo}</div>
          <div className="text-[13px] text-ash">#{op.folio.slice(-4)} · {marca?.nombre} · {money(op.monto)} · {op.plazoDias} días{u?.rol !== 'Talento' ? ` · ${tal?.nombre}` : ''}</div>
        </div>
        <Badge tone={estadoTone(op.estatus)}>{estadoPortal(op)}</Badge>
      </div>

      {op.estatus !== 'Rechazada' && (
        <div className="bg-white border border-hairline rounded-[8px] px-5 py-4">
          <Stepper pasos={ETAPAS} actual={etapa(op)} completo={op.estatus === 'Liquidada'} />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] gap-4 items-start">
        <div className="flex flex-col gap-4">
          {op.estatus === 'Rechazada' && (
            <Panel title="Solicitud rechazada" subtitle={`${op.rechazo?.usuario === 'Sistema' ? 'Validación automática del CFDI' : `Revisó ${op.rechazo?.usuario}`} · ${fechaHora(op.rechazo?.fechaHora)}`}>
              <div className="border-t border-hairline px-5 py-4 text-[13px] text-danger">{op.rechazo?.motivo}</div>
              <div className="px-5 pb-4 text-[12px] text-ash">Puedes pedir un nuevo adelanto con el CFDI o el contrato corregidos.</div>
            </Panel>
          )}

          {(op.estatus === 'En revisión' || op.estatus === 'Observada') && <Validacion op={op} soySolicitante={soySolicitante} />}

          {op.estatus === 'Por firmar' && (
            <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-4 items-start">
              <Panel title="Documento" subtitle={`Solicitud aprobada · ${marca?.nombre} · ${money(op.monto)}`}>
                <div className="border-t border-hairline px-5 pt-4 pb-2 flex flex-col gap-3 text-[13px]">
                  <div className="bg-frost rounded-[8px] px-4 py-3">
                    <b className="text-carbon">Contrato de Factoraje — Persona Moral (Agencia) v1.0</b>
                    <div className="text-smoke">Cesión de derechos de crédito · CFDI {op.cfdi.serieFolio} · UUID {op.cfdi.uuid.slice(0, 4)}…{op.cfdi.uuid.slice(-4)} · {money(op.monto)} · {empresaDe(s, op.marcaId)?.razonSocial}</div>
                    <div className="text-smoke">Cedente: {b.nombre} · adelanto {money(montoAdelanto(op))} · retenido {money(op.monto - montoAdelanto(op))} · a la cuenta ••••{b.clabe.slice(-4)}</div>
                  </div>
                  <div className="flex flex-col gap-1.5 text-smoke pl-1">
                    <div><b className="text-carbon">Anexo A</b> · Copia de la factura (CFDI {op.cfdi.serieFolio}), insertada en el documento</div>
                    <div><b className="text-carbon">Anexo B</b> · Pagaré no negociable</div>
                    <div><b className="text-carbon">Anexo C</b> · Acuerdo de uso de firma electrónica (DocuSign)</div>
                  </div>
                  <div className="text-[12px] text-ash">Un solo PDF, se firma una sola vez. El sistema llena los datos de la operación: factorado, fecha, factura (UUID, fecha y monto), montos del adelanto y retenido. La instrucción irrevocable de pago va aparte: se firma en el paso Aceptación de marca.</div>
                </div>
                <div className="px-5 pb-4">
                  <button onClick={() => s.toast(`En el sistema real se abre el PDF del Contrato de Factoraje de ${op.folio} con sus anexos A, B y C.`, 'warn')} className="text-[12.5px] text-blue-link hover:underline font-medium">Abrir documento</button>
                </div>
              </Panel>
              <Panel title="Resumen">
                <div className="border-t border-hairline px-5 py-1">
                  <Fila t="Monto facturado" v={money(op.monto)} fuerte />
                  {montoBaseOp(op) !== op.monto && <Fila t="Monto base aprobado" v={money(montoBaseOp(op))} nota="sin la porción condicionada o la pena" />}
                  <Fila t={`Adelanto (${PORCENTAJE_ADELANTO * 100}%)`} v={money(montoAdelanto(op))} fuerte />
                  <Fila t="Retenido (20%)" v={money(op.monto - montoAdelanto(op))} fuerte />
                  <Fila t="Comisión fija" v={pct(COMISION_FIJA)} fuerte />
                  <Fila t="Comisión variable" v={`${pct(TASA_MENSUAL)} mensual`} fuerte />
                </div>
                <div className="px-5 pb-4 pt-2">
                  {soySolicitante
                    ? <Button onClick={() => setFirmar(true)}>Firmar con DocuSign</Button>
                    : <Button disabled>{autoriza.solicitud(u?.rol ?? 'Talento') ? `Lo firma ${b.nombre}, que pidió el adelanto` : `Firma pendiente de ${b.nombre}`}</Button>}
                </div>
              </Panel>
            </div>
          )}

          {op.estatus === 'Firmada' && (
            <>
              <AceptacionMarca op={op} soySolicitante={soySolicitante} />
              <EvidenciaCampana op={op} soySolicitante={soySolicitante} />
            </>
          )}

          {(op.estatus === 'Activa' || op.estatus === 'Por liquidar') && op.adelanto && <PagoYSeguimiento op={op} />}

          {op.estatus === 'Liquidada' && p?.pago && (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-start">
              <Panel title="Remanente">
                <div className="border-t border-hairline px-5 py-1">
                  <Fila t={`${marca?.nombre} pagó a Influ`} v={money(op.monto)} fuerte />
                  <Fila t="Retenido (20%)" v={money(op.monto - (op.adelanto?.monto ?? 0))} fuerte />
                  <Fila t={`Comisión fija (${pct(COMISION_FIJA)})`} v={`−${money(p.pago.fijo)}`} fuerte />
                  <Fila t={`Comisión variable (${pct(TASA_MENSUAL)} × ${p.pago.meses} ${p.pago.meses === 1 ? 'mes' : 'meses'})`} v={`−${money(p.pago.variable)}`} fuerte />
                  <div className="flex items-end justify-between py-3"><span className="text-[15px] font-semibold text-carbon">Neto transferido</span><span className="text-[24px] font-semibold tabular-nums">{money(p.pago.importe)}</span></div>
                  <div className="text-[11.5px] text-ash pb-3">Cálculo sobre el monto adelantado.</div>
                </div>
              </Panel>
              <Panel title="Resumen de la operación">
                <div className="border-t border-hairline px-5 py-1">
                  <Fila t={`Adelantado el ${formatDate(op.adelanto?.fechaHora.slice(0, 10), { day: '2-digit', month: '2-digit' })}`} v={money(op.adelanto?.monto ?? 0)} fuerte />
                  <Fila t={`Liquidado el ${formatDate(p.pago.fecha, { day: '2-digit', month: '2-digit' })}`} v={money(p.pago.importe)} fuerte />
                  <Fila t="Total recibido" v={money((op.adelanto?.monto ?? 0) + p.pago.importe)} fuerte />
                  <Fila t="Plazo real de pago de la marca" v={`${plazoReal(op, c) ?? '—'} días`} fuerte nota={`pactado: ${op.plazoDias} días`} />
                </div>
                <div className="px-5 pb-4 pt-2 flex gap-3 items-center">
                  <Badge tone="success">Pagada</Badge>
                  <button onClick={() => s.toast(`En el sistema real se descarga el comprobante en PDF de ${op.folio}.`, 'warn')} className="text-[12.5px] text-blue-link hover:underline">Descargar comprobante</button>
                  <button onClick={() => navigate(puedeVer(u?.rol ?? 'Talento', '/resumen') ? '/resumen' : '/')} className="text-[12.5px] text-blue-link hover:underline">Volver al inicio</button>
                </div>
              </Panel>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <Panel title="Detalle de la operación">
            <div className="border-t border-hairline px-5 py-1">
              <Fila t="Marca" v={marca?.nombre} nota={empresaDe(s, op.marcaId)?.razonSocial} />
              <Fila t="CFDI" v={<span className="font-mono text-[12px]">{op.cfdi.serieFolio}</span>} />
              <Fila t="Entregables" v={op.entregables.map(textoEntregable).join(' · ')} />
              <Fila t="Publicación" v={formatDate(op.fechaPublicacion)} />
              <Fila t="Vencimiento" v={op.estatus === 'Rechazada' ? '—' : formatDate(venc)} />
              <Fila t="Área de pagos" v={op.contactoPagos.email} nota={op.contactoPagos.nombre} />
              <Fila t="Recibe el pago" v={b.nombre} />
              <Fila t="RUG inscripto" v={op.rug?.estado === 'Inscrita' ? 'Sí' : 'No'} />
            </div>
          </Panel>
          {piezasDe(op.id, v.piezas).length > 0 && (
            <Button variant="outlined" onClick={() => navigate(`/metricas?id=${op.id}`)}><BarChart3 size={14} /> Ver métricas de la campaña</Button>
          )}
          <Panel title="Notificaciones de esta operación">
            <div className="border-t border-hairline divide-y divide-hairline">
              {avisos.length === 0 && <div className="px-5 py-4 text-[12px] text-mist">Sin notificaciones todavía.</div>}
              {avisos.map((n) => (
                <div key={n.id} className="px-5 py-2.5 flex gap-2.5">
                  <Bell size={14} className="text-ash mt-0.5 shrink-0" strokeWidth={1.6} />
                  <div className="min-w-0">
                    <div className="text-[12.5px] font-medium text-carbon">{n.titulo.split(' · ').slice(-1)[0]}</div>
                    <div className="text-[11px] text-ash">{fechaHora(n.fechaHora)}</div>
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>

      {firmar && <ModalFirma op={op} onClose={() => setFirmar(false)} />}
    </div>
  );
}

/** Pantalla 8: chequeos del CFDI contra el SAT y avance de la IA sobre el contrato. */
function Validacion({ op, soySolicitante }: { op: Operacion; soySolicitante: boolean }) {
  const s = useInflu();
  const [archivo, setArchivo] = useState<string[]>([]);
  const a = op.analisis;
  const rojoCesion = a.campos.some((c) => c.clave === 'cesion' && c.alerta?.nivel === 'Rojo');
  return (
    <>
      {op.estatus === 'Observada' && op.observacion && (
        <Panel title="El equipo de Influ pidió un ajuste" subtitle={`${op.observacion.usuario} · ${fechaHora(op.observacion.fechaHora)}`} right={<Badge tone="danger">Observada</Badge>}>
          <div className="border-t border-hairline px-5 py-4 flex flex-col gap-3">
            <div className="text-[13px] text-carbon">{op.observacion.nota}</div>
            {soySolicitante ? (
              <>
                <Archivo titulo={rojoCesion ? 'Consentimiento escrito de la marca' : 'Contrato corregido'} ayuda={rojoCesion ? 'Carta o correo de la marca que autoriza ceder el cobro a Influ' : 'PDF, escaneo o foto: la IA lo vuelve a leer'}
                  acepta=".pdf,.jpg,.jpeg,.png,.eml" archivos={archivo} onChange={setArchivo} ejemplo={rojoCesion ? `consentimiento_cesion_${op.folio.slice(-4)}.pdf` : `contrato_corregido_${op.folio.slice(-4)}.pdf`} />
                <Button className="self-start" onClick={() => s.responderObservacion(op.id, archivo[0] ?? '', rojoCesion ? 'consentimiento' : 'contrato')}>Enviar a revisión</Button>
              </>
            ) : <div className="text-[12px] text-ash">Lo responde quien pidió el adelanto.</div>}
          </div>
        </Panel>
      )}
      <Panel title="CFDI y contrato" right={<Badge tone={a.estado === 'En curso' ? 'warning' : 'success'}>{a.estado === 'En curso' ? 'En curso' : 'Listo'}</Badge>}>
        <div className="border-t border-hairline px-5 py-3">
          <div className="text-[11px] uppercase tracking-wide text-mist font-medium mb-1">Validación del CFDI ante el SAT</div>
          <Check ok={op.validacion.uuidVigente} texto="Folio fiscal (UUID) vigente en el SAT" />
          <Check ok={op.validacion.rfcEmisor} texto={op.solicitante === 'Agencia' ? 'RFC emisor coincide con tu agencia' : 'RFC emisor coincide con tu RFC'} />
          <Check ok={op.validacion.lista69b} texto="Sin coincidencias en la lista 69-B" />
          <Check ok={op.validacion.montoFecha} texto="Monto y fecha válidos" />
          <Check ok={op.validacion.marcaVinculada} texto={`Marca vinculada: ${op.cfdi.receptor.nombre.split(',')[0]}`} />
        </div>
        <div className="border-t border-hairline px-5 py-4 flex flex-col gap-3 text-[13px] text-ash">
          <div className="text-[11px] uppercase tracking-wide text-mist font-medium">Análisis del contrato</div>
          {a.estado === 'En curso' ? (
            <>
              <span>Nuestra IA está leyendo el contrato: partes, fechas, monto, entregables, KPIs, penas, cesión e incumplimiento.</span>
              <div className="h-1.5 rounded-full bg-pebble overflow-hidden"><div className="h-full bg-blue transition-all" style={{ width: `${Math.round((a.pagina / op.contrato.paginas) * 100)}%` }} /></div>
              <span>Leyendo página {Math.min(op.contrato.paginas, a.pagina + 1)} de {op.contrato.paginas}</span>
            </>
          ) : (
            <span>La IA terminó de leer las {op.contrato.paginas} páginas ({fechaHora(a.fin)}). El equipo de Influ revisa la ficha: {op.votos.length} de {QUORUM_APROBACION} votos.</span>
          )}
          <div className="border-l-2 border-blue bg-ice rounded-r-[8px] px-3 py-2.5 text-carbon">Después, el equipo de Influ revisa y aprueba. Te avisamos por aquí y por WhatsApp.</div>
        </div>
      </Panel>
    </>
  );
}

/** Paso Aceptación de marca: el documento único firmado (contratos) y la firma de
 * la instrucción irrevocable de pago, que sale a la marca para su confirmación (cambio 1 y 23). */
function AceptacionMarca({ op, soySolicitante }: { op: Operacion; soySolicitante: boolean }) {
  const s = useInflu();
  const v = useVista();
  const [carta, setCarta] = useState(false);
  const doc = documentoUnico(op, v);
  const marca = porId(v.marcas, op.marcaId)?.nombre ?? 'la marca';
  const c = op.cesion;
  const estadoInstr = c?.acuse ? { tone: 'success' as const, t: `${marca} confirmó` } : c ? { tone: 'warning' as const, t: 'Esperando confirmación' } : { tone: 'warning' as const, t: soySolicitante ? 'Falta tu firma' : 'Falta la firma de la agencia' };
  const pasos = [
    ['Firma la instrucción', `La agencia instruye a ${marca} que pague a Influ, en la cuenta de Kapital.`],
    ['Se envía sola', `A ${op.contactoPagos.email}, con copia a la agencia y a Influ.`],
    ['La marca confirma', 'Con el enlace; queda la fecha y hora. Tiene 2 días hábiles.'],
  ];
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-start">
      <Panel title="Contratos firmados" subtitle={doc.firmadoEl ? `Firmado por ${op.docusign?.firmo} · ${fechaHora(doc.firmadoEl)} · queda guardado en la operación` : 'documento único'} right={<Badge tone="success">Firmado</Badge>}>
        <div className="border-t border-hairline px-5 py-4 flex flex-col gap-3">
          <div className="flex items-center gap-3 border border-hairline rounded-[8px] px-3 py-2.5">
            <FileText size={18} className="text-danger shrink-0" strokeWidth={1.4} />
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-medium text-carbon truncate">{doc.archivo}</div>
              <div className="text-[11.5px] text-ash">Documento único · {doc.paginas} págs. · firmado en DocuSign</div>
            </div>
            <button onClick={() => s.registrarAperturaContrato(op.id, 'Apertura')} className="text-[12px] text-blue-link font-medium hover:underline">Ver</button>
            <Button size="sm" onClick={() => s.registrarAperturaContrato(op.id, 'Descarga')}>Descargar PDF</Button>
          </div>
          <div className="text-[12px] text-smoke flex flex-col gap-0.5 pl-1">
            <div>Incluye, en el mismo archivo:</div>
            <div>· Contrato de factoraje</div>
            <div>· Anexo A · Copia de la factura (CFDI {op.cfdi.serieFolio})</div>
            <div>· Anexo B · Pagaré no negociable</div>
            <div>· Anexo C · Acuerdo de uso de firma electrónica</div>
          </div>
          <div className="text-[11.5px] text-mist">Un solo archivo, sin .zip. La instrucción irrevocable de pago no va aquí: se firma en esta misma etapa.</div>
        </div>
      </Panel>
      <Panel title="Instrucción irrevocable de pago" subtitle="Paso Aceptación de marca" right={<Badge tone={estadoInstr.tone}>{estadoInstr.t}</Badge>}>
        <div className="border-t border-hairline px-5 py-4 flex flex-col gap-3">
          {!c ? (
            <>
              <div className="flex flex-col gap-2.5">
                {pasos.map(([t, d], i) => (
                  <div key={t} className="flex gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-ice text-blue-link text-[11px] font-semibold flex items-center justify-center shrink-0">{i + 1}</span>
                    <div><div className="text-[12.5px] text-carbon font-medium">{t}</div><div className="text-[11.5px] text-ash">{d}</div></div>
                  </div>
                ))}
              </div>
              {soySolicitante
                ? <Button onClick={() => setCarta(true)}>Revisar y firmar la instrucción</Button>
                : <div className="text-[12px] text-ash">La firma {op.solicitante === 'Agencia' ? 'la agencia' : 'el talento'}, que pidió el adelanto.</div>}
            </>
          ) : (
            <>
              <Check ok={!!c.firmada} texto={`Firmada por la agencia${c.firmada ? ` · ${fechaHora(c.firmada.fechaHora)}` : ''}`} />
              <Check ok texto={`Enviada a ${c.email} · CC agencia e Influ`} />
              <Check ok={!!c.acuse} aviso={!c.acuse} texto={c.acuse ? `${marca} confirmó · ${fechaHora(c.acuse)}` : 'Esperando confirmación de la marca (2 días hábiles)'} />
              <Button variant="outlined" className="self-start" onClick={() => setCarta(true)}>Ver instrucción</Button>
              <div className="text-[11.5px] text-mist">El adelanto no se libera sin la confirmación de la marca (cláusula quinta del contrato).</div>
            </>
          )}
        </div>
      </Panel>
      {carta && <CartaCesion op={op} onClose={() => setCarta(false)} onFirmar={!c && soySolicitante ? () => s.firmarInstruccion(op.id) : undefined} />}
    </div>
  );
}

/** Pantalla 10: el talento/agencia pega el link de cada publicación como evidencia. No ve el análisis de la IA ni las métricas. */
function EvidenciaCampana({ op, soySolicitante }: { op: Operacion; soySolicitante: boolean }) {
  const s = useInflu();
  const v = useVista();
  const piezas = piezasDe(op.id, v.piezas);
  const [links, setLinks] = useState<Record<string, string>>({});
  const marca = porId(s.marcas, op.marcaId)?.nombre ?? '';
  const filas = op.entregables.flatMap((e) => Array.from({ length: e.cantidad }, (_, i) => ({ e, i: i + 1 })));
  const editable = soySolicitante && !op.evidencia;

  return (
    <Panel title="Evidencia" subtitle={`${marca} · ${editable ? 'Pega el link de cada publicación' : op.evidencia ? `enviada por ${op.evidencia.usuario} · ${fechaHora(op.evidencia.fechaHora)}` : 'La carga quien pidió el adelanto'}`}>
      <div className="border-t border-hairline overflow-x-auto">
        <table className="w-full">
          <thead><tr className="border-b border-hairline">{['Entregable', 'Link de la publicación'].map((h) => <th key={h} className="px-4 py-2.5 text-left text-[10px] uppercase tracking-wide text-mist font-medium whitespace-nowrap">{h}</th>)}</tr></thead>
          <tbody>
            {filas.map(({ e, i }) => {
              const pz = piezas.find((x) => x.entregableId === e.id && x.indice === i);
              const key = `${e.id}-${i}`;
              return (
                <tr key={key} className="border-b border-hairline last:border-0">
                  <td className="px-4 py-2.5 text-[13px] whitespace-nowrap">{e.formato} {i} · {e.red === 'Instagram' ? 'IG' : e.red}</td>
                  <td className="px-4 py-2.5 text-[12.5px] min-w-[320px]">
                    {editable ? (
                      <div className="flex gap-2">
                        <input value={links[key] ?? pz?.link ?? ''} onChange={(ev) => setLinks({ ...links, [key]: ev.target.value })}
                          placeholder={e.red === 'TikTok' ? 'tiktok.com/@usuario/video/…' : e.red === 'YouTube' ? 'youtube.com/watch?v=…' : e.formato === 'Story' ? 'instagram.com/stories/…' : 'instagram.com/reel/…'}
                          className="flex-1 min-w-0 border border-hairline rounded-[6px] px-2 py-1.5 text-[12.5px] focus:outline-none focus:border-blue" />
                        <Button size="sm" variant="outlined" onClick={() => s.cargarPieza(op.id, e.id, i, links[key] ?? pz?.link ?? '')}><Link2 size={12} /> Guardar link</Button>
                      </div>
                    ) : <span className="text-ash truncate block max-w-[360px]">{pz?.link?.replace('https://www.', '') ?? '—'}</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="px-5 py-4 flex flex-col gap-2.5 border-t border-hairline">
        {editable && <Button className="self-start" onClick={() => s.enviarEvidencia(op.id, { aprobacionMarca: `evidencia_${op.folio.slice(-4)}`, alcance: 'Campaña completa', porcentaje: 100 })}>Enviar evidencia</Button>}
        {op.evidencia && <div className="text-[13px] text-carbon font-medium">Evidencia enviada · {fechaHora(op.evidencia.fechaHora)}</div>}
        <div className="text-[11.5px] text-mist">Pega el link de cada publicación y envíalo como evidencia de que se cumplió lo pactado con la marca.</div>
      </div>
    </Panel>
  );
}

/** Pantallas 12 y 13: el pago liberado y el seguimiento hasta el pago de la marca. */
function PagoYSeguimiento({ op }: { op: Operacion }) {
  const s = useInflu();
  const v = useVista();
  const c = cxcDe(op.id, v.cxc);
  const venc = vencimientoOp(op);
  const b = beneficiario(op, v);
  const orden = v.ordenes.find((o) => o.operacionId === op.id && o.tipo === 'Adelanto');
  const marca = porId(v.marcas, op.marcaId)?.nombre;
  const avisados = v.mensajes.filter((m) => m.operacionId === op.id && m.tipo === 'Adelanto enviado').map((m) => (m.destinatario === 'Talento' ? m.nombre.split(' ')[0] : m.nombre));
  const pagada = pagoMarca(c);
  const dias = diffDays(HOY_ISO, venc);
  const acum = variableAcumulada(op);
  const l = liquidacion(op, c);
  const hitos = [
    { t: `Adelanto liberado · ${money(op.adelanto!.monto)}`, f: op.adelanto!.fechaHora, hecho: true },
    { t: op.cesion?.acuse ? `Aceptación de marca · ${marca ?? 'la marca'} aceptó la instrucción de pago` : 'Aceptación de marca', f: op.cesion?.acuse, d: op.cesion?.email, hecho: !!op.cesion?.acuse, hora: true },
    ...recordatorios(op).map((r) => ({ t: `Recordatorio ${r.dias === 1 ? '1 día' : `${r.dias} días`}`, f: `${r.fecha}T08:00`, d: 'email al área de pagos', hecho: r.enviado || !!pagada })),
    { t: `Pago de la marca a Influ`, f: pagada ? `${pagada}T09:00` : `${venc}T00:00`, hecho: !!pagada },
    { t: 'Remanente', f: undefined, hecho: false },
  ].sort((a, b2) => Number(b2.hecho) - Number(a.hecho));
  return (
    <>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-start">
        <div className="bg-white border-2 border-blue rounded-[8px] px-5 py-4">
          <div className="text-[13px] text-ash">Transferimos a {op.solicitante === 'Agencia' ? `la CLABE de ${b.nombre}` : 'tu CLABE'} •••• {b.clabe.slice(-4)}</div>
          <div className="text-[34px] font-bold tabular-nums text-carbon tracking-[-0.5px]">{money(op.adelanto!.monto)}</div>
          <Fila t="Clave de rastreo SPEI" v={op.adelanto!.referencia} fuerte />
          <Fila t="Comprobante (CEP)" v={<button onClick={() => s.toast(`En el sistema real se descarga ${orden?.cep?.archivo ?? 'el CEP'}.`, 'warn')} className="text-blue-link font-semibold">Descargar</button>} />
          <Fila t="Aviso enviado por WhatsApp" v={avisados.length ? avisados.join(' y ') : '—'} fuerte />
        </div>
        <Panel title="Desglose">
          <div className="border-t border-hairline px-5 py-1">
            <Fila t={`Monto base (${op.evidencia?.alcance === 'Hitos parciales' ? `${op.evidencia.porcentaje}% cumplido` : 'campaña completa'})`} v={money(op.adelanto!.base)} fuerte />
            <Fila t={`Adelanto ${PORCENTAJE_ADELANTO * 100}%`} v={money(op.adelanto!.monto)} fuerte />
            <Fila t="Retenido" v={money(op.monto - op.adelanto!.monto)} fuerte nota="la factura completa menos el adelanto" />
            <Fila t="Vencimiento de la marca" v={formatDate(venc, { day: '2-digit', month: '2-digit', year: 'numeric' })} fuerte />
          </div>
          <div className="px-5 pb-4 text-[12.5px] text-ash">El 20% se liquida cuando {marca} le paga a Influ, neto de comisiones (estimado hoy: {money(l.neto)}).</div>
        </Panel>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-start">
        <Panel title="Línea de tiempo">
          <div className="border-t border-hairline px-5 py-4 flex flex-col">
            {hitos.map((h, i) => (
              <div key={h.t} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <span className={`w-3.5 h-3.5 rounded-full mt-1 ${h.hecho ? 'bg-blue' : 'bg-pebble'}`} />
                  {i < hitos.length - 1 && <span className="w-0.5 flex-1 bg-pebble" />}
                </div>
                <div className="pb-3.5">
                  <div className={`text-[13.5px] ${h.hecho ? 'text-carbon' : 'text-ash'}`}>{h.t}</div>
                  <div className="text-[11.5px] text-ash">{h.f ? ('hora' in h && h.hora ? fechaHora(h.f) : formatDate(h.f.slice(0, 10), { day: '2-digit', month: '2-digit', year: 'numeric' })) : ''}{'d' in h && h.d ? ` · ${h.d}` : ''}</div>
                </div>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Vencimiento">
          <div className="border-t border-hairline px-5 py-4">
            {pagada ? <div className="text-[17px] font-semibold text-success">La marca pagó el {formatDate(pagada)}. El remanente está en orden de pago.</div> : (
              <>
                <div className={`text-[34px] font-bold tabular-nums ${dias < 0 ? 'text-danger' : 'text-carbon'}`}>{Math.abs(dias)}</div>
                <div className="text-[13px] text-ash mb-2">{dias < 0 ? 'días de atraso de la marca' : 'días para el vencimiento'}</div>
              </>
            )}
            <Fila t="Estado" v={pagada ? 'Pago recibido · por liquidar' : dias < 0 ? 'Factura vencida · cobranza' : 'Esperando pago de la marca'} fuerte />
            <Fila t="Comisión variable acumulada" v={acum ? `${money(acum.monto)} · ${acum.meses} ${acum.meses === 1 ? 'mes' : 'meses'}` : '—'} fuerte nota={`${pct(TASA_MENSUAL)} mensual sobre lo adelantado`} />
          </div>
        </Panel>
      </div>
    </>
  );
}

