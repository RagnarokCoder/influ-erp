import { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import { NAV } from "../../routes/routes_list";
import { useInflu, rolActual, useVista, usuarioActual } from "../../store/useInflu";
import { puedeVer } from "../../lib/permisos";
import { estadoCesion, notificaciones, ordenDe, faltantesLiberar } from "../../lib/derive";
import { ahora } from "../../lib/format";
import { formatDate } from "../../lib/format";
import { HOY_ISO } from "../../data/constantes";

// Demo Stay On Social (cambio 1): se oculta el grupo "Marketplace" del menú de
// los tres paneles. Las rutas /mk/ siguen existiendo; solo no aparecen en la barra.
const OCULTAR_MARKETPLACE = true;

// En escritorio vive fijo a la izquierda; en el celular se abre
// desde el botón de menú del encabezado como panel sobrepuesto.
export default function Sidebar({ movil = false, onClose }: { movil?: boolean; onClose?: () => void }) {
  const { pathname } = useLocation();
  const v = useVista();
  const rol = useInflu(rolActual);

  const u = useInflu(usuarioActual);
  // Lo que le toca hacer a quien pidió el adelanto: firmar y subir evidencia.
  const pendientesMios = v.operaciones.filter((o) => u?.rol === o.solicitante && (o.estatus === "Por firmar" || o.estatus === "Observada" || (o.estatus === "Firmada" && !o.evidencia))).length;
  const interno = rol === "Dirección General" || rol === "Equipo interno";
  const fh = ahora().fechaHora;
  const badges: Record<string, number> = {
    "/registros": v.talentos.filter((t) => t.cuenta === "En revisión").length + v.agencias.filter((a) => a.cuenta === "En revisión").length,
    "/revision": v.operaciones.filter((o) => o.estatus === "En revisión" && o.analisis.estado === "Lista").length,
    "/contratos": v.operaciones.filter((o) => o.docusign && !o.docusign.firmado).length,
    "/rug": v.operaciones.filter((o) => o.rug?.estado === "En cola").length,
    "/cesiones": v.operaciones.filter((o) => o.cesion && estadoCesion(o, fh) === "Sin acuse").length,
    "/pagos": v.ordenes.filter((o) => o.estatus !== "Pagada").length + v.operaciones.filter((o) => o.estatus === "Firmada" && !faltantesLiberar(o).length && !ordenDe(o.id, "Adelanto", v.ordenes)).length,
    "/notificaciones": notificaciones(v, fh, interno).filter((n) => n.urgente).length + v.mensajes.filter((m) => m.estatus === "Fallido").length,
    "/operaciones": pendientesMios,
    "/talentos": rol === "Agencia" ? v.talentos.filter((t) => t.representacion === "Pendiente").length : 0,
  };

  const grupos = NAV.filter((g) => !g.roles || g.roles.includes(rol))
    .map((g) => ({ ...g, items: g.items.filter((i) => (!i.soloRoles || i.soloRoles.includes(rol)) && puedeVer(rol, i.to)) }))
    .filter((g) => g.items.length > 0);

  // Cambio 5: los grupos del marketplace ("Marketplace · Marca/Creador/Agencia/
  // Equipo") quedan dentro de un solo grupo "Marketplace" con sus subgrupos.
  const esMarket = (g: string) => g.startsWith("Marketplace");
  const subgruposMarket = grupos.filter((g) => esMarket(g.group)).map((g) => ({ ...g, sub: g.group.replace(/^Marketplace ·\s*/, "") }));
  const gruposNormales = grupos.filter((g) => !esMarket(g.group));
  // El bloque de Marketplace se inserta antes de "Sistema".
  const antesDeSistema = gruposNormales.filter((g) => g.group !== "Sistema");
  const sistema = gruposNormales.filter((g) => g.group === "Sistema");

  const grupoDe = (ruta: string) => {
    if (subgruposMarket.some((g) => g.items.some((i) => i.to === ruta))) return "Marketplace";
    return grupos.find((g) => g.items.some((i) => i.to === ruta))?.group;
  };

  // Acordeón: una sección abierta a la vez. La que se abre sola es la de la
  // pantalla en la que estás, para no navegar a ciegas al cambiar de rol.
  const [abierta, setAbierta] = useState<string | null>(() => grupoDe(pathname) ?? grupos[0]?.group ?? null);
  const [subAbierta, setSubAbierta] = useState<string | null>(() => subgruposMarket.find((g) => g.items.some((i) => i.to === pathname))?.sub ?? subgruposMarket[0]?.sub ?? null);

  useEffect(() => {
    const g = grupoDe(pathname);
    if (g) setAbierta(g);
    const sg = subgruposMarket.find((x) => x.items.some((i) => i.to === pathname))?.sub;
    if (sg) setSubAbierta(sg);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, rol]);

  const renderItems = (items: typeof grupos[number]["items"], sangria = "pl-3") =>
    items.map((item) => (
      <NavLink
        key={`${item.to}-${item.label}`}
        to={item.to}
        onClick={onClose}
        className={({ isActive }) =>
          `flex items-center justify-between ${sangria} pr-2.5 py-1.5 rounded-[6px] text-[13px] transition-colors ${
            isActive ? "bg-ice text-blue-link font-medium" : "text-smoke hover:bg-frost"
          }`
        }
      >
        {({ isActive }) => (
          <>
            <div className="flex items-center gap-2.5">
              <item.icon size={14} strokeWidth={1.6} className={isActive ? "text-blue-link" : "text-ash"} />
              {item.label}
            </div>
            {badges[item.to] > 0 && (
              <span className="min-w-4 h-4 rounded-full bg-danger text-white text-[9px] font-semibold flex items-center justify-center px-1">
                {badges[item.to]}
              </span>
            )}
          </>
        )}
      </NavLink>
    ));

  const renderGrupo = (group: typeof grupos[number]) => {
    const activa = abierta === group.group;
    // Lo pendiente de una sección cerrada se suma en su encabezado: una
    // alerta escondida detrás de un acordeón es una alerta perdida.
    const pendientes = group.items.reduce((t, i) => t + (badges[i.to] ?? 0), 0);
    return (
      <div key={group.group}>
        <button
          onClick={() => setAbierta(activa ? null : group.group)}
          className="w-full flex items-center justify-between px-2.5 py-2 rounded-[6px] hover:bg-frost transition-colors group"
        >
          <span className="text-[10px] font-semibold uppercase tracking-wide text-mist">{group.group}</span>
          <span className="flex items-center gap-1.5">
            {!activa && pendientes > 0 && (
              <span className="min-w-4 h-4 rounded-full bg-danger text-white text-[9px] font-semibold flex items-center justify-center px-1">{pendientes}</span>
            )}
            <ChevronDown size={13} strokeWidth={2} className={`text-mist transition-transform duration-200 ${activa ? "" : "-rotate-90"}`} />
          </span>
        </button>
        <div className="overflow-hidden transition-[grid-template-rows] duration-200 grid" style={{ gridTemplateRows: activa ? "1fr" : "0fr" }}>
          <div className="min-h-0"><div className="flex flex-col gap-0.5 pb-1.5">{renderItems(group.items)}</div></div>
        </div>
      </div>
    );
  };

  // Cambio 5: grupo único "Marketplace" con los subgrupos (Marca/Creador/Agencia/Equipo) adentro.
  const renderMarketplace = () => {
    if (OCULTAR_MARKETPLACE) return null;
    if (!subgruposMarket.length) return null;
    const activa = abierta === "Marketplace";
    return (
      <div key="Marketplace">
        <button
          onClick={() => setAbierta(activa ? null : "Marketplace")}
          className="w-full flex items-center justify-between px-2.5 py-2 rounded-[6px] hover:bg-frost transition-colors group"
        >
          <span className="text-[10px] font-semibold uppercase tracking-wide text-mist">Marketplace</span>
          <ChevronDown size={13} strokeWidth={2} className={`text-mist transition-transform duration-200 ${activa ? "" : "-rotate-90"}`} />
        </button>
        <div className="overflow-hidden transition-[grid-template-rows] duration-200 grid" style={{ gridTemplateRows: activa ? "1fr" : "0fr" }}>
          <div className="min-h-0">
            <div className="flex flex-col gap-0.5 pb-1.5 pl-1.5">
              {subgruposMarket.map((sg) => {
                const subActiva = subAbierta === sg.sub;
                return (
                  <div key={sg.group}>
                    <button
                      onClick={() => setSubAbierta(subActiva ? null : sg.sub)}
                      className="w-full flex items-center justify-between pl-3 pr-2.5 py-1.5 rounded-[6px] hover:bg-frost transition-colors"
                    >
                      <span className="text-[11px] font-medium uppercase tracking-wide text-ash">{sg.sub}</span>
                      <ChevronDown size={12} strokeWidth={2} className={`text-mist transition-transform duration-200 ${subActiva ? "" : "-rotate-90"}`} />
                    </button>
                    <div className="overflow-hidden transition-[grid-template-rows] duration-200 grid" style={{ gridTemplateRows: subActiva ? "1fr" : "0fr" }}>
                      <div className="min-h-0"><div className="flex flex-col gap-0.5 pb-1">{renderItems(sg.items, "pl-6")}</div></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <aside className={`${movil ? "flex w-72 shadow-lg" : "hidden md:flex w-60"} shrink-0 bg-white border-r border-hairline flex-col h-full box-border`}>
      <div className="px-4 py-4 border-b border-hairline">
        <div className="flex items-center gap-2.5">
          <span className="w-6.5 h-6.5 rounded-lg bg-blue flex items-center justify-center text-white text-[10px] font-bold">IN</span>
          <div>
            <div className="text-[15px] font-bold text-carbon leading-none">Influ</div>
            <div className="text-[10px] text-ash uppercase tracking-wide mt-0.5">adelanto de pagos</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-2 flex flex-col gap-0.5">
        {antesDeSistema.map(renderGrupo)}
        {renderMarketplace()}
        {sistema.map(renderGrupo)}
      </nav>

      <div className="px-4 py-2.5 border-t border-hairline text-[10px] text-mist">
        Demo funcional · {formatDate(HOY_ISO)}
      </div>
    </aside>
  );
}
