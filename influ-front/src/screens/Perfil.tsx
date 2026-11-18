import { useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock, XCircle } from 'lucide-react';
import Panel from '../components/ui/Panel';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Badge from '../components/ui/Badge';
import { Fila } from '../components/ui/Fila';
import { CamposCreador, CamposPersonales } from './Registro';
import { useInflu, usuarioActual, type BorradorTalento } from '../store/useInflu';
import { porId, seguidores } from '../lib/derive';
import { estadoTone, formatDate } from '../lib/format';
import type { Agencia, AvisoPago, Resolucion, Talento } from '../data/types';

/** Estado de la cuenta frente a la aprobación de Influ (MVP Fase 1 §2). */
export function EstadoCuentaAviso({ cuenta, resoluciones, extra }: { cuenta: Talento['cuenta']; resoluciones: Resolucion[]; extra?: string }) {
  const ultima = [...resoluciones].reverse().find((r) => r.decision !== 'Reenviada');
  if (cuenta === 'Preaprobada' && !extra) return null;
  const tono = cuenta === 'Rechazada' ? 'danger' : cuenta === 'Preaprobada' ? 'blue' : 'warning';
  const Icono = cuenta === 'Rechazada' ? XCircle : cuenta === 'Observada' ? AlertTriangle : cuenta === 'Preaprobada' ? CheckCircle2 : Clock;
  const texto = cuenta === 'En revisión' ? 'Tu cuenta está en revisión: el equipo de Influ la aprueba antes de tu primer adelanto. Mientras tanto puedes completar tu perfil.'
    : cuenta === 'Observada' ? `El equipo de Influ pidió corregir tu cuenta: ${ultima?.nota ?? ''} Corrige en Perfil y reenvíala.`
      : cuenta === 'Rechazada' ? `Tu cuenta fue rechazada${ultima?.nota ? `: ${ultima.nota}` : '.'}` : '';
  return (
    <div className={`border rounded-[8px] px-4 py-3 text-[13px] flex gap-2 ${tono === 'danger' ? 'border-danger/30 bg-danger-wash text-danger' : tono === 'blue' ? 'border-blue/30 bg-ice text-blue-link' : 'border-warning/40 bg-warning-wash text-warning'}`}>
      <Icono size={16} className="shrink-0 mt-0.5" /> <span>{[texto, extra].filter(Boolean).join(' ')}</span>
    </div>
  );
}

export const Perfil = () => {
  const s = useInflu();
  const u = usuarioActual(s)!;
  if (u.rol === 'Agencia') {
    const ag = porId(s.agencias, u.agenciaId);
    return ag ? <ConfigAgencia ag={ag} /> : null;
  }
  const t = porId(s.talentos, u.talentoId);
  if (!t) return <div className="px-10 py-8 text-[13px] text-ash">Este perfil es del talento: entra como talento para verlo.</div>;
  return <PerfilTalento t={t} />;
};

const desdeTalento = (t: Talento): BorradorTalento => ({
  nombre: t.nombre, correo: t.correo, nacionalidad: t.nacionalidad ?? 'Mexicana', rfc: t.rfc, curp: t.curp, regimenFiscal: t.regimenFiscal, genero: t.genero, foto: t.foto, lada: t.lada,
  telefono: t.telefono, clabe: t.clabe, handles: t.handles.map((h) => ({ red: h.red, usuario: h.usuario })), nichos: t.nichos, nichoOtro: t.nichoOtro ?? '',
  tiposContenido: t.tiposContenido, contenidoOtro: t.contenidoOtro ?? '', ubicacion: t.ubicacion, agenciaId: t.agenciaId, condiciones: true, privacidad: true,
});

function PerfilTalento({ t }: { t: Talento }) {
  const s = useInflu();
  const [b, setB] = useState<BorradorTalento>(() => desdeTalento(t));
  const set = (x: Partial<BorradorTalento>) => setB((o) => ({ ...o, ...x }));
  const ag = porId(s.agencias, t.agenciaId);
  const { correo: _c, agenciaId: _a, condiciones: _k, privacidad: _p, ...cambios } = b;

  return (
    <div className="px-4 md:px-10 py-6 md:py-8 max-w-[1200px] mx-auto flex flex-col gap-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="text-[21px] font-semibold text-carbon">{t.nombre}</div>
          <div className="text-[13px] text-ash">{t.handles.map((h) => `${h.usuario} · ${seguidores(h.seguidores)}`).join(' · ')}</div>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone={estadoTone(t.cuenta === 'Preaprobada' ? 'Activa' : t.cuenta)}>Cuenta {t.cuenta.toLowerCase()}</Badge>
          {t.agenciaId && <Badge tone={estadoTone(t.representacion)}>{ag?.nombre} · {t.representacion.toLowerCase()}</Badge>}
        </div>
      </div>
      <EstadoCuentaAviso cuenta={t.cuenta} resoluciones={t.resoluciones} />
      <CamposPersonales b={b} set={set} conCorreo={false} />
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] gap-4 items-start">
        <div className="bg-white border border-hairline rounded-[12px] p-5 flex flex-col gap-3.5">
          <div className="text-[16px] font-semibold text-carbon">Perfil de creador</div>
          <CamposCreador b={b} set={set} />
        </div>
        <div className="flex flex-col gap-4">
          <Panel title="Guardar cambios">
            <div className="border-t border-hairline px-5 py-4 flex flex-col gap-2">
              <Button onClick={() => s.actualizarPerfil(t.id, cambios)}>Guardar perfil</Button>
              {t.cuenta === 'Observada' && <Button variant="outlined" onClick={() => s.reenviarRevision('talento', t.id)}>Reenviar a revisión</Button>}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

const AVISOS: { id: AvisoPago; label: string }[] = [{ id: 'Talento', label: 'Al talento' }, { id: 'Agencia', label: 'A la agencia' }, { id: 'Ambos', label: 'A ambos' }];

function ConfigAgencia({ ag }: { ag: Agencia }) {
  const s = useInflu();
  const [datos, setDatos] = useState({ contacto: ag.contacto, correo: ag.correo, telefono: ag.telefono, clabe: ag.clabe });
  return (
    <div className="px-4 md:px-10 py-6 md:py-8 max-w-[1100px] mx-auto flex flex-col gap-5">
      <div>
        <div className="text-[21px] font-semibold text-carbon">Configuración</div>
        <div className="text-[13px] text-ash">{ag.razonSocial} · RFC {ag.rfc} · folio mercantil {ag.folioMercantil}</div>
      </div>
      <EstadoCuentaAviso cuenta={ag.cuenta} resoluciones={ag.resoluciones} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        <Panel title="Preferencias" subtitle="Única preferencia de la agencia: a quién llega el aviso de pago">
          <div className="border-t border-hairline px-5 py-4 flex flex-col gap-3">
            <div className="text-[13px] text-ash">Cuando se libera un pago, avisamos por WhatsApp a:</div>
            <div className="flex gap-2 flex-wrap">
              {AVISOS.map((a) => (
                <button key={a.id} onClick={() => a.id !== ag.avisoPago && s.cambiarAvisoPago(ag.id, a.id)}
                  className={`px-3.5 py-1.5 rounded-full text-[13px] border ${ag.avisoPago === a.id ? 'bg-carbon text-white border-carbon' : 'bg-white text-smoke border-hairline hover:bg-frost'}`}>{a.label}</button>
              ))}
            </div>
            <div className="text-[11.5px] text-mist">Aplica a todos los adelantos y liquidaciones de tus talentos. Influ envía la instrucción irrevocable de pago a la marca, con copia a la agencia.</div>
          </div>
        </Panel>
        <Panel title="Condiciones pactadas con Influ">
          <div className="border-t border-hairline px-5 py-1">
            <Fila t="Comisión fija" v={`${ag.condiciones.fija * 100}% sobre el total de la factura`} />
            <Fila t="Comisión variable" v={`${String(ag.condiciones.mensual * 100).replace('.', ',')}% mensual`} />
            <Fila t="Vigentes desde" v={formatDate(ag.condiciones.desde)} />
          </div>
        </Panel>
        <Panel title="Contacto principal y cobro">
          <div className="border-t border-hairline px-5 py-4 flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <Input label="Contacto" value={datos.contacto} onChange={(e) => setDatos({ ...datos, contacto: e.target.value })} />
              <Input label="Correo" value={datos.correo} onChange={(e) => setDatos({ ...datos, correo: e.target.value })} />
              <Input label="Teléfono" value={datos.telefono} onChange={(e) => setDatos({ ...datos, telefono: e.target.value })} />
              <Input label="CLABE" value={datos.clabe} onChange={(e) => setDatos({ ...datos, clabe: e.target.value.replace(/\D/g, '').slice(0, 18) })} />
            </div>
            <div className="flex gap-2">
              <Button variant="outlined" onClick={() => s.actualizarAgencia(ag.id, datos)}>Guardar datos</Button>
              {ag.cuenta === 'Observada' && <Button onClick={() => s.reenviarRevision('agencia', ag.id)}>Reenviar a revisión</Button>}
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}
