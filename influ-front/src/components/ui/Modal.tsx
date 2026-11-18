import React from 'react';
import { X } from 'lucide-react';
interface Props { open: boolean; title: string; subtitle?: string; onClose: () => void; footer?: React.ReactNode; children: React.ReactNode; wide?: boolean; }
export default function Modal({ open, title, subtitle, onClose, footer, children, wide }: Props) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-carbon/30 px-4 py-8" onClick={onClose}>
      <div
        className={`bg-white rounded-[12px] w-full ${wide ? 'max-w-[720px]' : 'max-w-[520px]'} max-h-full flex flex-col shadow-lg`}
        style={{ animation: 'modalIn 0.2s ease' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between px-6 py-4 border-b border-hairline">
          <div>
            <div className="text-[17px] font-semibold text-carbon">{title}</div>
            {subtitle && <div className="text-[12px] text-ash mt-0.5">{subtitle}</div>}
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-frost"><X size={16} strokeWidth={1.6} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">{children}</div>
        {footer && <div className="border-t border-hairline px-6 py-4 flex items-center justify-end gap-2">{footer}</div>}
      </div>
      <style>{`@keyframes modalIn{from{opacity:0;transform:scale(0.98)}to{opacity:1;transform:scale(1)}}`}</style>
    </div>
  );
}
