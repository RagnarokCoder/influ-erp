import { Wallet, PiggyBank, Coins, CalendarClock, Bell, FileText, type LucideIcon } from 'lucide-react';
import type { RolUsuario } from '../data/types';

// M9 · Navegación y títulos del panel de fondeadores. Archivo ligero (solo
// iconos y textos) para que el sidebar, el header y los permisos no arrastren
// las pantallas del módulo.
export interface ItemFondeo { to: string; label: string; icon: LucideIcon }

export const FONDEO_NAV: { group: string; roles: RolUsuario[]; items: ItemFondeo[] } = {
  group: 'Fondeo',
  roles: ['Fondeador'],
  items: [
    { to: '/fondeo/resumen', label: 'Resumen', icon: Wallet },
    { to: '/fondeo/asignacion', label: 'Asignación', icon: PiggyBank },
    { to: '/fondeo/operaciones', label: 'Operaciones', icon: Coins },
    { to: '/fondeo/flujos', label: 'Flujos', icon: CalendarClock },
    { to: '/fondeo/notificaciones', label: 'Notificaciones', icon: Bell },
    { to: '/fondeo/documentos', label: 'Documentos', icon: FileText },
  ],
};

export const FONDEO_TITLES: Record<string, { eyebrow: string; title: string }> = {
  '/fondeo/resumen': { eyebrow: 'Panel de fondeadores', title: 'Resumen' },
  '/fondeo/asignacion': { eyebrow: 'Panel de fondeadores', title: 'Asignación de capital' },
  '/fondeo/operaciones': { eyebrow: 'Panel de fondeadores', title: 'Operaciones fondeadas' },
  '/fondeo/flujos': { eyebrow: 'Panel de fondeadores', title: 'Flujos de capital' },
  '/fondeo/notificaciones': { eyebrow: 'Panel de fondeadores', title: 'Notificaciones' },
  '/fondeo/documentos': { eyebrow: 'Panel de fondeadores', title: 'Documentos' },
};
