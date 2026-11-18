# Influ · Demo funcional

Adelanto de pago para colaboraciones de influencers (factoraje, **Fase 1**) y marketplace de
creadores (**Fase 2**). Influ adelanta el 80% del monto base de la factura (CFDI) que el talento
o su agencia le emitió a una marca, notifica la cesión a la marca, cobra la factura completa al
vencimiento y liquida el 20% restante descontando su comisión (9% fijo + 1.5% mensual sobre lo
adelantado).

Demo navegable sin backend, alineada con la especificación del **22 oct 2026** (MVP Fase 1, 26
pantallas) y con el MVP Fase 2 (18 pantallas, en `src/market`). Datos realistas con el caso tipo
de los documentos (Valeria Martínez · Stay On Social · Porsche · $80,000 a 60 días), reglas del
negocio en cada acción, cinco perfiles, alertas, bitácora inalterable y tablero de Dirección.
Análisis completo en [ANALISIS.md](ANALISIS.md) (sección 0 = cambios del 22 oct).

## Stack

React 19 · TypeScript · Vite 7 · Tailwind v4 (tokens en `src/index.css`) · Zustand con
`persist` (todo el estado en `localStorage`, llave `influ`) · React Router 7 · lucide-react ·
Recharts. Sin backend; funciona sin internet una vez cargado. Fase 2 en `src/market` (store propio `influ-market`).

## Cómo correrlo

```bash
npm install        # la primera vez
npm run dev        # http://localhost:5173
npm run build      # compila a dist/ (tsc -b + vite build)
npm run preview    # sirve dist/
```

- **Fecha fija del demo: lunes 26 de octubre de 2026** (`HOY_ISO` en `src/data/constantes.ts`).
  La hora es la del reloj real.
- Entra con los **accesos de demo** del login (un clic por perfil) o con cualquier correo de la
  lista y la contraseña `demo`. El menú del usuario tiene "Ver el sistema como…".
- El botón ⟳ del encabezado reinicia el demo (Fase 1 y marketplace) a la semilla.
- El estado vive en `localStorage` (`influ` y `influ-market`); al cambiar la forma de los datos se sube la versión y se reinicia solo.

| Perfil | Usuario de demo | Entra a |
|---|---|---|
| Dirección General | Mauricio Leal Treviño · direccion@influ.mx | Tablero |
| Equipo interno | Sofía Cantú · operaciones@influ.mx · Rodrigo Elizondo · riesgos@influ.mx · Lucas Tamez · lucas@influ.mx | Solicitudes |
| Agencia | Ana López (Stay On Social) · Luis Garza (Paragon Talent) · Daniela Vázquez (Le Reve, en revisión) | Resumen |
| Talento | Valeria Martínez (caso tipo) · Diego Ramírez · Bruno Salas (independiente) · Sofía Lara (observada en #0182) · Martín Vega (cuenta en revisión) · Paula Núñez (cuenta observada) y más | Inicio |
| Marca (Fase 2) | Andrea Ríos (admin, aprueba contenido) · Tomás Gómez (legal, comenta) · Finanzas Porsche (aprueba ofertas) | Marketplace |
| Suspendidos (no entran) | jmedina@influ.mx · regina.cmora@gmail.com · marco@kolectivo.mx | — |

## Recorrido sugerido para la presentación (Fase 1)

1. **Lucas** (equipo) abre **Registros**: Martín Vega, Jorge Torres y Le Reve esperan preaprobación con sus chequeos (RFC/CURP, 69-B, CLABE, handles). Preaprueba a Martín; Paula está observada (su RFC y su CURP no coinciden).
2. **Ana** (Stay On Social) aprueba a Martín en **Mis talentos**: ya puede pedir adelantos.
3. **Valeria** pide un adelanto: marca del catálogo con el área de pagos precargada, entregables, CFDI XML + PDF y contrato. Ve la validación del SAT y a la IA leyendo el contrato página por página.
4. **Sofía** y **Rodrigo** votan en **Revisión** con la ficha de la IA (citas a cláusula y página). Prueba #0188 (el contrato ampara $59,000: rojo, no se aprueba), #0187 (plazo 120 vs 90 días, confidencialidad y garantía previa en el RUG: hay que confirmar) y #0182 (prohíbe ceder el cobro: observada hasta que llegue el consentimiento de L'Bel).
5. **Valeria** firma con DocuSign: sale sola la notificación de la cesión a pagos@porsche-mx.com y el RUG queda en cola. En **Notificaciones de cesión** se simula el acuse; en **RUG** se sube la boleta y la IA lee el folio.
6. **Valeria** pega los links de sus reels y las capturas de sus stories: verificación automática, sugerencia "completa" y métricas en **Métricas**.
7. **Lucas** prepara la orden en **Pagos**; él no puede autorizarla (doble control): **Sofía** la autoriza y sube el CEP. Sale el WhatsApp a Valeria y a Stay On Social (preferencia "A ambos").
8. En **Pagos · Cobranza** se registra el pago de la marca; la liquidación del 20% (neta de 9% + 1.5% mensual sobre lo adelantado) pasa por el mismo doble control y la operación se cierra; el RUG queda por cancelar.
9. **Mauricio** revisa el **Tablero** con los criterios de éxito del piloto, la **Ficha de marca** de Porsche (plazo pactado contra real) y la **Bitácora**.
10. Marketplace: entra como **Andrea Ríos** (Porsche) y sigue el recorrido de `src/market/README.md`.

## Qué está implementado

| Panel | Módulos |
|---|---|
| Público | Landing sin tasas, selector de registro, registro de talento (perfil de creador, fecha de nacimiento del RFC, consentimientos versionados) y de agencia (preferencia de aviso de pago) |
| Talento | Inicio, Pedir adelanto (3 pasos), Mis operaciones (validación, análisis IA, firma, evidencia con links, pago liberado, seguimiento, liquidación), Métricas, Perfil (corrige y reenvía si está observada), Notificaciones |
| Agencia | Resumen, Mis talentos (aprobar representación, detalle), Pedir adelanto (selección de talento), Adelantos, Métricas, Configuración (aviso de pago por WhatsApp) |
| Panel interno | Registros (preaprobación), Solicitudes (cola + tablero), Revisión (ficha IA, RUG previo, aprobación colectiva), RUG, Notificaciones de cesión, Pagos (doble control, CEP, cobranza y conciliación), Marcas (ficha + empresas), Alertas, Talentos, Agencias |
| Dirección | Tablero (KPIs, criterios del piloto día 90), Usuarios (incluye usuarios de marca), Roles, Bitácora |
| Marketplace (Fase 2) | Marca, creador, agencia y equipo Influ: ver `src/market/README.md` |

Reglas, decisiones provisionales y lo que queda fuera: [ANALISIS.md §0](ANALISIS.md).
Las integraciones (PAC, IA, proveedor de datos públicos, DocuSign, RUG, SPEI, WhatsApp, email) están
simuladas con sus reglas y resultados; la conexión real es la siguiente etapa.

## Adaptaciones de los specs (anotadas, sin cambiar layouts)

- **Componentes**: se tomaron de Tante (son los de PIBSA con las correcciones de login,
  `DataModule` y `Cartera`). Correcciones propias: `Input` asocia la etiqueta con el campo;
  la base de `index.css` va en `@layer base` para que `text-blue-link` pinte los enlaces.
- **Color**: se conserva el azul del design system; el verde de marca de Influ chocaría con el verde de estado.
- **Solicitudes** (solicitudes.md): etapas En revisión · Por firmar · Evidencia y RUG · Adelanto
  liberado; la revisión usa el patrón de validación de pedidos.md (tabla CFDI vs contrato +
  casilla); "Nueva solicitud" lleva a Pedir adelanto (la captura es del talento o la agencia).
- **Sin módulos de cuentas por cobrar ni por pagar** (decisión del cliente, 29 sep): los pasos 12 y 13
  se registran en el kanban de Solicitudes, que pasó de 4 a 5 columnas ("Esperando a la marca" y
  "Por liquidar"). Los datos siguen existiendo por dentro (factura por cobrar a la marca y remanente
  bloqueado hasta su pago) y alimentan el tablero y las alertas.
- **Catálogos** (clientes.md): talentos y agencias sin "Nuevo" (nacen en el registro); agencias
  agrega la columna CLABE; marcas cambia Contacto por Razón social (se coteja con el contrato).
- **Usuarios**: dos columnas de relación (talento, agencia) que definen la cartera visible.
- **Tablero**: equivalencias del giro en [ANALISIS.md §g](ANALISIS.md); la gráfica de tiempo de cobro usa 60 días para tener suficientes operaciones.
- **Checklist que no aplica**: "perfiles sin importes" (los cuatro perfiles ven dinero; no se inventan perfiles).

## Siguiente etapa (no se dibujó)

- **Score de riesgo automático**: fuera del alcance del MVP (§13); la información de cada operación ya queda estructurada.
- Conexión real con el PAC (SW Sapien o Facturama), la IA con acuerdo de datos, el proveedor de datos públicos (Phyllo u otro), DocuSign, Twilio, el email transaccional y la banca en línea.
- **Reportes** y **Configuración** del panel interno (condiciones comerciales editables), **Ayuda** del portal.
- Tesorería / fondeo: cuánto hay disponible para nuevos adelantos.
- Cobro del saldo a cargo cuando la comisión supera lo retenido; descarga real del comprobante.

## Publicación

No está publicado. `firebase.json` está listo para Firebase Hosting, pero falta elegir el
proyecto (`.firebaserc`) y confirmar el deploy.
