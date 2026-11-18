# Fase 2 · Marketplace

MVP Fase 2 (29 sep 2026): la marca encuentra, contrata, aprueba, mide y paga creadores con Influ
como único proveedor; el creador cobra en cuanto la marca aprueba su contenido. Vive en `src/market`
y se apoya en el núcleo de Fase 1 (talentos, agencias, empresas, marcas y usuarios se leen de `useInflu`).

## Archivos

| Archivo | Qué tiene |
|---|---|
| `rutas.ts` | Menú (`MARKET_NAV`), títulos y rutas por perfil. No importa pantallas ni store (lo lee `lib/permisos.ts`) |
| `index.tsx` | `MarketRoutes` (montado en `/mk/*`) y `MARKET_PUBLICAS` (`/propuesta/:token`, `/hilo/:token`, `/invitacion/:token`) |
| `types.ts` | Cuenta de marca, creador, brief, ranking, postulación, conversación, oferta versionada, contratación, entrega, snapshots, factura, propuesta, caso |
| `logic.ts` | Motores simulados: briefing (texto → brief), matching (score 0–100 con componentes y explicación), guía de precio, condiciones aceptables, protección del canal, revisión de contenido, KPIs y costos, validación del CFDI a Influ |
| `seed.ts` | Caso tipo: Porsche · Campaña Q1 |
| `useMarket.ts` | Store persistido (`influ-market`) con todas las reglas; se reinicia con el evento `influ:reiniciar` |
| `screens/*` | Marca, creador, agencia, equipo y pantallas públicas |

## Rutas por perfil

- **Marca**: `/mk/marca/{campanas, briefs, briefs/nuevo, briefs/:id, creadores, creadores/:id, mensajes, mensajes/:id, contenidos, contenidos/:id, kpis, pagos, equipo}`
- **Talento (creador)**: `/mk/creador/{oportunidades, oportunidades/:id, postulaciones, mensajes, entregas, entregas/:id, cobros, metricas, redes}`
- **Agencia**: `/mk/agencia/{roster, postulaciones, ofertas, ofertas/:id, cobros}`
- **Equipo interno**: `/mk/equipo/{resumen, matching, propuestas, marcas, pagos, moderacion}`
- **Dirección General**: todo; los perfiles internos ven los paneles de marca, creador y agencia con "ver como" (solo lectura).
- **Sin cuenta**: `/invitacion/:token` (alta de la marca), `/propuesta/:token` (venta directa), `/hilo/:token` (participante en copia).

## Recorrido sugerido

1. **Andrea Ríos** (marca Porsche · Admin + Aprueba contenido): Contenidos → reel de @valeria.moda → **Aprobar y liberar pago**: salen $80,000 a Stay On Social en automático.
2. Andrea: Briefs → Nuevo brief → "Usar texto de ejemplo" → **Generar brief** → edita → **Publicar** (queda en revisión del matching).
3. **Lucas Tamez** (equipo): Marketplace · Equipo → Matching → elige el ranking → **Distribuir**.
4. **Sofía Lara** (@sofi.city, independiente): Oportunidades → el brief → **Enviar a la marca**.
5. Andrea abre el **Chat**, suma a legal en copia, envía oferta (si queda bajo las tarifas mínimas se marca); Sofía contraoferta; **Finanzas Porsche** (Aprueba ofertas) acepta. Andrea no puede aceptar: no tiene el permiso.
6. Firman ambos el acuerdo; Sofía entrega con el chequeo de la IA; Andrea pide cambios o aprueba. Sin CFDI de Sofía a Influ el pago queda **retenido**; al validarlo, sale solo.
7. Sofía: "Ya publiqué" → publicación detectada y verificada → KPIs; ambos se califican y el ciclo se cierra.
8. Lucas: Propuestas → Porsche · Cayenne → **Enviar link** → abrir `/propuesta/porsche-cayenne` → aceptar: se convierte en ofertas.
9. **Ana López** (Stay On Social): Postulaciones → confirma la de Camila, revisa la de Lucía (licencia mayor a la aceptada); Cobros → firma acuerdos y valida su CFDI.

## Reglas en el store

Redes asociadas obligatorias para postularse · el talento representado se postula y contraoferta a través de su
agencia · la marca solo actúa con el permiso que le asigna su administrador (Admin, Aprueba ofertas, Aprueba contenido,
Comenta) · ofertas versionadas que vencen a los 7 días y se marcan fuera de las condiciones del talento · protección del
canal hasta aceptar · límite de crédito por marca con plazo, prepago por defecto · pago automático al aprobar solo con
acuerdo firmado, pago o plazo de la marca y CFDI validado · rondas de cambios pactadas · publicación no detectada en
fecha → caso de incumplimiento y registro en el historial · revisión del ranking completa hasta 80% de aceptación sin
cambios, luego por muestreo (1 de cada 5) · bitácora inmutable.

## Decisiones provisionales

- Fee de Influ 12% (pantallas). Motores de IA, OAuth de redes, SPEI vía API (STP/Kapital), firma electrónica y emails:
  simulados con reglas deterministas.
- Las métricas avanzan con la fecha fija del demo: una publicación nueva arranca en el día 0.
- Usuarios que se dan de alta por la invitación pública quedan en el equipo de la cuenta, pero no tienen login en el
  demo (los usuarios de marca que entran son los del núcleo: Andrea Ríos, Tomás Gómez y Finanzas Porsche).
- Las fechas del caso tipo son relativas a la fecha del demo, no las de febrero 2027 de las pantallas.
