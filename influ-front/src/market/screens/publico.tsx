import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Panel from '../../components/ui/Panel';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { money } from '../../lib/format';
import { useMarket } from '../useMarket';
import { FEE_INFLU, fee } from '../logic';
import { Fila, k, useNombreEmpresa } from '../ui';
import { Hilo } from './comun';
import { AltaMarca } from './marca';

// Pantallas sin cuenta: lo que la marca o un participante en copia abre desde un link.

function Marco({ titulo, sub, children }: { titulo: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-frost">
      <div className="h-14 bg-[#0b1530] px-4 md:px-10 flex items-center justify-between">
        <span className="text-white text-[20px] font-bold tracking-tight">influ<span className="text-[#38e0b4]">.</span></span>
        <Link to="/login" className="text-[12px] text-white/80 hover:text-white">Ingresar</Link>
      </div>
      <div className="px-4 md:px-10 py-8 max-w-[1200px] mx-auto flex flex-col gap-5">
        <div><div className="text-[22px] font-semibold text-carbon">{titulo}</div>{sub && <div className="text-[13px] text-ash">{sub}</div>}</div>
        {children}
      </div>
    </div>
  );
}

export function PropuestaPublica() {
  const { token } = useParams();
  const s = useMarket();
  const nombre = useNombreEmpresa();
  const p = s.propuestas.find((x) => x.token === token);
  const [quitar, setQuitar] = useState<string[]>([]);
  const [por, setPor] = useState('');
  const [copias, setCopias] = useState('');
  useEffect(() => { if (token) s.verPropuesta(token); }, [token]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!p || p.estado === 'Borrador') return <Marco titulo="Propuesta no disponible"><div className="text-[13px] text-ash">El link no existe o todavía no se envía.</div></Marco>;
  const lineas = p.lineas.filter((l) => !quitar.includes(l.creadorId));
  const tarifas = lineas.reduce((t, l) => t + l.tarifa, 0);
  const vmin = lineas.reduce((t, l) => t + l.vistasMin, 0);
  const vmax = lineas.reduce((t, l) => t + l.vistasMax, 0);
  return (
    <Marco titulo={p.titulo} sub={`Propuesta de Influ para ${nombre(p.empresaId)} · creadores con métricas históricas, audiencia y precio`}>
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,0.7fr)] gap-4 items-start">
        <Panel title="Creadores propuestos" subtitle="Quita los que no quieras: la propuesta se ajusta">
          <div className="border-t border-hairline divide-y divide-hairline">
            {p.lineas.map((l) => { const c = s.creadores.find((x) => x.id === l.creadorId)!; const fuera = quitar.includes(l.creadorId); return (
              <div key={l.creadorId} className={`px-5 py-3 flex items-center gap-3 flex-wrap ${fuera ? 'opacity-40' : ''}`}>
                <span className="flex-1 min-w-[200px]"><span className="block text-[14px] font-semibold text-carbon">{c.handle}</span><span className="text-[12px] text-ash">{c.temas.join(', ')} · {c.ciudad} · audiencia MX {c.audiencia.mx}% · ER {c.engagement.toFixed(1)}%</span></span>
                <span className="text-[12px] text-ash">{k(l.vistasMin)}–{k(l.vistasMax)} vistas · CPM {money(l.cpm)}</span>
                <span className="text-[14px] font-medium tabular-nums">{money(l.tarifa)}</span>
                {p.estado !== 'Aceptada' && <button onClick={() => setQuitar(fuera ? quitar.filter((x) => x !== l.creadorId) : [...quitar, l.creadorId])} className="text-[12px] text-blue-link">{fuera ? 'Volver a incluir' : 'Quitar'}</button>}
              </div>); })}
          </div>
        </Panel>
        <Panel title="Resumen">
          <div className="border-t border-hairline px-5 py-3">
            <Fila t="Tarifas" v={money(tarifas)} />
            <Fila t={`Fee Influ (${Math.round(FEE_INFLU * 100)}%)`} v={money(fee(tarifas))} />
            <Fila t="Total" v={money(tarifas + fee(tarifas))} fuerte />
            <Fila t="Vistas estimadas" v={`${k(vmin)}–${k(vmax)}`} />
            {p.estado === 'Aceptada'
              ? <div className="mt-3 text-[13px] text-success">Aceptada por {p.aceptada?.por}. Cada creador recibió su oferta en el chat.</div>
              : (
                <div className="flex flex-col gap-2 mt-3">
                  <Input label="Tu nombre" value={por} onChange={(e) => setPor(e.target.value)} placeholder="Nombre y área" />
                  <Input label="Suma a tu equipo en copia (correos separados por coma)" value={copias} onChange={(e) => setCopias(e.target.value)} placeholder="legal@empresa.com, finanzas@empresa.com" />
                  <Button onClick={() => s.aceptarPropuesta(token!, por, quitar, copias.split(',').map((x) => x.trim()).filter(Boolean))}>Aceptar propuesta</Button>
                  <span className="text-[11px] text-mist">Al aceptar, se convierte en ofertas dentro del chat de cada creador.</span>
                </div>
              )}
          </div>
        </Panel>
      </div>
    </Marco>
  );
}

export function HiloPublico() {
  const { token } = useParams();
  const s = useMarket();
  const c = s.conversaciones.find((x) => x.participantes.some((p) => p.token === token));
  const p = c?.participantes.find((x) => x.token === token);
  if (!c || !p) return <Marco titulo="Acceso no válido"><div className="text-[13px] text-ash">Pide a quien te sumó un nuevo acceso.</div></Marco>;
  const cr = s.creadores.find((x) => x.id === c.creadorId);
  const b = s.briefs.find((x) => x.id === c.briefId);
  return (
    <Marco titulo={`${cr?.handle} · ${b?.marca} ${b?.titulo}`} sub={`Acceso directo de ${p.nombre}${p.enCopia ? ' (en copia)' : ''}, sin cuenta · ${p.permisos.includes('Aprueba ofertas') ? 'puedes aceptar ofertas' : 'participas comentando'}`}>
      <Hilo convId={c.id} token={token} />
    </Marco>
  );
}

export function InvitacionPublica() {
  const { token } = useParams();
  const cuenta = useMarket((s) => s.cuentas.find((c) => c.invitada.token === token));
  const nombre = useNombreEmpresa();
  if (!cuenta) return <Marco titulo="Invitación no válida"><div className="text-[13px] text-ash">Pide una nueva invitación al equipo de Influ.</div></Marco>;
  return (
    <Marco titulo={`Bienvenida, ${cuenta.marcas[0] ?? nombre(cuenta.empresaId)}`}>
      <AltaMarca cuenta={cuenta} publico />
      {cuenta.estado === 'Activa' && <div className="text-[13px] text-success">Cuenta activa. Tu equipo entra con su usuario de Influ para publicar briefs.</div>}
    </Marco>
  );
}
