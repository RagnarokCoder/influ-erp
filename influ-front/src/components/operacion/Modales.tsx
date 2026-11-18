import { useState } from 'react';
import { FileText } from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import { useInflu } from '../../store/useInflu';
import { cxcDe, diasVencida, documentoUnico, empresaDe, montoAdelanto, montoBaseOp, porId, saldoCxC, vencimientoOp } from '../../lib/derive';
import { formatDate, money } from '../../lib/format';
import { COMISION_FIJA, INFLU, TASA_MENSUAL } from '../../data/constantes';
import type { Operacion } from '../../data/types';

export function ModalRechazo({ op, onClose }: { op: Operacion; onClose: () => void }) {
  const rechazar = useInflu((s) => s.rechazarSolicitud);
  const [motivo, setMotivo] = useState('');
  return (
    <Modal open title={`¿Rechazar ${op.folio}?`} subtitle="Quien pidió el adelanto ve el motivo en su panel. Queda en la bitácora con tu usuario."
      onClose={onClose}
      footer={<><Button variant="ghost" onClick={onClose}>Cancelar</Button><Button variant="danger" onClick={() => { if (rechazar(op.id, motivo)) onClose(); }}>Rechazar solicitud</Button></>}>
      <div className="flex flex-col gap-1.5">
        <label className="text-[12px] font-medium text-ash">Motivo *</label>
        <textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} rows={3} placeholder="Ej. El contrato ampara $59,000 y el CFDI $95,000."
          className="border border-hairline rounded-[8px] px-3 py-2 text-[14px] text-carbon focus:outline-none focus:border-blue focus:ring-2 focus:ring-blue/15" />
      </div>
    </Modal>
  );
}

/** Etapa 6 (cambio 23): Contrato de Factoraje — Persona Moral (Agencia) v1.0 como
 * documento único, con sus anexos A (copia de la factura), B (pagaré no
 * negociable) y C (acuerdo de uso de firma electrónica), en un solo sobre de
 * DocuSign. Se firma una sola vez. La instrucción irrevocable de pago va aparte. */
export function ModalFirma({ op, onClose }: { op: Operacion; onClose: () => void }) {
  const s = useInflu();
  const [leido, setLeido] = useState(false);
  const empresa = empresaDe(s, op.marcaId);
  const doc = documentoUnico(op, s);
  const indice = [
    ['Contrato de factoraje', `Declaraciones y cláusulas · págs. ${doc.partes[0].desde}–${doc.partes[0].hasta} · cesionario ${INFLU.razonSocial}`],
    ['Anexo A · Copia de la factura', `CFDI ${op.cfdi.serieFolio} · UUID ${op.cfdi.uuid} · ${money(op.monto)} · ${empresa?.razonSocial}`],
    ['Anexo B · Pagaré no negociable', `${money(montoAdelanto(op))} · vence ${formatDate(vencimientoOp(op))}`],
    ['Anexo C · Acuerdo de uso de firma electrónica', 'DocuSign'],
  ];
  return (
    <Modal open wide title="Firmar con DocuSign" subtitle={`Documento único · ${doc.paginas} págs. · ${porId(s.marcas, op.marcaId)?.nombre} · ${money(op.monto)}`} onClose={onClose}
      footer={<><Button variant="ghost" onClick={onClose}>Cancelar</Button><Button disabled={!leido} onClick={() => { if (s.firmarDocumento(op.id)) onClose(); }}>Firmar con DocuSign</Button></>}>
      <div className="flex flex-col gap-2">
        {indice.map(([t, d]) => (
          <div key={t} className="flex items-center gap-3 border border-hairline rounded-[8px] px-3 py-2.5">
            <FileText size={15} className="text-ash shrink-0" strokeWidth={1.6} />
            <span className="flex-1 min-w-0">
              <span className="block text-[13px] text-carbon font-medium">{t}</span>
              <span className="block text-[11.5px] text-ash break-words">{d}</span>
            </span>
          </div>
        ))}
        <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-[12.5px] border border-hairline rounded-[8px] px-3 py-2.5 mt-1">
          <span className="text-ash">Monto base</span><span className="text-right tabular-nums">{money(montoBaseOp(op))}</span>
          <span className="text-ash">Adelanto (80%)</span><span className="text-right tabular-nums font-semibold">{money(montoAdelanto(op))}</span>
          <span className="text-ash">Comisiones</span><span className="text-right">{COMISION_FIJA * 100}% fijo + {TASA_MENSUAL * 100}% mensual</span>
        </div>
        <label className="flex items-start gap-2.5 border border-hairline rounded-[8px] px-3 py-2.5 mt-1 cursor-pointer hover:bg-frost">
          <input type="checkbox" className="accent-blue mt-0.5" checked={leido} onChange={(e) => setLeido(e.target.checked)} />
          <span className="text-[12.5px] text-carbon">Leí el documento completo, con sus anexos A, B y C.</span>
        </label>
        <div className="text-[12px] text-ash mt-1">Se firma una sola vez: el contrato con todos sus anexos en un solo sobre de DocuSign, sin archivos sueltos ni .zip. Al completar la firma, la instrucción irrevocable de pago sale sola para firmarse en el paso Aceptación de marca y la inscripción del RUG queda en cola.</div>
      </div>
    </Modal>
  );
}

/** Etapa 12: la marca paga la factura completa a Influ; registro y conciliación. */
export function ModalPagoMarca({ op, onClose }: { op: Operacion; onClose: () => void }) {
  const s = useInflu();
  const c = cxcDe(op.id, s.cxc);
  const saldo = c ? saldoCxC(c) : 0;
  const [monto, setMonto] = useState(saldo);
  const [ref, setRef] = useState(`SPEI ${op.folio}`);
  const [cuentaId, setCuentaId] = useState('CTA-01');
  if (!c) return null;
  const marca = porId(s.marcas, op.marcaId)?.nombre;
  const dias = diasVencida(c);
  return (
    <Modal open title={`Pago de ${marca} · ${op.folio}`} subtitle="La marca paga la factura completa a Influ. Se concilia con la referencia de la carta de cesión."
      onClose={onClose}
      footer={<><Button variant="ghost" onClick={onClose}>Cancelar</Button><Button onClick={() => { if (s.registrarCobro(c.id, monto, ref, cuentaId)) onClose(); }}>{monto < saldo - 0.01 ? 'Registrar abono parcial' : 'Registrar pago completo'}</Button></>}>
      <div className="flex flex-col gap-4">
        <div className="border border-hairline rounded-[8px] divide-y divide-hairline text-[13px]">
          {[
            ['Factura', `${c.documento} · ${money(c.importe)}`],
            ['Vencimiento', `${formatDate(c.vencimiento)}${dias > 0 ? ` · ${dias} días vencida` : dias === 0 ? ' · vence hoy' : ` · en ${-dias} días`}`],
            ['Ya pagado', money(c.importe - saldo)],
            ['Por cobrar', money(saldo)],
          ].map(([t, v]) => (
            <div key={t} className="flex justify-between gap-3 px-3 py-2">
              <span className="text-ash">{t}</span>
              <span className={`text-right tabular-nums ${t === 'Vencimiento' && dias > 0 ? 'text-danger' : 'text-carbon'}`}>{v}</span>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Importe recibido" type="number" value={monto} onChange={(e) => setMonto(Number(e.target.value))} />
          <Input label="Referencia" placeholder="SPEI, depósito" value={ref} onChange={(e) => setRef(e.target.value)} />
        </div>
        <Select label="Cuenta donde entró" value={cuentaId} onChange={(e) => setCuentaId(e.target.value)}>
          <option value="">Selecciona…</option>
          {s.cuentas.map((x) => <option key={x.id} value={x.id}>{`${x.banco} ${x.cuenta} · ${money(x.saldo)}`}</option>)}
        </Select>
        <div className="text-[12px] text-ash">Al registrarlo enviamos el aviso de pago recibido a {op.contactoPagos.email}. Con la factura pagada, el remanente queda listo para orden de pago.</div>
      </div>
    </Modal>
  );
}
