# CROBOTS Web

Webbversion av det klassiska 1985-programmeringsspelet CROBOTS (Tom Poindexter). Skriv robotar i en C-subset och se dem strida i ett 1000×1000 m arena.

## Utveckling

```bash
npm install
npm run dev    # startar Vite dev-server på localhost:5173
npm test       # kör headless-tester
npm run build  # produktionsbygge
```

## Arkitektur

- `src/engine/` — lexer, parser, kompilator, stack-VM, arena-fysik, intrinsics, match-scheduler. DOM-fri, fullt testbar.
- `src/components/` — React-UI: Arena (Canvas 2D), Editor (CodeMirror 6), slots, controls, scoreboard.
- `public/robots/` — exempelrobotar.

## Språk

CROBOTS-språket är en liten C-subset:
- Typer: `int`, `long` (32-bit signed)
- Kontroll: `if/else`, `while`, `return`
- Inga pekare, arrayer, float, char, struct, for-loop
- Intrinsics: `scan`, `cannon`, `drive`, `damage`, `speed`, `loc_x`, `loc_y`, `rand`, `sqrt`, `sin`, `cos`, `tan`, `atan`

## Licens

Inspirerad av Tom Poindexters CROBOTS (GPLv2). Portad implementation.
