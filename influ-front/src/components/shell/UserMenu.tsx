import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, LogOut, UserCog } from "lucide-react";
import { useInflu, usuarioActual } from "../../store/useInflu";
import { CONFIG } from "../../data/constantes";
import type { RolUsuario } from "../../data/types";

// Menú del usuario (login.md §8): nombre, perfil, "Ver el sistema como…" (el
// atajo del presentador) y "Cerrar sesión".
export default function UserMenu() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const usuarios = useInflu((s) => s.usuarios);
  const actual = useInflu(usuarioActual);
  const setUsuario = useInflu((s) => s.setUsuario);
  const cerrarSesion = useInflu((s) => s.cerrarSesion);

  // M2 (piloto Stay On Social): el selector solo lista los roles del piloto
  // (Dirección General, Equipo interno, Agencia, Fondeador). Talento y Marca
  // quedan fuera. El Fondeador se oculta si CONFIG.fondeadorVisible es false.
  const rolesVisibles = new Set<RolUsuario>(
    CONFIG.rolesPiloto.filter((r) => r !== "Fondeador" || CONFIG.fondeadorVisible),
  );

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-hairline hover:bg-frost text-[13px] font-medium text-carbon transition-colors"
      >
        <UserCog size={14} strokeWidth={1.6} className="text-ash" />
        <span className="hidden md:inline">{actual?.rol ?? "Perfil"}</span>
        <ChevronDown size={12} className="text-ash" strokeWidth={1.6} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 bg-white border border-hairline rounded-[10px] py-1 w-64 z-50 shadow-md max-h-[70vh] overflow-y-auto">
            <div className="px-3 py-2.5 border-b border-hairline">
              <div className="text-[14px] font-medium text-carbon">{actual?.nombre}</div>
              <div className="text-[11px] text-ash">{actual?.rol}</div>
            </div>
            <div className="px-3 pt-2 pb-1 text-[11px] uppercase tracking-wide text-mist font-semibold">Ver el sistema como</div>
            {/* Demo Stay On Social (M2): solo los roles del piloto (CONFIG.rolesPiloto). */}
            {usuarios.filter((u) => u.estatus === "Activo" && rolesVisibles.has(u.rol)).map((u) => (
              <button
                key={u.id}
                onClick={() => { setUsuario(u.id); setOpen(false); navigate("/"); }}
                className={`w-full text-left px-3 py-2 hover:bg-frost transition-colors ${u.id === actual?.id ? "bg-ice" : ""}`}
              >
                <div className="text-[14px] text-carbon">{u.nombre}</div>
                <div className="text-[11px] text-ash">{u.rol}</div>
              </button>
            ))}
            <div className="border-t border-hairline mt-1 pt-1">
              <button
                onClick={() => { cerrarSesion(); setOpen(false); navigate("/login"); }}
                className="w-full text-left px-3 py-2 hover:bg-danger-wash text-danger text-[13px] flex items-center gap-2"
              >
                <LogOut size={14} strokeWidth={1.6} /> Cerrar sesión
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
