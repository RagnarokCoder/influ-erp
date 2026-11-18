import React from 'react';
import { create } from 'zustand';
import { Star } from 'lucide-react';
import { useInflu } from '../store/useInflu';
import Badge from '../components/ui/Badge';
import Select from '../components/ui/Select';
import type { Agencia, Empresa, Marca, Talento, Usuario } from '../data/types';
import { useMarket, esEquipo, creadorDeUsuario } from './useMarket';

// Piezas compartidas de las pantallas del marketplace.

type Nucleo = { usuarios?: Usuario[]; usuarioId?: string; empresas?: Empresa[]; marcas?: Marca[]; agencias?: Agencia[]; talentos?: Talento[] };
const vacio: never[] = [];

export function useNucleo() {
  const usuarios = useInflu((s) => (s as unknown as Nucleo).usuarios ?? vacio);
  const usuarioId = useInflu((s) => (s as unknown as Nucleo).usuarioId);
  const empresas = useInflu((s) => (s as unknown as Nucleo).empresas ?? vacio);
  const marcas = useInflu((s) => (s as unknown as Nucleo).marcas ?? vacio);
  const agencias = useInflu((s) => (s as unknown as Nucleo).agencias ?? vacio);
  const talentos = useInflu((s) => (s as unknown as Nucleo).talentos ?? vacio);
  const u = usuarios.find((x) => x.id === usuarioId);
  return { u, rol: u?.rol ?? 'Dirección General', usuarios, empresas, marcas, agencias, talentos };
}

/** "Ver como": los perfiles internos ven cualquier panel del marketplace eligiendo a quién. */
export const useVerComo = create<{ empresaId: string; creadorId: string; agenciaId: string; set: (x: Partial<{ empresaId: string; creadorId: string; agenciaId: string }>) => void }>((set) => ({
  empresaId: 'EMP-01', creadorId: 'CR-01', agenciaId: 'AG-01', set: (x) => set(x),
}));

export function useEmpresaActual() {
  const { u, rol } = useNucleo();
  const ver = useVerComo((s) => s.empresaId);
  return rol === 'Marca' ? u?.empresaId ?? '' : ver;
}
export function useCreadorActual() {
  const { u, rol } = useNucleo();
  const ver = useVerComo((s) => s.creadorId);
  const s = useMarket();
  if (rol === 'Talento') return creadorDeUsuario(s, u);
  return s.creadores.find((c) => c.id === ver);
}
export function useAgenciaActual() {
  const { u, rol } = useNucleo();
  const ver = useVerComo((s) => s.agenciaId);
  return rol === 'Agencia' ? u?.agenciaId ?? '' : ver;
}

export function useNombreEmpresa() {
  const { empresas } = useNucleo();
  const cuentas = useMarket((s) => s.cuentas);
  return (id: string) => empresas.find((e) => e.id === id)?.razonSocial ?? cuentas.find((c) => c.empresaId === id)?.marcas[0] ?? id;
}

/** Selector de "ver como" para Dirección y el equipo, que no son marca, creador ni agencia. */
export function VerComo({ tipo }: { tipo: 'empresa' | 'creador' | 'agencia' }) {
  const { rol, agencias } = useNucleo();
  const v = useVerComo();
  const cuentas = useMarket((s) => s.cuentas);
  const creadores = useMarket((s) => s.creadores);
  const nombre = useNombreEmpresa();
  if (!esEquipo(rol)) return null;
  return (
    <div className="flex items-center gap-2 bg-ice border border-hairline rounded-[8px] px-3 py-2 text-[12px] text-ash flex-wrap">
      <span>Vista del equipo de Influ · ver como</span>
      <div className="min-w-[220px]">
        {tipo === 'empresa' && (
          <Select value={v.empresaId} onChange={(e) => v.set({ empresaId: e.target.value })}>
            {cuentas.map((c) => <option key={c.empresaId} value={c.empresaId}>{nombre(c.empresaId)}</option>)}
          </Select>
        )}
        {tipo === 'creador' && (
          <Select value={v.creadorId} onChange={(e) => v.set({ creadorId: e.target.value })}>
            {creadores.map((c) => <option key={c.id} value={c.id}>{`${c.handle} · ${c.nombre}`}</option>)}
          </Select>
        )}
        {tipo === 'agencia' && (
          <Select value={v.agenciaId} onChange={(e) => v.set({ agenciaId: e.target.value })}>
            {agencias.map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
          </Select>
        )}
      </div>
      <span className="text-mist">Solo lectura: las acciones las hace cada parte.</span>
    </div>
  );
}

export const Pagina = ({ titulo, sub, right, children, ancho = 'max-w-[1400px]' }: { titulo: string; sub?: string; right?: React.ReactNode; children: React.ReactNode; ancho?: string }) => (
  <div className={`px-4 md:px-10 py-6 md:py-8 ${ancho} mx-auto flex flex-col gap-5`}>
    <div className="flex items-start justify-between gap-3 flex-wrap">
      <div>
        <div className="text-[21px] font-semibold text-carbon leading-tight">{titulo}</div>
        {sub && <div className="text-[13px] text-ash mt-0.5">{sub}</div>}
      </div>
      {right && <div className="flex items-center gap-2 flex-wrap">{right}</div>}
    </div>
    {children}
  </div>
);

export const Fila = ({ t, v, fuerte, tono }: { t: React.ReactNode; v: React.ReactNode; fuerte?: boolean; tono?: 'danger' | 'success' | 'warning' }) => (
  <div className="flex items-center justify-between gap-3 py-2 border-b border-hairline last:border-0">
    <span className={`text-[13px] ${fuerte ? 'font-semibold text-carbon' : 'text-ash'}`}>{t}</span>
    <span className={`text-[13px] tabular-nums text-right ${fuerte ? 'font-semibold' : 'font-medium'} ${tono === 'danger' ? 'text-danger' : tono === 'success' ? 'text-success' : tono === 'warning' ? 'text-warning' : 'text-carbon'}`}>{v}</span>
  </div>
);

export const Score = ({ valor, chico }: { valor: number; chico?: boolean }) => (
  <span className={`${chico ? 'w-9 h-9 text-[12px] border-[3px]' : 'w-12 h-12 text-[15px] border-4'} rounded-full flex items-center justify-center font-semibold tabular-nums shrink-0 ${valor >= 80 ? 'border-success text-success' : valor >= 65 ? 'border-blue text-blue-link' : 'border-warning text-warning'}`}>{valor}</span>
);

export const Chip = ({ activo, children, onClick }: { activo?: boolean; children: React.ReactNode; onClick?: () => void }) => (
  <button type="button" onClick={onClick} className={`px-3 py-1 rounded-full text-[12px] font-medium border transition-colors ${activo ? 'bg-carbon text-white border-carbon' : 'bg-white text-smoke border-hairline hover:bg-frost'}`}>{children}</button>
);

const TONOS: Record<string, 'success' | 'warning' | 'danger' | 'neutral' | 'blue'> = {
  Activa: 'success', Publicado: 'success', Preseleccionado: 'success', Contratado: 'success', Aceptada: 'success', Aprobada: 'success', Pagada: 'success', Verificada: 'success', Resuelto: 'success', Publicada: 'success', Cerrada: 'neutral', 'Detectada y verificada': 'success', Asociada: 'success', 'A tiempo': 'success', 'Dentro de sus condiciones': 'success',
  Invitado: 'blue', Invitada: 'warning', Configurando: 'warning', Enviada: 'blue', Postulación: 'neutral', 'En producción': 'blue', Vista: 'blue', 'Te invitaron': 'blue', Abierto: 'blue',
  Nueva: 'warning', 'Por confirmar agencia': 'warning', Contraoferta: 'warning', 'En revisión': 'warning', 'Contenido en revisión': 'warning', 'Revisión del matching': 'warning', 'Acuerdo por firmar': 'warning', 'Cambios pedidos': 'warning', 'Con observaciones': 'warning', 'Por vencer': 'warning', Borrador: 'neutral', Retenida: 'warning', 'Fuera de tus condiciones': 'warning',
  Rechazada: 'danger', Vencida: 'danger', 'No detectada': 'danger', Descartado: 'neutral', 'Sin respuesta': 'neutral', Disputa: 'danger', Incumplimiento: 'danger', Moderación: 'warning',
};
export const Estado = ({ e, children }: { e: string; children?: React.ReactNode }) => <Badge tone={TONOS[e] ?? 'neutral'}>{children ?? e}</Badge>;

export function Estrellas({ valor, onChange }: { valor: number; onChange?: (n: number) => void }) {
  return (
    <span className="inline-flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" disabled={!onChange} onClick={() => onChange?.(n)} className="disabled:cursor-default">
          <Star size={15} className={n <= valor ? 'fill-warning text-warning' : 'text-pebble'} />
        </button>
      ))}
    </span>
  );
}

export const k = (n: number) => (n >= 1_000_000 ? `${(n / 1_000_000).toFixed(2).replace(/\.?0+$/, '')} M` : n >= 1000 ? `${Math.round(n / 1000)} k` : String(n));

export const Vacio = ({ texto }: { texto: string }) => <div className="px-5 py-8 text-center text-[13px] text-mist">{texto}</div>;

export const Th = ({ children, right }: { children?: React.ReactNode; right?: boolean }) => (
  <th className={`px-4 py-2.5 text-[10px] uppercase tracking-wide text-mist font-medium whitespace-nowrap ${right ? 'text-right' : 'text-left'}`}>{children}</th>
);
export const Td = ({ children, right, className = '' }: { children?: React.ReactNode; right?: boolean; className?: string }) => (
  <td className={`px-4 py-2.5 text-[13px] whitespace-nowrap ${right ? 'text-right tabular-nums' : ''} ${className}`}>{children}</td>
);
