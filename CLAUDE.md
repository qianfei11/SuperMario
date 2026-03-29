# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Browser-based 2D Super Mario platformer with procedurally generated levels. Built with vanilla JavaScript and HTML5 Canvas. No frameworks, no build system, no external dependencies.

## Running the Game

Open `index.html` in a browser, or use a local server to avoid CORS issues:
```bash
python -m http.server 8000
# or: npx http-server
```

There are no build steps, tests, or linting configured.

## Architecture

The game is two files: `index.html` (canvas + styling) and `game.js` (all logic, ~680 lines, wrapped in an IIFE).

### game.js Structure

- **Config constants**: tile size (32px), canvas (800x480), physics (gravity, jump, speed), ground Y position
- **Input system**: Single keydown/keyup listener pair + touch state object. Never duplicated across init calls.
- **Audio**: Procedural sound via Web Audio API oscillators. `sfx(name)` plays named effects (jump, coin, stomp, die, clear, bump).
- **Sprite drawing**: All rendering is canvas primitives (fillRect, arc, path). No SVG/image files used at runtime. Functions: `drawMario`, `drawGoomba`, `drawCoinSprite`, `drawBrick`, `drawQBlock`, `drawGroundTile`, `drawPipe`, `drawFlagPole`, `drawCloud`, `drawHill`.
- **Particles**: `Particle` (physics-based dots) and `FloatText` (score popups). `burst()` spawns particle clusters.
- **Level generation**: `generateLevel(num)` produces ground segments, floating platforms (brick/question), pipes, coins, enemies, and decorations. Difficulty scales with level number (gap frequency, enemy count). All gaps are jumpable; platforms are reachable.
- **Classes**:
  - `Player` — acceleration-based movement, double jump, collision with ground/platforms/pipes, flag-pole sequence, death bounce
  - `Goomba` — patrol AI with edge/wall detection, stompable
  - `CoinEntity` — floating collectible with spin animation
- **Game state** (`G` object): single state machine (`menu` | `playing` | `gameOver` | `levelComplete`), camera position, score, lives, timer
- **Camera**: smooth lerp following player, clamped to level bounds
- **Collision**: ground/platforms use one-way (top-landing + head-bump); pipes use previous-position detection with min-overlap fallback
- **Game loop**: fixed-timestep (60fps) via `requestAnimationFrame` with accumulator
- **Touch controls**: created once on mobile, never duplicated

### Key design decisions

- **No SVG sprites**: Original SVG sprite sheets were broken (viewBox clipped all frames to first). All sprites are drawn with canvas primitives instead.
- **One-way platforms**: Player passes through platforms from below and sides, lands only from above. Prevents corner-case collision bugs.
- **Procedural levels**: Each level is randomly generated with difficulty scaling. No hardcoded level data.
- **IIFE**: All code wrapped in immediately-invoked function to avoid global namespace pollution.

### Controls

- Keyboard: Arrow keys or WASD to move, Space/Up to jump, double-tap jump mid-air
- Touch: On-screen buttons for mobile
- Game: Space/Enter to start, restart, or advance levels

### Legacy files

`mario_idle.svg`, `mario_run.svg`, `mario_jump.svg`, `mario.svg`, `enemy.svg` — no longer referenced by the game. All rendering is canvas-based.
