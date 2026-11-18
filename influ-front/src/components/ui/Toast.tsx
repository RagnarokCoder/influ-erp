import { CheckCircle2, AlertTriangle, XCircle, X } from "lucide-react";
import { useInflu } from "../../store/useInflu";

const VARIANTS = {
  ok:    { bg: "bg-success-wash", border: "border-success/30", bar: "bg-success", icon: CheckCircle2,  iconColor: "text-success", title: "Listo" },
  warn:  { bg: "bg-warning-wash", border: "border-warning/30", bar: "bg-warning", icon: AlertTriangle, iconColor: "text-warning", title: "Atención" },
  error: { bg: "bg-danger-wash", border: "border-danger/30", bar: "bg-danger",  icon: XCircle,       iconColor: "text-danger",  title: "Bloqueado" },
};

export default function ToastStack() {
  const toasts = useInflu((s) => s.toasts);
  const dismiss = useInflu((s) => s.dismissToast);

  return (
    <div className="fixed bottom-4 right-4 left-4 sm:left-auto sm:bottom-6 sm:right-6 z-100 flex flex-col gap-3 items-end pointer-events-none">
      {toasts.map((t) => {
        const v = VARIANTS[t.tipo];
        const Icon = v.icon;
        return (
          <div
            key={t.id}
            style={{ animation: "toast-in 0.22s cubic-bezier(0.34,1.56,0.64,1) both" }}
            className={`pointer-events-auto flex items-start gap-3 ${v.bg} border ${v.border} rounded-[10px] pl-4 pr-3 py-3 min-w-75 max-w-95 shadow-md overflow-hidden relative`}
          >
            <span className={`absolute left-0 top-0 bottom-0 w-0.75 ${v.bar} rounded-l-[10px]`} />
            <Icon size={17} className={`${v.iconColor} shrink-0 mt-0.5`} strokeWidth={2} />
            <div className="flex-1 min-w-0">
              <div className={`text-[11px] font-semibold ${v.iconColor} uppercase tracking-wide leading-none mb-1`}>{v.title}</div>
              <div className="text-[13px] text-carbon leading-snug">{t.texto}</div>
            </div>
            <button onClick={() => dismiss(t.id)} className="p-1 rounded-md hover:bg-black/5 text-ash hover:text-carbon transition-colors shrink-0 mt-0.5">
              <X size={13} strokeWidth={2} />
            </button>
          </div>
        );
      })}
      <style>{`
        @keyframes toast-in {
          from { opacity: 0; transform: translateX(24px) scale(0.96); }
          to   { opacity: 1; transform: translateX(0) scale(1); }
        }
      `}</style>
    </div>
  );
}
