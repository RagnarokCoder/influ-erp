import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FileSearch } from 'lucide-react';
import Panel from '../components/ui/Panel';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import EmptyState from '../components/ui/EmptyState';
import { Check, Fila } from '../components/ui/Fila';
import Ficha from '../components/operacion/Ficha';
import Semaforo from '../components/operacion/Semaforo';
import { ModalRechazo } from '../components/operacion/Modales';
import { useInflu, useVista, rolActual } from '../store/useInflu';
import { autoriza } from '../lib/permisos';
import {
  avisosRevision, bloqueosRevision, contratoCoincide, contratoGenerado, corto, documentoUnico, horasDesde, iniciales, porId, semaforoDe, textoEntregable,
} from '../lib/derive';
import { ahora, estadoTone, fechaHora, formatDate, money } from '../lib/format';
import { HORAS_REVISION, QUORUM_APROBACION } from '../data/constantes';

// Pantalla 17: ficha de la IA con cita a cláusula y página, consulta previa
// del RUG y aprobación colectiva sin umbral por monto.
export const Revision = () => {
  const [params, setParams] = useSearchParams();
  const v = useVista();
  const s = useInflu();
  const rol = rolActual(s);
  const cola = v.operaciones.filter((o) => ['En revisión', 'Observada'].includes(o.estatus)).sort((a, b) => a.capturada.localeCompare(b.capturada));
  const op = v.operaciones.find((o) => o.id === params.get('id')) ?? cola[0];
  const [verifico, setVerifico] = useState(false);
  const [base, setBase] = useState<number | null>(null);
  const [observar, setObservar] = useState(false);
  const [nota, setNota] = useState('');
  const [rechazar, setRechazar] = useState(false);

  if (!op) return <div className="px-4 md:px-10 py-8"><EmptyState icon={FileSearch} title="Sin solicitudes por revisar" message="Aquí llegan las solicitudes con el CFDI validado y la ficha del contrato." /></div>;

  const tal = porId(v.talentos, op.talentoId);
  const ag = porId(v.agencias, op.agenciaId);
  const marca = porId(v.marcas, op.marcaId);
  const yo = s.usuarios.find((u) => u.id === s.usuarioId)?.nombre ?? '';
  const yaVoto = op.votos.some((x) => x.usuario === yo);
  const bloqueos = bloqueosRevision(op);
  const avisos = avisosRevision(op);
  const puede = autoriza.revision(rol) && op.estatus === 'En revisión';
  const montoBase = base ?? op.montoBase ?? op.analisis.montoBaseSugerido;
  const lista = op.analisis.estado === 'Lista';
  const cambiar = (id: string) => { setParams({ id }); setBase(null); setVerifico(false); setObservar(false); };

  return (
    <div className="px-4 md:px-10 py-6 md:py-8 max-w-[1600px] mx-auto grid grid-cols-1 xl:grid-cols-[240px_minmax(0,1fr)] gap-4 items-start">
      <Panel title="Por revisar" subtitle={`${cola.length} en orden de llegada`}>
        <div className="border-t border-hairline divide-y divide-hairline max-h-[640px] overflow-y-auto">
          {cola.map((o) => {
            const lenta = horasDesde(o.capturada, ahora().fechaHora) > HORAS_REVISION;
            return (
              <button key={o.id} onClick={() => cambiar(o.id)} className={`w-full text-left px-4 py-2.5 ${o.id === op.id ? 'bg-ice' : 'hover:bg-frost'}`}>
                <div className="flex items-center justify-between gap-2"><span className="font-mono text-[12px] text-blue-link">#{o.folio.slice(-4)}</span><Semaforo valor={semaforoDe(o)} compacto /></div>
                <div className="text-[12.5px] text-carbon truncate">{corto(porId(v.talentos, o.talentoId)?.nombre ?? '')} · {porId(v.marcas, o.marcaId)?.nombre}</div>
                <div className={`text-[11px] ${lenta ? 'text-danger' : 'text-mist'}`}>{money(o.monto)} · {o.votos.length}/{QUORUM_APROBACION} votos{o.estatus === 'Observada' ? ' · observada' : ''}</div>
              </button>
            );
          })}
          {cola.length === 0 && <div className="px-4 py-6 text-[12px] text-mist text-center">Nada por revisar.</div>}
        </div>
      </Panel>

      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <div className="text-[22px] font-semibold text-carbon">Revisión · #{op.folio.slice(-4)}</div>
            <div className="text-[13px] text-ash">{corto(tal?.nombre ?? '')} · {ag?.nombre ?? 'Independiente'} · {marca?.nombre} · {money(op.monto)} · {op.entregables.map(textoEntregable).join(' + ')}</div>
          </div>
          <Badge tone={estadoTone(op.estatus)}>{op.estatus}</Badge>
        </div>

        {op.estatus === 'Observada' && op.observacion && (
          <div className="border border-danger/30 bg-danger-wash rounded-[8px] px-4 py-3 text-[13px] text-danger">
            Observada por {op.observacion.usuario} · {fechaHora(op.observacion.fechaHora)}: {op.observacion.nota} Espera la respuesta de quien pidió el adelanto.
          </div>
        )}

        <div className="grid grid-cols-1 2xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] gap-4 items-start">
          <Ficha op={op} />
          <div className="flex flex-col gap-4">
            <Panel title="Chequeos">
              <div className="border-t border-hairline px-5 py-3">
                <Check ok={op.validacion.uuidVigente && op.validacion.lista69b} texto={`CFDI validado · UUID vigente`} detalle={`${op.validacion.pac} · ${fechaHora(op.validacion.fechaHora)}`} />
                <Check ok={contratoCoincide(op)} aviso={!lista} texto={lista ? (contratoCoincide(op) ? 'Contrato coincide con el CFDI' : 'El contrato no coincide con el CFDI') : 'La IA está leyendo el contrato'} />
                <Check ok={op.rug?.estado === 'Inscrita'} aviso={op.rug?.estado !== 'Inscrita'}
                  texto={op.rug?.estado === 'Inscrita' ? 'RUG inscripto: Sí' : 'RUG inscripto: No'}
                  detalle={op.rug?.estado === 'Inscrita' ? (op.rug.folio ? `folio ${op.rug.folio}` : undefined) : 'la inscripción la hace el equipo interno desde la sección RUG'} />
                {op.consentimientoMarca && <Check ok texto="Consentimiento escrito de la marca para ceder el cobro" detalle={op.consentimientoMarca} />}
                <div className="mt-2 border-t border-hairline pt-2">
                  <Fila t="Monto base sugerido" v={money(op.analisis.montoBaseSugerido)} fuerte nota={op.analisis.montoBaseSugerido < op.monto ? `CFDI ${money(op.monto)} − porción condicionada o pena máxima` : undefined} />
                  {puede && lista && (
                    <div className="pt-2 max-w-[220px]"><Input label="Monto base aprobado" type="number" value={montoBase} onChange={(e) => setBase(Number(e.target.value))} /></div>
                  )}
                </div>
              </div>
            </Panel>

            <Panel title="Contratos" subtitle="Documento único: contrato de factoraje con anexos A, B y C">
              <div className="border-t border-hairline px-5 py-4 text-[13px]">
                {contratoGenerado(op) ? (() => {
                  const doc = documentoUnico(op, v);
                  return (
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-carbon">{doc.archivo}</span>
                        <Badge tone={doc.firmado ? 'success' : 'warning'}>{doc.firmado ? 'Firmado' : 'Por firmar'}</Badge>
                      </div>
                      {doc.partes.map((p) => <Check key={p.clave} ok={doc.firmado} aviso={!doc.firmado} texto={p.etiqueta} detalle={doc.firmado ? `firmado · pág. ${p.firmaPagina}` : `pág. ${p.desde}`} />)}
                      <div className="text-[11.5px] text-mist mt-1">Si falta una firma en cualquiera de las cuatro partes, el contrato queda "Firma incompleta" y la operación no pasa al RUG.</div>
                    </div>
                  );
                })() : (
                  <div className="text-ash">El documento único se genera al aprobar la factura y el contrato: un solo PDF con el contrato de factoraje, el Anexo A (copia de la factura CFDI {op.cfdi.serieFolio}), el Anexo B (pagaré no negociable) y el Anexo C (acuerdo de uso de firma electrónica). Se firma una sola vez en DocuSign.</div>
                )}
              </div>
            </Panel>

            <Panel title="Aprobación colectiva" subtitle="Sin umbral por monto: cada solicitud la aprueba el equipo en conjunto.">
              <div className="border-t border-hairline px-5 py-4 flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  {op.votos.map((x) => <span key={x.usuario} title={`${x.usuario} · ${fechaHora(x.fechaHora)}`} className="w-11 h-11 rounded-full bg-ice flex items-center justify-center text-[13px] font-semibold text-carbon">{iniciales(x.usuario)[0]}</span>)}
                  {Array.from({ length: Math.max(0, QUORUM_APROBACION - op.votos.length) }).map((_, i) => <span key={i} className="w-11 h-11 rounded-full border-2 border-dashed border-pebble" />)}
                </div>
                <div className="text-[13px] text-ash">{op.votos.length} {op.votos.length === 1 ? 'voto' : 'votos'} a favor · se necesitan {QUORUM_APROBACION} de integrantes distintos</div>
                {bloqueos.length > 0 && <div className="border border-danger/30 bg-danger-wash rounded-[8px] px-3 py-2 text-[12px] text-danger">{bloqueos.join(' ')} Obsérvala para pedir el documento o recházala.</div>}
                {!bloqueos.length && avisos.length > 0 && puede && (
                  <label className="flex items-start gap-2 border border-warning/40 bg-warning-wash rounded-[8px] px-3 py-2 text-[12px] text-warning cursor-pointer">
                    <input type="checkbox" className="accent-blue mt-0.5" checked={verifico} onChange={(e) => setVerifico(e.target.checked)} />
                    <span>Revisé las alertas: {avisos.join(' ')} La confirmación queda en la bitácora con mi usuario.</span>
                  </label>
                )}
                {observar && <textarea value={nota} onChange={(e) => setNota(e.target.value)} rows={3} placeholder="Qué tiene que corregir o subir quien pidió el adelanto…" className="border border-hairline rounded-[8px] px-3 py-2 text-[13px]" />}
                {puede && (
                  <div className="flex gap-2 flex-wrap">
                    {observar ? (
                      <>
                        <Button variant="outlined" onClick={() => { if (s.observarSolicitud(op.id, nota)) { setObservar(false); setNota(''); } }}>Enviar observación</Button>
                        <Button variant="ghost" onClick={() => setObservar(false)}>Cancelar</Button>
                      </>
                    ) : (
                      <>
                        <Button disabled={!lista || bloqueos.length > 0 || (avisos.length > 0 && !verifico) || yaVoto} onClick={() => s.votarAprobacion(op.id, verifico, montoBase)}>
                          {yaVoto ? 'Ya votaste' : `Aprobar · voto ${op.votos.length + 1} de ${QUORUM_APROBACION}`}
                        </Button>
                        <Button variant="ghost" disabled={!lista} onClick={() => setObservar(true)}>Observar</Button>
                        <Button variant="danger" onClick={() => setRechazar(true)}>Rechazar</Button>
                      </>
                    )}
                  </div>
                )}
                {!autoriza.revision(rol) && <div className="text-[12px] text-mist">La aprueba el equipo interno.</div>}
              </div>
            </Panel>

            <Panel title="CFDI estructurado" subtitle={`${op.cfdi.archivoXml} · ${op.cfdi.archivoPdf}`}>
              <div className="border-t border-hairline px-5 py-1">
                <Fila t="Emisor" v={op.cfdi.emisor.rfc} nota={`${op.cfdi.emisor.nombre} · ${op.cfdi.emisor.regimen}`} />
                <Fila t="Receptor" v={op.cfdi.receptor.rfc} nota={`${op.cfdi.receptor.nombre} · ${op.cfdi.receptor.usoCfdi}`} />
                {op.cfdi.conceptos.map((c) => <Fila key={c.descripcion} t={c.descripcion} v={money(c.importe)} />)}
                <Fila t="Subtotal + IVA" v={`${money(op.cfdi.subtotal)} + ${money(op.cfdi.iva)}`} />
                <Fila t="Total" v={money(op.cfdi.total)} fuerte />
                <Fila t="Método · forma de pago" v={`${op.cfdi.metodoPago} · ${op.cfdi.formaPago}`} />
                <Fila t="Emisión · timbrado" v={`${formatDate(op.cfdi.fechaEmision)} · ${fechaHora(op.cfdi.fechaTimbrado)}`} />
                <Fila t="UUID" v={<span className="font-mono text-[11px]">{op.cfdi.uuid}</span>} />
              </div>
            </Panel>
          </div>
        </div>
      </div>
      {rechazar && <ModalRechazo op={op} onClose={() => setRechazar(false)} />}
    </div>
  );
};
