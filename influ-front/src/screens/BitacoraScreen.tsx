import DataModule from '../components/crud/DataModule';
import type { Col } from '../components/crud/types';
import { useInflu } from '../store/useInflu';
import { fechaHora, hoyISO } from '../lib/format';
import type { Bitacora } from '../data/types';
import { History, CalendarCheck, KeyRound, Users } from 'lucide-react';

type Fila = Bitacora & { estatus: string; titulo: string };

const cols: Col<Fila>[] = [
  { key: 'fechaHora', label: 'Fecha y hora', render: (b) => <span className="tabular-nums">{fechaHora(b.fechaHora)}</span> },
  { key: 'usuario', label: 'Usuario' },
  { key: 'rol', label: 'Perfil' },
  { key: 'modulo', label: 'Módulo' },
  { key: 'accion', label: 'Movimiento' },
  { key: 'detalle', label: 'Detalle', render: (b) => <span className="whitespace-normal block max-w-[520px] text-ash">{b.detalle}</span> },
];

// Las acciones que nacen de una llave de `autoriza` (bitacora.md §3.1, adaptable).
const AUTORIZACIONES = ['Voto de aprobación', 'Aprobación', 'Rechazo', 'Inscripción en RUG', 'Liberación de adelanto', 'Pago de la marca', 'Liquidación de remanente', 'Validación de agencia', 'Confirmación de representación', 'Suspensión'];

export const BitacoraScreen = () => {
  const bitacora = useInflu((s) => s.bitacora);
  // Más reciente primero, ordenado al leer; el módulo hace de filtro.
  const filas: Fila[] = [...bitacora]
    .sort((a, b) => b.fechaHora.localeCompare(a.fechaHora))
    .map((b) => ({ ...b, estatus: b.modulo, titulo: `${b.modulo} · ${b.accion}` }));
  const modulos = [...new Set(bitacora.map((b) => b.modulo))].sort();

  return (
    <DataModule<Fila>
      rows={filas}
      cols={cols}
      tituloDetalle={(b) => b.titulo}
      subtituloDetalle={(b) => fechaHora(b.fechaHora)}
      estatuses={modulos}
      nombreSingular="movimiento"
      sinAlta
      sinEdicion
      titulo="Registro histórico inalterable"
      subtitulo="Todo movimiento queda con usuario, fecha y hora, sin posibilidad de eliminarse."
      vacio={{ titulo: 'Sin movimientos', mensaje: 'Ajusta la búsqueda o el filtro de módulo.' }}
      kpis={[
        { label: 'Movimientos', value: String(bitacora.length), icon: History },
        { label: 'De hoy', value: String(bitacora.filter((b) => b.fechaHora.startsWith(hoyISO)).length), icon: CalendarCheck },
        { label: 'Autorizaciones', value: String(bitacora.filter((b) => AUTORIZACIONES.includes(b.accion)).length), note: 'votos, liberaciones, pagos de marca y liquidaciones', icon: KeyRound },
        { label: 'Usuarios con movimientos', value: String(new Set(bitacora.map((b) => b.usuario)).size), icon: Users },
      ]}
    />
  );
};
