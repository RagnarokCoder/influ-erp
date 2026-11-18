import React from 'react';
import { AlertTriangle } from 'lucide-react';
import Button from './Button';

interface Props { children: React.ReactNode }
interface State { error: Error | null }

/**
 * La demo guarda su estado en el navegador. Si ese estado quedó con una forma
 * vieja tras un cambio de modelo, la pantalla que lo lee truena y el usuario
 * ve un marco en blanco sin saber qué pasó. Esto lo convierte en un mensaje
 * con salida: reiniciar la demo a la semilla.
 */
export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  reiniciar = () => {
    try { localStorage.removeItem('influ'); } catch { /* sin almacenamiento */ }
    window.location.reload();
  };

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="flex items-center justify-center h-full px-6 py-16">
        <div className="max-w-110 text-center flex flex-col items-center gap-3">
          <span className="p-2.5 rounded-full bg-danger-wash">
            <AlertTriangle size={20} className="text-danger" strokeWidth={1.8} />
          </span>
          <div className="text-[17px] font-semibold text-carbon">Esta pantalla no pudo abrirse</div>
          <div className="text-[13px] text-ash leading-snug">
            Lo más probable es que los datos guardados en este navegador vengan de una
            versión anterior de la demo. Reiniciar la demo los vuelve a dejar en la semilla.
          </div>
          <code className="text-[11px] text-mist font-mono bg-frost border border-hairline rounded px-2 py-1 max-w-full truncate">
            {this.state.error.message}
          </code>
          <div className="flex gap-2 mt-1">
            <Button onClick={this.reiniciar}>Reiniciar demo</Button>
            <Button variant="ghost" onClick={() => this.setState({ error: null })}>Reintentar</Button>
          </div>
        </div>
      </div>
    );
  }
}
