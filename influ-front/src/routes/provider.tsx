import { useState } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import Header from "../components/shell/Header";
import Sidebar from "../components/shell/Sidebar";
import ErrorBoundary from "../components/ui/ErrorBoundary";
import { useInflu, rolActual, sesionValida } from "../store/useInflu";
import { puedeVer, rutaInicial } from "../lib/permisos";
import {
  Tablero, Solicitudes, Notificaciones, Resumen, PedirAdelanto, Operaciones, Talentos, Agencias, Marcas,
  Usuarios, RolesScreen, BitacoraScreen, Registros, Revision, Contratos, RugScreen, Cesiones, Evidencia, Pagos, Metricas, Perfil,
} from "../screens";
import { MarketRoutes } from "../market";
import { FondeoRoutes } from "../fondeo";
import { useMotorSimulado } from "../store/motor";

// Sin sesión todo va al login; un módulo que el rol no abre tampoco se abre
// escribiendo la URL (roles.md §6.1, login.md §9).
const SoloSiPuede = ({ children }: { children: React.ReactNode }) => {
  const { pathname, search } = useLocation();
  const rol = useInflu(rolActual);
  const conSesion = useInflu(sesionValida);
  if (!conSesion) return <Navigate to={`/login?ir=${encodeURIComponent(pathname + search)}`} replace />;
  return puedeVer(rol, pathname) ? <>{children}</> : <Navigate to={rutaInicial(rol)} replace />;
};

export const AppShell = () => {
  const rol = useInflu(rolActual);
  const [menu, setMenu] = useState(false);
  // Lectura del contrato por la IA, reenvíos a las 48 h: lo que en producción corre en el servidor.
  useMotorSimulado();
  return (
    <div className="flex h-screen overflow-hidden bg-frost">
      <Sidebar />
      {menu && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <Sidebar movil onClose={() => setMenu(false)} />
          <div className="flex-1 bg-carbon/30" onClick={() => setMenu(false)} />
        </div>
      )}
      <section className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Header onMenu={() => setMenu(true)} />
        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          <ErrorBoundary>
            <SoloSiPuede>
              <Routes>
                <Route path="/" element={<Navigate to={rutaInicial(rol)} replace />} />
                <Route path="/tablero" element={<Tablero />} />
                <Route path="/registros" element={<Registros />} />
                <Route path="/solicitudes" element={<Solicitudes />} />
                <Route path="/revision" element={<Revision />} />
                <Route path="/contratos" element={<Contratos />} />
                <Route path="/rug" element={<RugScreen />} />
                <Route path="/cesiones" element={<Cesiones />} />
                <Route path="/evidencia" element={<Evidencia />} />
                <Route path="/pagos" element={<Pagos />} />
                <Route path="/metricas" element={<Metricas />} />
                <Route path="/perfil" element={<Perfil />} />
                <Route path="/mk/*" element={<MarketRoutes />} />
                <Route path="/fondeo/*" element={<FondeoRoutes />} />
                <Route path="/notificaciones" element={<Notificaciones />} />
                <Route path="/resumen" element={<Resumen />} />
                <Route path="/pedir-adelanto" element={<PedirAdelanto />} />
                <Route path="/operaciones" element={<Operaciones />} />
                <Route path="/talentos" element={<Talentos />} />
                <Route path="/agencias" element={<Agencias />} />
                <Route path="/marcas" element={<Marcas />} />
                <Route path="/usuarios" element={<Usuarios />} />
                <Route path="/roles" element={<RolesScreen />} />
                <Route path="/bitacora" element={<BitacoraScreen />} />
                <Route path="*" element={<Navigate to={rutaInicial(rol)} replace />} />
              </Routes>
            </SoloSiPuede>
          </ErrorBoundary>
        </main>
      </section>
    </div>
  );
};
