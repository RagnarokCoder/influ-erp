# Influ ERP

Adelanto de pagos (factoraje) para colaboraciones de influencers. Monorepo del maquetado funcional
del piloto con la agencia **Stay On Social**.

## Paquetes

- **`influ-front/`** — Aplicación principal (React + TypeScript + Vite). Tres paneles: agencia,
  interno (Influ) y fondeadores. Datos de demo en memoria (Zustand), sin backend. Ver
  [`influ-front/README.md`](influ-front/README.md) y [`influ-front/ANALISIS.md`](influ-front/ANALISIS.md).
- **`influ-landing/`** — Landing estática (Firebase Hosting).

## Cómo correr el front

```bash
cd influ-front
npm install
npm run dev      # servidor de desarrollo
npm run build    # tsc + vite build
```

Acceso de demo (contraseña `demo`): `ana@stayonsocial.mx` (agencia), `ricardo@fondeador.mx`
(fondeador), `direccion@influ.mx` (dirección). Se puede cambiar de perfil desde "Ver el sistema como".

## Piloto Stay On Social

Incluye los 10 cambios del piloto (M1–M10): portal del talento apagado, panel de agencia con roster
de 27 talentos, pedir adelanto en 4 pasos (M6) y panel de fondeadores (M9).

Documentación de producto e ingeniería: PRD y especificación para backend (documentos vivos aparte).
