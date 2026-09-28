# Base44 dev environment

This repo is a web visualization of the MQL5 "Inversion Fair Value Gaps" indicator.
The original indicator logic (FVG detection -> inversion -> bounce signals) is ported
to TypeScript in `src/engine/ifvgEngine.ts`; the chart is rendered on an HTML canvas.

## Stack
- Vite + React + TypeScript (no backend, no database, no external credentials).
- Dev server runs on port 5173 inside the container, mapped to host port 3000.

## Run
```
docker compose -f docker-compose.base44.yml up -d --build
```
Verify: `docker compose -f docker-compose.base44.yml ps` and open the preview.
The served page is live source (Vite dev server with HMR), so edits appear without rebuilds.

## Key files
- `src/engine/ifvgEngine.ts` — faithful port of the MQL5 engine (bar-close, no repaint).
- `src/data/sampleData.ts` — seeded synthetic OHLC generator (no broker needed).
- `src/components/FvgChart.tsx` — canvas candlestick chart with zones, midlines, signals; wheel to zoom, drag to pan.
- `src/components/Controls.tsx` — inputs mirroring the MQL5 indicator parameters.
