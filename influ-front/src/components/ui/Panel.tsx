import React from "react";

interface PanelProps {
  title?: string;
  subtitle?: string;
  right?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}
export default function Panel({ title, subtitle, right, className = "", children }: PanelProps) {
  return (
    <div className={`bg-white border border-hairline rounded-[8px] ${className}`}>
      {(title || right) && (
        <div className="flex items-center justify-between px-5 py-3.5 gap-4 flex-wrap">
          <div>
            {title && <div className="text-[15px] font-semibold text-carbon">{title}</div>}
            {subtitle && <div className="text-[11.5px] text-ash mt-0.5 leading-snug">{subtitle}</div>}
          </div>
          {right && <div className="flex items-center gap-2 flex-wrap">{right}</div>}
        </div>
      )}
      {children}
    </div>
  );
}
