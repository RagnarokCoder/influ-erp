interface Props { value: number; max: number; tone?: 'success' | 'warning' | 'danger' | 'avance'; label?: string; }
// Barra comparativa en línea: existencia contra máximo, real contra plan,
// recibidas contra entregadas. El semáforo es el mismo en todo el sistema.
// El tono `avance` es para progreso, donde ir a la mitad no es una alarma.
export default function MiniBar({ value, max, tone, label }: Props) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  const auto = pct >= 70 ? 'success' : pct >= 35 ? 'warning' : 'danger';
  const color = { success: 'bg-success', warning: 'bg-warning', danger: 'bg-danger', avance: 'bg-blue' }[tone ?? auto];
  return (
    <div className="flex items-center gap-2 min-w-28">
      <div className="flex-1 h-1.5 rounded-full bg-pebble overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[11px] tabular-nums text-ash w-9 text-right">{label ?? `${Math.round(pct)}%`}</span>
    </div>
  );
}
