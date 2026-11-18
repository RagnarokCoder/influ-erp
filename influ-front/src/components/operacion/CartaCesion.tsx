import { CheckCircle2, Circle, Clock } from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { useInflu } from '../../store/useInflu';
import { empresaDe, factorado } from '../../lib/derive';
import { fechaHora, formatDate, money, montoEnLetra } from '../../lib/format';
import { HORAS_ACUSE, INFLU } from '../../data/constantes';
import type { Operacion } from '../../data/types';

/**
 * Instrucción irrevocable de pago (formato v1.0), como la firma la agencia y la
 * recibe el área de pagos de la marca. Documento aparte del contrato de
 * factoraje (cambio 1). Si `onFirmar` llega y aún no está firmada, se muestra el
 * botón para firmarla con DocuSign.
 */
export default function CartaCesion({ op, onClose, onFirmar }: { op: Operacion; onClose: () => void; onFirmar?: () => void }) {
  const s = useInflu();
  const empresa = empresaDe(s, op.marcaId);
  const fac = factorado(op, s);
  const c = op.cesion;
  const esAgencia = op.solicitante === 'Agencia';
  const lugarFecha = `Ciudad de México, a ${formatDate(c?.enviada?.slice(0, 10) ?? op.cfdi.fechaEmision, { day: 'numeric', month: 'long', year: 'numeric' })}`;
  const amarillo = 'bg-warning-wash/60 rounded-[3px] px-0.5';
  const pendiente = !c?.firmada;

  const estado: { icon: typeof CheckCircle2; tono: string; t: string; d?: string }[] = [
    c?.firmada
      ? { icon: CheckCircle2, tono: 'text-success', t: 'Firmada por la agencia', d: `${c.firmada.firmo} · ${fechaHora(c.firmada.fechaHora)}` }
      : { icon: Circle, tono: 'text-mist', t: 'Falta la firma de la agencia', d: `La firma ${esAgencia ? fac.razonSocial : fac.firmante} en el paso Aceptación de marca` },
    c?.enviada
      ? { icon: CheckCircle2, tono: 'text-success', t: `Enviada a ${c.email}`, d: `CC: agencia e Influ · ${fechaHora(c.enviada)}` }
      : { icon: Circle, tono: 'text-mist', t: 'Por enviar al área de pagos', d: 'sale sola al firmarla' },
    c?.acuse
      ? { icon: CheckCircle2, tono: 'text-success', t: 'Confirmación de la marca', d: `${c.acuseVia} · ${fechaHora(c.acuse)}` }
      : { icon: Clock, tono: 'text-warning', t: 'Esperando confirmación de la marca', d: `plazo de 2 días hábiles (${HORAS_ACUSE} h)` },
  ];

  return (
    <Modal open wide title={`Instrucción irrevocable de pago · ${op.folio}`}
      subtitle={`Para: área de pagos de ${empresa?.razonSocial ?? 'la marca'}  ·  CC: agencia, Influ`}
      onClose={onClose}
      footer={<Button variant="ghost" onClick={onClose}>Cerrar</Button>}>
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_280px] gap-5 items-start">
        {/* La carta */}
        <div className="border border-hairline rounded-[8px] px-6 py-6 text-[12.5px] text-carbon leading-relaxed flex flex-col gap-3 bg-white">
          <div className="text-center font-semibold tracking-wide text-[13.5px] mb-1">INSTRUCCIÓN IRREVOCABLE DE PAGO</div>
          <div className="text-right text-ash">{lugarFecha}</div>
          <div>
            <div className="font-semibold">{empresa?.razonSocial}</div>
            <div className="text-smoke">Domicilio fiscal registrado ante el SAT</div>
            <div className="text-smoke">Atn.: <span className={amarillo}>{op.contactoPagos.nombre}</span> · Área de pagos</div>
          </div>
          <div className="font-semibold">Ref.: Instrucción irrevocable de pago de la Factura</div>
          <p>Estimados señores:</p>
          <p>
            Por medio de la presente, <b className={amarillo}>{fac.razonSocial}</b> {esAgencia ? '(la "Agencia")' : '(el "Factorado")'}, en su carácter de Factorado conforme al Contrato de Factoraje celebrado con <b>{INFLU.razonSocial.toUpperCase()}</b> ("Influ"), hace de su conocimiento que ha transmitido a Influ, a título de factoraje, el derecho de crédito derivado de la factura (CFDI) con folio fiscal/UUID <span className={`font-mono text-[11px] ${amarillo}`}>{op.cfdi.uuid}</span>, de fecha <span className={amarillo}>{formatDate(op.cfdi.fechaEmision)}</span>, por un importe de <b className={amarillo}>{money(op.monto)}</b> (<span className={amarillo}>{montoEnLetra(op.monto)}</span>), más el Impuesto al Valor Agregado (la "Factura").
          </p>
          <p>
            En virtud de lo anterior, les instruimos de manera irrevocable que el pago total de la Factura sea realizado única y exclusivamente mediante transferencia electrónica a la siguiente cuenta designada por Influ:
          </p>
          <div className="pl-4 flex flex-col gap-0.5">
            <div>Beneficiario: <b>{INFLU.razonSocial}</b></div>
            <div>Banco: <b className={amarillo}>{INFLU.banco}</b></div>
            <div>Número de cuenta: <span className={`font-mono ${amarillo}`}>{INFLU.cuenta}</span></div>
            <div>CLABE interbancaria: <span className={`font-mono ${amarillo}`}>{INFLU.clabe}</span></div>
          </div>
          <p>Les agradeceremos confirmar, a través del enlace proporcionado, la recepción de la presente instrucción irrevocable dentro de los 2 (dos) Días Hábiles siguientes.</p>
          <p>El pago que realicen en cualquier cuenta distinta a la designada por Influ conforme a esta instrucción irrevocable de pago no extinguirá ni liberará su obligación de pago frente a Influ.</p>
          <p>Atentamente,</p>
          <div className="mt-3">
            <div className="border-t border-carbon w-56 mb-1" />
            {pendiente && <div className="text-[11px] text-mist italic mb-0.5">Firma pendiente</div>}
            <div className={`font-semibold ${pendiente ? '' : amarillo}`}>{fac.razonSocial}</div>
            <div className="text-smoke">Por: <span className={pendiente ? '' : amarillo}>{c?.firmada?.firmo ?? fac.firmante}</span>{c?.firmada ? ` · firmado en DocuSign ${fechaHora(c.firmada.fechaHora)}` : ''}</div>
          </div>
        </div>

        {/* Estado y datos */}
        <div className="flex flex-col gap-4">
          <div className="border border-hairline rounded-[8px] px-4 py-3">
            <div className="text-[11px] uppercase tracking-wide text-mist font-medium mb-2.5">Estado</div>
            <div className="flex flex-col gap-3">
              {estado.map((e) => (
                <div key={e.t} className="flex gap-2.5">
                  <e.icon size={15} className={`${e.tono} shrink-0 mt-0.5`} strokeWidth={1.8} />
                  <div className="min-w-0">
                    <div className="text-[12.5px] text-carbon font-medium">{e.t}</div>
                    {e.d && <div className="text-[11px] text-ash">{e.d}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="border-l-2 border-warning bg-warning-wash rounded-r-[8px] px-3 py-2.5 text-[11.5px] text-warning">
            El adelanto no se libera sin la confirmación de la marca (cláusula quinta del contrato).
          </div>
          {onFirmar && pendiente && (
            <Button onClick={() => { onFirmar(); onClose(); }}>Firmar instrucción con DocuSign</Button>
          )}
          <div className="text-[11px] text-mist">El amarillo marca los datos que el sistema llena solo con la operación. En el PDF final van sin marca.</div>
        </div>
      </div>
    </Modal>
  );
}
