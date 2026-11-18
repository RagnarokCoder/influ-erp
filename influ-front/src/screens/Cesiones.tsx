import { useState } from 'react';
import { MailCheck, MailWarning, Clock, Send } from 'lucide-react';
import Panel from '../components/ui/Panel';
import KpiCard from '../components/ui/KpiCard';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import EmptyState from '../components/ui/EmptyState';
import CartaCesion from '../components/operacion/CartaCesion';
import { useInflu, useVista, rolActual } from '../store/useInflu';
import { autoriza } from '../lib/permisos';
import { estadoCesion, horasDesde, porId } from '../lib/derive';
import { ahora, fechaHora } from '../lib/format';
import { HORAS_ACUSE } from '../data/constantes';
import type { Operacion } from '../data/types';

// Pantalla 19 (nueva): envío, apertura y confirmación de la instrucción de pago
// al área de pagos de la marca. Sin confirmar en 2 días hábiles, reenvío
// automático y alerta. El adelanto no se libera sin la confirmación de la marca (§6).
export const Cesiones = () => {
  const v = useVista();
  const s = useInflu();
  const rol = rolActual(s);
  const fh = ahora().fechaHora;
  const [carta, setCarta] = useState<Operacion | null>(null);
  const filas = v.operaciones.filter((o) => o.cesion || o.estatus === 'Por firmar')
    .sort((a, b) => (b.cesion?.enviada ?? '9999').localeCompare(a.cesion?.enviada ?? '9999'));
  const conCesion = v.operaciones.filter((o) => o.cesion);
  const sinAcuse = conCesion.filter((o) => estadoCesion(o, fh) === 'Sin acuse');
  const en48 = conCesion.filter((o) => o.cesion!.acuse && horasDesde(o.cesion!.enviada, o.cesion!.acuse) <= HORAS_ACUSE);
  const conAcuse = conCesion.filter((o) => o.cesion!.acuse);

  const badge = (o: Operacion) => {
    const e = estadoCesion(o, fh);
    if (e === 'Con acuse') return <Badge tone="success">{fechaHora(o.cesion!.acuse).replace(' · ', ' ')}</Badge>;
    if (e === 'Sin acuse') return <Badge tone="danger">Sin confirmar</Badge>;
    if (e === 'Al firmar') return <Badge tone="neutral">Pendiente</Badge>;
    return <Badge tone="warning">{e === 'Abierta' ? 'Abierta, sin confirmar' : 'Esperando confirmación'}</Badge>;
  };

  return (
    <div className="px-4 md:px-10 py-6 md:py-8 max-w-[1600px] mx-auto flex flex-col gap-6">
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard label="Instrucciones enviadas" value={String(conCesion.length)} note="firmadas por la agencia en Aceptación de marca" icon={Send} />
        <KpiCard label="Confirmadas" value={String(conAcuse.length)} note={`${en48.length} confirmadas en ${HORAS_ACUSE} h`} icon={MailCheck} />
        <KpiCard label="Sin confirmar en 2 días hábiles" value={String(sinAcuse.length)} note={sinAcuse.map((o) => o.folio).join(', ') || 'ninguna'} icon={MailWarning} />
        <KpiCard label="% confirmadas en 2 días hábiles" value={conCesion.length ? `${Math.round((en48.length / conCesion.length) * 100)}%` : '—'} note="criterio de éxito del piloto" icon={Clock} />
      </div>

      <Panel title="Instrucciones de pago" subtitle="Envíos al área de pagos de las marcas">
        {filas.length === 0 ? <EmptyState icon={MailCheck} title="Sin instrucciones" message="La agencia firma la instrucción irrevocable de pago en el paso Aceptación de marca; aquí se ve el envío y la confirmación." /> : (
          <div className="border-t border-hairline overflow-x-auto">
            <table className="w-full">
              <thead><tr className="border-b border-hairline">{['Op.', 'Marca · área de pagos', 'Copia a', 'Enviada', 'Abierta', 'Confirmación', 'Reenvíos', ''].map((h, i) => <th key={h || i} className="px-4 py-2.5 text-left text-[10px] uppercase tracking-wide text-mist font-medium whitespace-nowrap">{h}</th>)}</tr></thead>
              <tbody>
                {filas.map((o) => {
                  const e = estadoCesion(o, fh);
                  return (
                    <tr key={o.id} className="border-b border-hairline last:border-0">
                      <td className="px-4 py-2.5 font-mono text-[12px] text-blue-link">#{o.folio.slice(-4)}</td>
                      <td className="px-4 py-2.5 text-[13px] whitespace-nowrap">{porId(v.marcas, o.marcaId)?.nombre} · {o.cesion?.email ?? o.contactoPagos.email}</td>
                      <td className="px-4 py-2.5 text-[12.5px] text-ash whitespace-nowrap">{o.agenciaId ? 'Agencia · Influ' : 'Influ'}</td>
                      <td className="px-4 py-2.5 text-[12.5px] whitespace-nowrap">{o.cesion ? fechaHora(o.cesion.enviada) : 'Al firmar'}</td>
                      <td className="px-4 py-2.5 text-[12.5px] whitespace-nowrap">{o.cesion?.abierta ? fechaHora(o.cesion.abierta) : '—'}</td>
                      <td className="px-4 py-2.5 whitespace-nowrap">{badge(o)}</td>
                      <td className="px-4 py-2.5 text-[12px] text-ash whitespace-nowrap">{o.cesion?.reenvios.length ? o.cesion.reenvios.map((r) => `${fechaHora(r.fechaHora)}${r.automatico ? ' (auto)' : ''}`).join(', ') : '—'}</td>
                      <td className="px-4 py-2.5 text-right whitespace-nowrap">
                        {o.cesion && (
                          <div className="flex gap-1.5 justify-end">
                            <Button size="sm" variant="ghost" onClick={() => setCarta(o)}>Ver carta</Button>
                            {!o.cesion.acuse && <Button size="sm" variant="outlined" disabled={!autoriza.cesion(rol)} onClick={() => s.reenviarCesion(o.id)}>Reenviar</Button>}
                            {!o.cesion.acuse && !o.cesion.abierta && <Button size="sm" variant="ghost" onClick={() => s.registrarAperturaCesion(o.id)} title="La marca no tiene panel: simula que abrió el correo">Simular apertura</Button>}
                            {!o.cesion.acuse && <Button size="sm" variant="ghost" onClick={() => s.registrarAcuseCesion(o.id, e === 'Sin acuse' ? 'Respuesta de la marca' : 'Botón "Confirmo recepción"')} title="La marca no tiene panel: simula su confirmación">Simular confirmación</Button>}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <div className="mx-5 my-4 border-l-2 border-warning bg-warning-wash rounded-r-[8px] px-4 py-2.5 text-[13px] text-warning">
          Sin confirmar en 2 días hábiles: reenvío automático y alerta al equipo. El adelanto no se libera sin la confirmación de la marca.
        </div>
        <div className="px-5 pb-4 text-[11.5px] text-mist">La marca no tiene panel: recibe la instrucción irrevocable de pago (formato v1.0, firmada por la agencia) en el email de su área de pagos y la confirma con el enlace "Confirmo recepción". Carta, firma, envío y confirmación se conservan como prueba de la instrucción de pago.</div>
      </Panel>
      {carta && <CartaCesion op={carta} onClose={() => setCarta(null)} />}
    </div>
  );
};
