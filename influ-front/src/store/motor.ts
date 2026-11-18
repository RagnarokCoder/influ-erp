import { useEffect } from 'react';
import { useInflu } from './useInflu';
import { tocaReenvio } from '../lib/derive';
import { ahora } from '../lib/format';

/**
 * Lo que en producción corre en el servidor: la IA lee el contrato página por
 * página y, sin acuse de la cesión a las 48 h, se reenvía sola. En el demo
 * corre mientras el panel está abierto.
 */
export function useMotorSimulado() {
  useEffect(() => {
    const lectura = setInterval(() => {
      const s = useInflu.getState();
      s.operaciones.filter((o) => o.analisis.estado === 'En curso').forEach((o) => s.avanzarAnalisis(o.id));
    }, 650);
    const reenvios = () => {
      const s = useInflu.getState();
      const fh = ahora().fechaHora;
      s.operaciones.filter((o) => tocaReenvio(o, fh)).forEach((o) => s.reenviarCesion(o.id, true));
    };
    reenvios();
    const cada = setInterval(reenvios, 60_000);
    return () => { clearInterval(lectura); clearInterval(cada); };
  }, []);
}
