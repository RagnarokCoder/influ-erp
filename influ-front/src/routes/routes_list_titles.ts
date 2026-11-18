import { MARKET_TITLES } from "../market/rutas";
import { FONDEO_TITLES } from "../fondeo/rutas";

export const TITLES: Record<string, { eyebrow: string; title: string }> = {
  "/tablero": { eyebrow: "Dirección", title: "Tablero de Dirección" },
  "/registros": { eyebrow: "Panel interno", title: "Aprobación de registros" },
  "/solicitudes": { eyebrow: "Panel interno", title: "Solicitudes de adelanto" },
  "/revision": { eyebrow: "Panel interno", title: "Revisión con ficha del contrato" },
  "/contratos": { eyebrow: "Panel interno", title: "Contratos de factoraje" },
  "/rug": { eyebrow: "Panel interno", title: "Inscripciones en el RUG" },
  "/cesiones": { eyebrow: "Panel interno", title: "Instrucciones de pago" },
  "/evidencia": { eyebrow: "Panel interno", title: "Evidencia de campaña" },
  "/pagos": { eyebrow: "Panel interno", title: "Órdenes de pago y cobranza" },
  "/marcas": { eyebrow: "Panel interno", title: "Empresas y marcas" },
  "/notificaciones": { eyebrow: "Operación", title: "Notificaciones" },
  "/resumen": { eyebrow: "Mi cuenta", title: "Resumen" },
  "/pedir-adelanto": { eyebrow: "Mi cuenta", title: "Pedir adelanto" },
  "/operaciones": { eyebrow: "Mi cuenta", title: "Mis operaciones" },
  "/metricas": { eyebrow: "Mi cuenta", title: "Métricas de la campaña" },
  "/perfil": { eyebrow: "Mi cuenta", title: "Perfil" },
  "/talentos": { eyebrow: "Cartera", title: "Talentos" },
  "/agencias": { eyebrow: "Cartera", title: "Agencias" },
  "/usuarios": { eyebrow: "Sistema", title: "Usuarios" },
  "/roles": { eyebrow: "Sistema", title: "Roles y perfiles de acceso" },
  "/bitacora": { eyebrow: "Sistema", title: "Bitácora de movimientos" },
  ...MARKET_TITLES,
  ...FONDEO_TITLES,
};

/** Título de la ruta; las subrutas del marketplace heredan el de su sección. */
export function tituloDe(path: string) {
  if (TITLES[path]) return TITLES[path];
  const padre = Object.keys(TITLES).filter((r) => path.startsWith(`${r}/`)).sort((a, b) => b.length - a.length)[0];
  return padre ? TITLES[padre] : undefined;
}
