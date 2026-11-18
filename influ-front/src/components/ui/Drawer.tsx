import React from 'react';
import { X } from 'lucide-react';
interface DrawerProps { open: boolean; onClose: () => void; title?: string; subtitle?: string; footer?: React.ReactNode; children: React.ReactNode; }
export default function Drawer({ open, onClose, title, subtitle, footer, children }: DrawerProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-carbon/30" onClick={onClose} />
      <div className="w-[480px] max-w-full bg-white h-full flex flex-col shadow-lg" style={{ animation: 'slideIn 0.26s ease' }}>
        <div className="flex items-start justify-between px-6 py-4 border-b border-hairline">
          <div>
            <div className="text-[17px] font-semibold">{title}</div>
            {subtitle && <div className="text-[12px] text-ash mt-0.5">{subtitle}</div>}
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-frost"><X size={16} strokeWidth={1.6} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">{children}</div>
        {footer && <div className="border-t border-hairline px-6 py-4 flex items-center gap-2">{footer}</div>}
      </div>
      <style>{`@keyframes slideIn{from{transform:translateX(100%)}to{transform:translateX(0)}}`}</style>
    </div>
  );
}
