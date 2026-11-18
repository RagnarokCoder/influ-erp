import type { LucideIcon } from 'lucide-react';

interface KpiCardProps {
  label: string; value: string; unit?: string; delta?: string;
  deltaPositive?: boolean; note?: string; icon?: LucideIcon;
  /** Versión densa para el tablero, donde caben seis en una fila. */
  compacto?: boolean;
}

export default function KpiCard({ label, value, unit, delta, deltaPositive, note, icon: Icon, compacto }: KpiCardProps) {
  return (
    <div className={`bg-white border border-hairline rounded-[8px] flex flex-col ${compacto ? 'p-3.5 gap-1.5' : 'p-4 gap-2'}`}>
      <div className="flex items-start justify-between gap-2">
        <span className={`text-ash leading-tight ${compacto ? 'text-[11px]' : 'text-[12px]'}`}>{label}</span>
        {Icon && <Icon size={14} className="text-mist shrink-0" strokeWidth={1.6} />}
      </div>
      <div className="flex items-baseline gap-1">
        <span className={`font-semibold tracking-[-0.5px] text-carbon tabular-nums ${compacto ? 'text-[20px]' : 'text-[24px]'}`}>{value}</span>
        {unit && <span className="text-[11px] text-ash">{unit}</span>}
      </div>
      {(delta || note) && (
        <div className="flex items-center gap-1.5 text-[11px] leading-tight">
          {delta && <span className={deltaPositive ? 'text-success' : 'text-danger'}>{delta}</span>}
          {note && <span className="text-mist truncate">{note}</span>}
        </div>
      )}
    </div>
  );
}
