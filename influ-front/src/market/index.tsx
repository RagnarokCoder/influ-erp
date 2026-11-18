import { Navigate, Route, Routes } from 'react-router-dom';
import { Campanas, Briefs, BriefNuevo, BriefDetalle, Comparador, PerfilCreador, MensajesMarca, Contenidos, Kpis, PagosMarca, EquipoMarca } from './screens/marca';
import { Redes, Oportunidades, Postularme, PostulacionesCreador, MensajesCreador, Entregas, CobrosCreador, MetricasCreador } from './screens/creador';
import { Roster, PostulacionesAgencia, OfertasAgencia, CobrosAgencia } from './screens/agencia';
import { ResumenEquipo, Matching, Propuestas, MarcasEquipo, PagosEquipo, Moderacion } from './screens/equipo';
import { PropuestaPublica, HiloPublico, InvitacionPublica } from './screens/publico';

// Fase 2 · Marketplace. Pantallas que el shell monta: MarketRoutes dentro del
// AppShell en /mk/*, y las rutas públicas sin cuenta (propuesta de venta
// directa por link, hilo para participantes en copia, alta por invitación).
export { MARKET_NAV, MARKET_TITLES, MARKET_RUTAS_POR_ROL, type GrupoNav } from './rutas';

export const MarketRoutes = () => (
  <Routes>
    <Route path="marca/campanas" element={<Campanas />} />
    <Route path="marca/briefs" element={<Briefs />} />
    <Route path="marca/briefs/nuevo" element={<BriefNuevo />} />
    <Route path="marca/briefs/:id" element={<BriefDetalle />} />
    <Route path="marca/creadores" element={<Comparador />} />
    <Route path="marca/creadores/:id" element={<PerfilCreador />} />
    <Route path="marca/mensajes" element={<MensajesMarca />} />
    <Route path="marca/mensajes/:id" element={<MensajesMarca />} />
    <Route path="marca/contenidos" element={<Contenidos />} />
    <Route path="marca/contenidos/:id" element={<Contenidos />} />
    <Route path="marca/kpis" element={<Kpis />} />
    <Route path="marca/pagos" element={<PagosMarca />} />
    <Route path="marca/equipo" element={<EquipoMarca />} />
    <Route path="creador/oportunidades" element={<Oportunidades />} />
    <Route path="creador/oportunidades/:id" element={<Postularme />} />
    <Route path="creador/postulaciones" element={<PostulacionesCreador />} />
    <Route path="creador/mensajes" element={<MensajesCreador />} />
    <Route path="creador/mensajes/:id" element={<MensajesCreador />} />
    <Route path="creador/entregas" element={<Entregas />} />
    <Route path="creador/entregas/:id" element={<Entregas />} />
    <Route path="creador/cobros" element={<CobrosCreador />} />
    <Route path="creador/metricas" element={<MetricasCreador />} />
    <Route path="creador/redes" element={<Redes />} />
    <Route path="agencia/roster" element={<Roster />} />
    <Route path="agencia/postulaciones" element={<PostulacionesAgencia />} />
    <Route path="agencia/ofertas" element={<OfertasAgencia />} />
    <Route path="agencia/ofertas/:id" element={<OfertasAgencia />} />
    <Route path="agencia/cobros" element={<CobrosAgencia />} />
    <Route path="equipo/resumen" element={<ResumenEquipo />} />
    <Route path="equipo/matching" element={<Matching />} />
    <Route path="equipo/propuestas" element={<Propuestas />} />
    <Route path="equipo/marcas" element={<MarcasEquipo />} />
    <Route path="equipo/pagos" element={<PagosEquipo />} />
    <Route path="equipo/moderacion" element={<Moderacion />} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);

export const MARKET_PUBLICAS: { path: string; element: React.ReactNode }[] = [
  { path: '/propuesta/:token', element: <PropuestaPublica /> },
  { path: '/hilo/:token', element: <HiloPublico /> },
  { path: '/invitacion/:token', element: <InvitacionPublica /> },
];
