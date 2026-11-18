// Parámetros de visualización del sistema. La escala categórica está validada
// para daltonismo: el peor par adyacente da ΔE 9.6 en deuteranopía y 22.8 en
// visión normal sobre superficie blanca. Los tonos se asignan en este orden
// fijo, nunca en ciclo, y nunca se recolorean al filtrar.
export const CATEGORICA = ['#0071e3', '#c2620a', '#0f9b6c', '#8b5cf6', '#d1477a'];

// Escala secuencial de un solo tono para magnitud: claro a oscuro conforme
// crece la antigüedad del saldo.
export const SECUENCIAL_AZUL = ['#a8cdf0', '#5f9ddd', '#2b6fb8', '#12457a'];

// Colores de estado, reservados: nunca se usan como "serie 4".
export const ESTADO = {
  bien: '#1f8a5b',
  alerta: '#b25e09',
  grave: '#c4322b',
  neutro: '#858585',
};

// Tinta: los textos del gráfico jamás se pintan del color de la serie.
export const TINTA = { eje: '#858585', etiqueta: '#707070', rejilla: '#e2e2e5' };

export const ejeX = { tick: { fontSize: 11, fill: TINTA.etiqueta }, axisLine: false, tickLine: false } as const;
export const ejeY = { tick: { fontSize: 10, fill: TINTA.eje }, axisLine: false, tickLine: false } as const;

export const tooltipEstilo = {
  contentStyle: { borderRadius: 8, border: '1px solid #d2d2d7', fontSize: 12, padding: '8px 10px', boxShadow: '0 4px 14px rgba(0,0,0,0.08)' },
  labelStyle: { fontSize: 11, color: TINTA.eje, marginBottom: 4 },
  cursor: { fill: 'rgba(0,0,0,0.035)' },
} as const;

export const leyendaEstilo = { fontSize: 11, paddingTop: 8 } as const;

/** Miles y millones abreviados para los ejes; el tooltip da la cifra completa. */
export const ejeMoneda = (v: number) =>
  Math.abs(v) >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : `${Math.round(v / 1000)}k`;

export const ejePiezas = (v: number) =>
  Math.abs(v) >= 1000 ? `${Math.round(v / 1000)}k` : String(v);

// Tono claro de la serie primaria para los meses proyectados (cambio 14): la
// proyección se distingue del dato real sin salirse de la escala categórica.
export const PROYECCION = '#9dc7f4';
