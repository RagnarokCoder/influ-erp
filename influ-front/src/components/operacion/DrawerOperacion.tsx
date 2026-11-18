import { useNavigate } from 'react-router-dom';
import { CheckCircle2, XCircle } from 'lucide-react';
import Drawer from '../ui/Drawer';
import Button from '../ui/Button';
import { Relacion, RenglonRelacion } from '../crud/DataModule';
import { useInflu, rolActual } from '../../store/useInflu';
import { autoriza, puedeVer } from '../../lib/permisos';
import {
  beneficiario, contratoGenerado, cxcDe, cxpDe, documentoUnico, empresaDe, estadoCesion, handlePrincipal, liquidacion, montoAdelanto, montoBaseOp, ordenDe, pagoMarca, piezasDe, porId,
  semaforoDe, textoEntregable, vencimientoOp,
} from '../../lib/derive';
import { ahora, fechaHora, formatDate, money } from '../../lib/format';
import { QUORUM_APROBACION } from '../../data/constantes';
import type { Operacion } from '../../data/types';

const Check = ({ ok, titulo, detalle }: { ok: boolean; titulo: string; detalle?: string }) => (
  <div className="flex items-center justify-between gap-3 border border-hairline rounded-[8px] px-3 py-2">
    <span className="flex items-center gap-2 text-[13px] text-carbon min-w-0">
      {ok ? <CheckCircle2 size={14} className="text-success shrink-0" /> : <XCircle size={14} className="text-danger shrink-0" />}
      <span className="truncate">{titulo}</span>
    </span>
    {detalle && <span className="text-[11px] text-ash truncate max-w-[45%] text-right">{detalle}</span>}
  </div>
);

// Expediente de la operación: ficha, documentación y trazabilidad de cada etapa.
export default function DrawerOperacion({ op, onClose, onCobro }: { op: Operacion; onClose: () => void; onCobro: () => void }) {
  const s = useInflu();
  const navigate = useNavigate();
  const rol = rolActual(s);
  const tal = porId(s.talentos, op.talentoId);
  const ag = porId(s.agencias, op.agenciaId);
  const marca = porId(s.marcas, op.marcaId);
  const empresa = empresaDe(s, op.marcaId);
  const b = beneficiario(op, s);
  const c = cxcDe(op.id, s.cxc);
  const p = cxpDe(op.id, s.cxp);
  const pagada = pagoMarca(c);
  const l = liquidacion(op, c);
  const interno = autoriza.revision(rol);
  const piezas = piezasDe(op.id, s.piezas);
  const oA = ordenDe(op.id, 'Adelanto', s.ordenes);
  const oR = ordenDe(op.id, 'Remanente', s.ordenes);
  const ir = (ruta: string) => { onClose(); navigate(ruta); };

  return (
    <Drawer open onClose={onClose} title={op.folio} subtitle={`${tal?.nombre} · ${op.estatus}`}
      footer={
        <>
          {['En revisión', 'Observada'].includes(op.estatus) && interno && <Button size="sm" onClick={() => ir(`/revision?id=${op.id}`)}>Revisar ficha</Button>}
          {op.rug?.estado === 'En cola' && interno && <Button size="sm" onClick={() => ir(`/rug?id=${op.id}`)}>Inscribir en RUG</Button>}
          {op.estatus === 'Firmada' && interno && op.cesion && !op.cesion.acuse && <Button size="sm" variant="outlined" onClick={() => ir('/cesiones')}>Instrucción de pago</Button>}
          {contratoGenerado(op) && interno && <Button size="sm" variant="ghost" onClick={() => ir(`/contratos?id=${op.id}`)}>Contrato</Button>}
          {op.estatus === 'Activa' && interno && <Button size="sm" onClick={onCobro}>Registrar pago de la marca</Button>}
          {(op.estatus === 'Firmada' || op.estatus === 'Por liquidar') && interno && <Button size="sm" variant="outlined" onClick={() => ir('/pagos')}>Pagos</Button>}
          {puedeVer(rol, '/operaciones') && <Button size="sm" variant="ghost" onClick={() => ir(`/operaciones?id=${op.id}`)}>Ver operación</Button>}
        </>
      }>
      <div className="flex flex-col gap-6">
        {op.rechazo && (
          <div className="border border-danger/30 bg-danger-wash rounded-[8px] px-3 py-2 text-[12px] text-danger">
            Rechazada por {op.rechazo.usuario} el {fechaHora(op.rechazo.fechaHora)}: {op.rechazo.motivo}
          </div>
        )}
        {op.observacion && op.estatus === 'Observada' && (
          <div className="border border-warning/40 bg-warning-wash rounded-[8px] px-3 py-2 text-[12px] text-warning">Observada por {op.observacion.usuario}: {op.observacion.nota}</div>
        )}
        <Relacion titulo="Ficha">
          <RenglonRelacion titulo="Talento" detalle={`${handlePrincipal(tal)} · ${tal?.nichos.join(', ')}`} valor={tal?.nombre} />
          <RenglonRelacion titulo="Pidió el adelanto" detalle={op.solicitante === 'Agencia' ? 'la agencia firma, carga evidencia y recibe el pago' : 'el talento firma, carga evidencia y recibe el pago'} valor={b.nombre} />
          {ag && op.solicitante === 'Talento' && <RenglonRelacion titulo="Agencia" detalle={`aviso de pago: ${ag.avisoPago.toLowerCase()}`} valor={ag.nombre} />}
          <RenglonRelacion titulo="Marca · empresa que paga" detalle={`${empresa?.razonSocial} · ${op.contactoPagos.email}`} valor={marca?.nombre} />
          <RenglonRelacion titulo="Entregables" detalle={op.entregables.map(textoEntregable).join(' + ')} />
          <RenglonRelacion titulo="Monto facturado" detalle={`CFDI ${op.cfdi.serieFolio} · ${op.cfdi.metodoPago}`} valor={money(op.monto)} />
          <RenglonRelacion titulo="Monto base" detalle={op.montoBase ? 'aprobado por el equipo' : `sugerido por la IA${semaforoDe(op) ? ` · semáforo ${semaforoDe(op)?.toLowerCase()}` : ''}`} valor={money(montoBaseOp(op))} />
          <RenglonRelacion titulo="Adelanto (80%)" detalle={op.evidencia?.alcance === 'Hitos parciales' ? `sobre el ${op.evidencia.porcentaje}% cumplido` : op.adelanto ? `SPEI ${op.adelanto.referencia}` : 'se calcula con la evidencia'} valor={money(montoAdelanto(op))} />
          <RenglonRelacion titulo="Vencimiento de la factura" detalle={`publicación ${formatDate(op.fechaPublicacion)} + ${op.plazoDias} días`} valor={formatDate(vencimientoOp(op))} />
          {op.adelanto && <RenglonRelacion titulo={pagada ? 'Remanente neto' : 'Remanente estimado'} detalle={`retenido ${money(l.retenido)} − fijo ${money(l.fijo)} − variable ${money(l.variable)} (${l.meses} m)`} valor={money(p?.pago?.importe ?? l.neto)} />}
        </Relacion>

        <Relacion titulo="Documentación">
          <Check ok={op.validacion.uuidVigente} titulo="UUID vigente en el SAT" detalle={`${op.cfdi.uuid.slice(0, 13)}… · ${op.validacion.pac}`} />
          <Check ok={op.validacion.rfcEmisor} titulo="RFC emisor coincide" detalle={op.cfdi.emisor.rfc} />
          <Check ok={op.validacion.lista69b} titulo="Sin coincidencias en la lista 69-B" detalle={op.cfdi.receptor.rfc} />
          <Check ok={op.validacion.montoFecha} titulo="Monto y fecha válidos" />
          <Check ok={op.validacion.marcaVinculada} titulo="Marca vinculada por el RFC receptor" detalle={empresa?.razonSocial} />
          <Check ok={op.analisis.estado === 'Lista' && semaforoDe(op) !== 'Rojo'} titulo={`CFDI y contrato (IA)${semaforoDe(op) ? ` · ${semaforoDe(op)}` : ' · leyendo'}`} detalle={`${op.contrato.archivo} · ${op.contrato.paginas} págs.`} />
          <Check ok={!!op.consultaRug && !op.consultaRug.registros.length} titulo="Consulta previa del RUG" detalle={op.consultaRug ? `${op.consultaRug.registros.length} registros previos` : 'pendiente'} />
          {(() => {
            const doc = documentoUnico(op, s);
            if (!doc.firmado) return <Check ok={false} titulo="Contrato de factoraje · documento único" detalle={op.docusign ? 'enviado, sin firmar' : 'con la aprobación'} />;
            return (
              <>
                <Check ok titulo={`Contrato de factoraje firmado · ${doc.archivo}`} detalle={`${doc.paginas} págs. · sobre DocuSign ${doc.sobre}`} />
                {doc.partes.map((p) => <Check key={p.clave} ok titulo={p.etiqueta} detalle={`firmado · pág. ${p.firmaPagina}`} />)}
                <Check ok titulo="Firmado por" detalle={doc.firmantes.map((f) => f.nombre).join(' · ')} />
              </>
            );
          })()}
          <Check ok={!!op.cesion?.acuse} titulo="Instrucción de pago con confirmación" detalle={op.cesion ? estadoCesion(op, ahora().fechaHora) : 'al firmar'} />
          <Check ok={op.rug?.estado === 'Inscrita' || op.rug?.estado === 'Cancelada' || op.rug?.estado === 'Actualizada'} titulo="Instrucción de pago inscrita en el RUG" detalle={op.rug?.folio ?? op.rug?.estado ?? 'al firmar'} />
          <Check ok={!!op.evidencia} titulo="Evidencia · análisis IA de los links" detalle={piezas.length ? `${piezas.filter((x) => x.verificacion.ok).length} de ${piezas.length} aprobadas (red, formato, fecha, mención)` : 'pendiente'} />
        </Relacion>

        <Relacion titulo="Trazabilidad">
          <RenglonRelacion titulo="Capturó" detalle={fechaHora(op.capturada)} valor={op.capturadaPor} />
          <RenglonRelacion titulo="CFDI y contrato" detalle={`${op.validacion.motivo ?? 'CFDI en regla (UUID, RFC, 69-B, monto y fecha)'} · ${op.analisis.fin ? `contrato leído ${fechaHora(op.analisis.fin)} · ${op.analisis.campos.filter((x) => x.correccion).length} correcciones del equipo` : `leyendo contrato página ${op.analisis.pagina + 1} de ${op.contrato.paginas}`}`} valor="Sistema" />
          <RenglonRelacion titulo={`Votos · ${op.votos.length} de ${QUORUM_APROBACION}`} detalle={op.votos.map((x) => `${x.usuario.split(' ')[0]} ${fechaHora(x.fechaHora)}`).join(' · ') || 'pendientes'} valor={op.confirmaciones ? 'con alertas verificadas' : undefined} />
          <RenglonRelacion titulo="Firma" detalle={op.docusign?.firmado ? fechaHora(op.docusign.firmado) : 'pendiente'} valor={op.docusign?.firmo ?? '—'} />
          <RenglonRelacion titulo="Instrucción de pago" detalle={op.cesion ? `enviada ${fechaHora(op.cesion.enviada)}${op.cesion.acuse ? ` · la marca aceptó la instrucción de pago ${fechaHora(op.cesion.acuse)}` : ''}${op.cesion.reenvios.length ? ` · ${op.cesion.reenvios.length} reenvío(s)` : ''}` : 'al firmar'} valor={op.cesion?.email} />
          <RenglonRelacion titulo="RUG" detalle={op.rug?.fechaInscripcion ? `${fechaHora(op.rug.fechaInscripcion)} · vigente al ${formatDate(op.rug.vigencia)}` : op.rug ? 'en cola' : 'pendiente'} valor={op.rug?.usuario ?? '—'} />
          <RenglonRelacion titulo="Evidencia" detalle={op.evidencia ? `${fechaHora(op.evidencia.fechaHora)} · ${op.evidencia.alcance.toLowerCase()}` : 'pendiente'} valor={op.evidencia?.usuario ?? '—'} />
          <RenglonRelacion titulo="Orden del 80%" detalle={oA ? `preparó ${oA.preparo.usuario.split(' ')[0]}${oA.autorizo ? ` · autorizó ${oA.autorizo.usuario.split(' ')[0]}` : ''}${oA.cep ? ` · CEP ${oA.cep.claveRastreo}` : ''}` : 'pendiente'} valor={oA?.estatus ?? '—'} />
          <RenglonRelacion titulo="Pago de la marca" detalle={pagada ? formatDate(pagada) : c ? `vence ${formatDate(c.vencimiento)}` : 'con el adelanto nace la factura por cobrar'} valor={pagada ? money(c!.importe) : '—'} />
          <RenglonRelacion titulo="Orden del 20%" detalle={oR ? `preparó ${oR.preparo.usuario.split(' ')[0]}${oR.autorizo ? ` · autorizó ${oR.autorizo.usuario.split(' ')[0]}` : ''}` : 'con el pago de la marca'} valor={oR?.estatus ?? '—'} />
          <RenglonRelacion titulo="Cierre" detalle={op.rug?.cierre ? `RUG ${op.rug.cierre.accion.toLowerCase()} · ${fechaHora(op.rug.cierre.fechaHora)}` : op.estatus === 'Liquidada' ? 'falta cancelar o actualizar el RUG' : '—'} valor={p?.pago ? money(p.pago.importe) : '—'} />
        </Relacion>
      </div>
    </Drawer>
  );
}
