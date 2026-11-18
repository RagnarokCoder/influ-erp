import { useState } from 'react';

/**
 * Arrastrar y soltar con el API nativo del navegador: no hay librería de por
 * medio. Devuelve los props que van en la tarjeta y los de la columna.
 *
 * La tarjeta sigue teniendo su botón de avanzar: en el piso se opera con
 * escáner y dedo, y arrastrar con el dedo en una tabla no siempre sale.
 */
export function useArrastre<T extends string>(mover: (id: string, destino: T) => void) {
  const [arrastrando, setArrastrando] = useState<string | null>(null);
  const [encima, setEncima] = useState<T | null>(null);

  const tarjeta = (id: string) => ({
    draggable: true,
    onDragStart: (e: React.DragEvent) => {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', id);
      setArrastrando(id);
    },
    onDragEnd: () => { setArrastrando(null); setEncima(null); },
  });

  const columna = (destino: T) => ({
    onDragOver: (e: React.DragEvent) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      if (encima !== destino) setEncima(destino);
    },
    onDragLeave: (e: React.DragEvent) => {
      // Sólo cuando el puntero sale de la columna completa, no al pasar de una
      // tarjeta a otra dentro de ella.
      if (!e.currentTarget.contains(e.relatedTarget as Node)) setEncima(null);
    },
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      const id = e.dataTransfer.getData('text/plain');
      setArrastrando(null);
      setEncima(null);
      if (id) mover(id, destino);
    },
  });

  return { arrastrando, encima, tarjeta, columna };
}
