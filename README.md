# CROBOTS Web

A web version of the classic 1985 programming game CROBOTS (Tom Poindexter). Write robots in a C subset and watch them fight in a 1000×1000 m arena.

## Development

```bash
npm install
npm run dev    # starts the Vite dev server at localhost:5173
npm test       # runs headless tests
npm run build  # production build
```

## Architecture

- `src/engine/` — lexer, parser, compiler, stack VM, arena physics, intrinsics, match scheduler. DOM-free, fully testable.
- `src/components/` — React UI: Arena (Canvas 2D), Editor (CodeMirror 6), slots, controls, scoreboard.
- `public/robots/` — example robots.

## Language

The CROBOTS language is a small C subset:
- Types: `int`, `long` (32-bit signed)
- Control flow: `if/else`, `while`, `return`
- No pointers, arrays, float, char, struct, for-loop
- Intrinsics: `scan`, `cannon`, `drive`, `damage`, `speed`, `loc_x`, `loc_y`, `rand`, `sqrt`, `sin`, `cos`, `tan`, `atan`

## License

Inspired by Tom Poindexter's CROBOTS (GPLv2). Ported implementation.
