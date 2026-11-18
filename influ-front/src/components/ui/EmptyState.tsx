import type { LucideIcon } from 'lucide-react';
interface Props { icon?: LucideIcon; title: string; message?: string; }
export default function EmptyState({ icon: Icon, title, message }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-2 text-center">
      {Icon && <Icon size={24} strokeWidth={1.4} className="text-mist" />}
      <div className="text-[15px] font-medium text-carbon">{title}</div>
      {message && <div className="text-[13px] text-ash max-w-80">{message}</div>}
    </div>
  );
}
