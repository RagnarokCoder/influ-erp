import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Bell, RefreshCw, Menu } from "lucide-react";
import { tituloDe } from "../../routes/routes_list_titles";
import { useInflu, rolActual, useVista } from "../../store/useInflu";
import { puedeVer } from "../../lib/permisos";
import { alertas } from "../../lib/derive";
import { ahora } from "../../lib/format";
import UserMenu from "./UserMenu";
import ConfirmDialog from "../ui/ConfirmDialog";

export default function Header({ onMenu }: { onMenu?: () => void }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [avisos, setAvisos] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const rol = useInflu(rolActual);
  const reiniciarDemo = useInflu((s) => s.reiniciarDemo);
  const v = useVista();

  // Las alertas se calculan sobre la cartera visible y se filtran a lo que el
  // perfil puede abrir: el talento y la agencia solo reciben avisos de lo suyo.
  const lista = alertas(v, ahora().fechaHora).filter((a) => puedeVer(rol, a.ruta));
  const base = tituloDe(location.pathname) ?? { eyebrow: "Influ", title: "Adelanto de colaboraciones" };
  // Mismas rutas, otro nombre según el panel (flujo de pantallas Fase 1).
  const meta = location.pathname === "/notificaciones" && !["Agencia", "Talento"].includes(rol) ? { eyebrow: "Panel interno", title: "Alertas" }
    : location.pathname === "/resumen" && rol === "Talento" ? { eyebrow: "Mi cuenta", title: "Inicio" }
    : location.pathname === "/talentos" && rol === "Agencia" ? { eyebrow: "Panel de agencia", title: "Mis talentos" }
    : location.pathname === "/operaciones" && rol === "Agencia" ? { eyebrow: "Panel de agencia", title: "Adelantos" }
    : location.pathname === "/perfil" && rol === "Agencia" ? { eyebrow: "Panel de agencia", title: "Configuración" }
    : base;

  return (
    <>
      <header
        className="h-[64px] shrink-0 sticky top-0 z-30 border-b border-hairline flex items-center px-4 md:px-6 gap-3 md:gap-6 box-border bg-white/85 backdrop-blur-xl"
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <button onClick={onMenu} className="p-1.5 rounded hover:bg-frost md:hidden"><Menu size={16} strokeWidth={1.6} className="text-ash" /></button>
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-wide text-mist font-semibold">{meta.eyebrow}</div>
            <div className="text-[17px] font-semibold text-carbon leading-tight truncate">{meta.title}</div>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-3">
          <UserMenu />
          <div className="relative">
            <button onClick={() => setAvisos((x) => !x)} className="relative p-2 rounded-full hover:bg-frost" title="Alertas">
              <Bell size={16} strokeWidth={1.6} className="text-ash" />
              {lista.length > 0 && <span className="absolute top-1 right-1 w-2 h-2 bg-danger rounded-full" />}
            </button>
            {avisos && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setAvisos(false)} />
                <div className="fixed md:absolute right-4 md:right-0 top-16 md:top-full mt-1 bg-white border border-hairline rounded-[10px] w-[calc(100vw-32px)] max-w-96 max-h-[420px] overflow-y-auto z-50 shadow-md">
                  <div className="px-4 py-2.5 border-b border-hairline text-[12px] font-semibold text-carbon sticky top-0 bg-white">
                    Alertas
                  </div>
                  {lista.length === 0 ? (
                    <div className="px-4 py-8 text-center text-[12px] text-mist">Sin alertas. Solicitudes en tiempo, facturas al corriente y remanentes pagados.</div>
                  ) : (
                    <div className="divide-y divide-hairline">
                      {lista.map((a) => (
                        <button
                          key={a.id}
                          onClick={() => { setAvisos(false); navigate(a.ruta); }}
                          className="w-full text-left px-4 py-3 flex gap-3 hover:bg-frost transition-colors"
                        >
                          <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${a.tipo === "error" ? "bg-danger" : a.tipo === "warn" ? "bg-warning" : "bg-success"}`} />
                          <div className="min-w-0">
                            <div className="text-[13px] font-medium text-carbon">{a.titulo}</div>
                            <div className="text-[12px] text-ash mt-0.5 break-words">{a.detalle}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
          <button onClick={() => setConfirm(true)} className="p-2 rounded-full hover:bg-frost" title="Reiniciar demo">
            <RefreshCw size={16} strokeWidth={1.6} className="text-ash" />
          </button>
        </div>
      </header>

      <ConfirmDialog
        open={confirm}
        title="¿Reiniciar el demo?"
        message="Se borra todo lo capturado y se vuelve a la semilla inicial, bitácora incluida. Tu sesión se conserva."
        confirmLabel="Reiniciar demo"
        danger
        onConfirm={() => { reiniciarDemo(); setConfirm(false); }}
        onCancel={() => setConfirm(false)}
      />
    </>
  );
}
