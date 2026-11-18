import React, { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, Search } from 'lucide-react';

// Todos los selectores del sistema llevan buscador. Conserva la forma de un
// <select>: recibe <option> como hijos y avisa con onChange(e.target.value),
// así las pantallas no cambian. La lista se dibuja en un portal con posición
// fija para que no la recorte el scroll de un modal o de una tarjeta.

interface Opcion { value: string; label: string; disabled?: boolean }

interface SelectProps {
  label?: string;
  value?: string | number;
  onChange?: (e: { target: { value: string } }) => void;
  children?: React.ReactNode;
  disabled?: boolean;
  placeholder?: string;
  /** Estilo del botón. Con `bare` reemplaza por completo al de formulario. */
  className?: string;
  bare?: boolean;
  title?: string;
}

const texto = (n: React.ReactNode): string =>
  React.Children.toArray(n).map((x) =>
    typeof x === 'string' || typeof x === 'number' ? String(x)
      : React.isValidElement<{ children?: React.ReactNode }>(x) ? texto(x.props.children) : '').join('');

const leerOpciones = (children: React.ReactNode): Opcion[] =>
  React.Children.toArray(children).flatMap((c) => {
    if (!React.isValidElement<{ value?: string | number; children?: React.ReactNode; disabled?: boolean }>(c)) return [];
    if (c.type === React.Fragment) return leerOpciones(c.props.children);
    const label = texto(c.props.children);
    return [{ value: String(c.props.value ?? label), label, disabled: c.props.disabled }];
  });

const sinAcentos = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export default function Select({ label, value, onChange, children, disabled, placeholder = 'Selecciona…', className = '', bare, title }: SelectProps) {
  const id = useId();
  const opciones = useMemo(() => leerOpciones(children), [children]);
  const actual = String(value ?? '');
  const elegida = opciones.find((o) => o.value === actual);

  const [abierto, setAbierto] = useState(false);
  const [busca, setBusca] = useState('');
  const [activo, setActivo] = useState(0);
  const [pos, setPos] = useState<{ top: number; left: number; width: number; arriba: boolean } | null>(null);
  const boton = useRef<HTMLButtonElement>(null);
  const lista = useRef<HTMLDivElement>(null);
  const campo = useRef<HTMLInputElement>(null);

  const filtradas = useMemo(() => {
    const q = sinAcentos(busca.trim());
    return q ? opciones.filter((o) => o.value !== '' && sinAcentos(o.label).includes(q)) : opciones;
  }, [opciones, busca]);

  const colocar = () => {
    const r = boton.current?.getBoundingClientRect();
    if (!r) return;
    const arriba = window.innerHeight - r.bottom < 300 && r.top > window.innerHeight - r.bottom;
    setPos({ top: arriba ? r.top - 4 : r.bottom + 4, left: r.left, width: Math.max(r.width, 220), arriba });
  };

  const abrir = () => {
    if (disabled) return;
    colocar();
    setBusca('');
    setActivo(Math.max(0, opciones.findIndex((o) => o.value === actual)));
    setAbierto(true);
  };

  const elegir = (o: Opcion) => {
    if (o.disabled) return;
    setAbierto(false);
    boton.current?.focus();
    if (o.value !== actual) onChange?.({ target: { value: o.value } });
  };

  useLayoutEffect(() => { if (abierto) campo.current?.focus(); }, [abierto]);

  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!boton.current?.contains(t) && !lista.current?.contains(t)) setAbierto(false);
    };
    // Si se desplaza lo de atrás, la lista se recoloca junto al botón.
    const mover = (e: Event) => { if (!lista.current?.contains(e.target as Node)) colocar(); };
    document.addEventListener('mousedown', fuera);
    window.addEventListener('scroll', mover, true);
    window.addEventListener('resize', colocar);
    return () => {
      document.removeEventListener('mousedown', fuera);
      window.removeEventListener('scroll', mover, true);
      window.removeEventListener('resize', colocar);
    };
  }, [abierto]);

  useEffect(() => { setActivo(0); }, [busca]);

  useEffect(() => {
    lista.current?.querySelector<HTMLElement>(`[data-i="${activo}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [activo, abierto]);

  const teclas = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActivo((i) => Math.min(filtradas.length - 1, i + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActivo((i) => Math.max(0, i - 1)); }
    else if (e.key === 'Enter') { e.preventDefault(); const o = filtradas[activo]; if (o) elegir(o); }
    else if (e.key === 'Escape' || e.key === 'Tab') { e.preventDefault(); setAbierto(false); boton.current?.focus(); }
  };

  const vacio = !elegida || elegida.value === '';
  const estilo = bare
    ? className
    : `w-full border border-hairline rounded-[8px] px-3 py-2 text-[15px] bg-white focus:outline-none focus:border-blue focus:ring-2 focus:ring-blue/15 transition-all ${className}`;

  return (
    <div className={bare ? 'contents' : 'flex flex-col gap-1.5 min-w-0'}>
      {label && <label htmlFor={id} className="text-[12px] font-medium text-ash">{label}</label>}
      <button
        id={id}
        ref={boton}
        type="button"
        title={title}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={abierto}
        onClick={() => (abierto ? setAbierto(false) : abrir())}
        onKeyDown={(e) => { if (!abierto && (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); abrir(); } }}
        className={`flex items-center justify-between gap-2 text-left disabled:opacity-50 disabled:cursor-not-allowed ${estilo}`}
      >
        <span className={`truncate ${vacio ? 'text-mist' : bare ? '' : 'text-carbon'}`}>{elegida?.label || placeholder}</span>
        <ChevronDown size={bare ? 12 : 15} strokeWidth={1.8} className={`shrink-0 text-ash transition-transform ${abierto ? 'rotate-180' : ''}`} />
      </button>

      {abierto && pos && createPortal(
        <div
          ref={lista}
          role="listbox"
          onKeyDown={teclas}
          className="fixed z-[70] bg-white border border-hairline rounded-[8px] shadow-lg flex flex-col overflow-hidden"
          style={{ left: pos.left, width: pos.width, maxWidth: 'calc(100vw - 16px)', ...(pos.arriba ? { bottom: window.innerHeight - pos.top } : { top: pos.top }) }}
        >
          <div className="flex items-center gap-2 px-3 py-2 border-b border-hairline">
            <Search size={14} className="text-mist shrink-0" />
            <input
              ref={campo}
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar…"
              className="flex-1 min-w-0 text-[13px] text-carbon bg-transparent focus:outline-none placeholder:text-mist"
            />
          </div>
          <div className="max-h-60 overflow-y-auto py-1">
            {filtradas.map((o, i) => {
              const sel = o.value === actual;
              return (
                <button
                  key={`${o.value}-${i}`}
                  type="button"
                  data-i={i}
                  role="option"
                  aria-selected={sel}
                  disabled={o.disabled}
                  onMouseEnter={() => setActivo(i)}
                  onClick={() => elegir(o)}
                  className={`w-full flex items-center justify-between gap-2 px-3 py-1.5 text-left text-[13px] disabled:opacity-40 ${i === activo ? 'bg-frost' : ''} ${o.value === '' ? 'text-mist' : 'text-carbon'}`}
                >
                  <span className="truncate">{o.label}</span>
                  {sel && <Check size={13} className="text-blue-link shrink-0" />}
                </button>
              );
            })}
            {filtradas.length === 0 && <div className="px-3 py-3 text-center text-[12px] text-mist">Sin resultados.</div>}
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
