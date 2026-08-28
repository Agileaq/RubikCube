# RubikCube SPA — Design Spec

Date: 2026-08-28
Status: Approved for implementation planning

An offline-first PWA that helps a user **paint** the current state of their
physical 3×3 Rubik's Cube onto an on-screen cube, checks whether that state is
**solvable**, and then **guides them step-by-step** through solving it using the
Layer-By-Layer (LBL) beginner method. Ships with a built-in LBL **tutorial**.
Deployed to GitHub Pages, installable to the iOS Home Screen.

Architecture, versioning, and deploy tooling mirror the sibling project
`CalorieCounter`.

---

## 1. Architecture & Tech Stack

- **Stack**: React 19 + TypeScript (strict) + Vite. No 3D library — the cube is
  rendered with **CSS 3D transforms**.
- **Routing**: `HashRouter` (GitHub Pages deep-link safe).
- **Vite config** (`vite.config.ts`), copied from CalorieCounter's shape:
  - `base: '/RubikCube/'`
  - `define` block injecting `__APP_VERSION__` (from `npm_package_version`),
    `__GIT_SHA__` (from `GIT_SHA` env or `git rev-parse --short HEAD`),
    `__BUILD_TIME__` (`new Date().toISOString()`).
  - `vite-plugin-pwa` with `registerType: 'prompt'`, manifest:
    `name: "Rubik Cube"`, `short_name`, `start_url: '/RubikCube/'`,
    `scope: '/RubikCube/'`, `display: 'standalone'`, sky-blue `theme_color`,
    SVG icon + apple-touch-icon.
  - Vitest test block: `globals: true`, `environment: 'jsdom'`,
    `setupFiles: ['./src/test/setup.ts']`, `execArgv: ['--no-experimental-webstorage']`.
- **index.html**: `apple-mobile-web-app-capable`, `apple-touch-icon`,
  viewport with `viewport-fit=cover` for safe-area insets.
- **CI**: `.github/workflows/deploy.yml` identical to CalorieCounter — push to
  `main` → `npm ci` → `npm run build` (with `GIT_SHA`) → upload `dist` →
  `deploy-pages`.
- **Scripts** (`package.json`): `dev`, `build` (`tsc && vite build`), `preview`,
  `test` (`vitest run`), `test:watch`.
- **tsconfig**: copied from CalorieCounter (strict, `noUnusedLocals`,
  `noUnusedParameters`, `jsx: react-jsx`, vitest + jest-dom types).
- **BuildInfo** component: same as CalorieCounter — renders
  `v{version} · {sha} · {time}`, click-to-copy. Shown small at the bottom of the
  paint screen.

### Routes / screens

| Path        | Screen        | Notes |
|-------------|---------------|-------|
| `/`         | Paint (填色)  | cube + flip button + hint + palette |
| `/solve`    | Solve overlay | reachable only when solvable |
| `/tutorial` | 三阶魔方教程  | 8 anchor sections |

### Persistence

Schema-versioned `localStorage`, same pattern as CalorieCounter
(`storage.ts` + `migrations.ts` + `ensureSchema()`):

- Keys: `rc.paint` (the 48 non-center sticker colors), `rc.schemaVersion`.
- `CURRENT_SCHEMA_VERSION = 1`; empty `steps` ladder ready for future migrations.
- `read`/`write` JSON helpers with try/catch fallback to defaults.
- Paint state restored on load; a **重置 (reset)** action clears it.
- Malformed blobs fall back to an empty (all-`null`) paint state.

---

## 2. Cube Model & Rendering

### Data model (`src/lib/cube.ts`, `src/types.ts`)

Single source of truth: `CubeState` = 6 faces × 9 sticker slots = 54 slots.

- Faces: `U`(上) `D`(下) `L`(左) `R`(右) `F`(前) `B`(后).
- Colors: `type Color = 'W' | 'R' | 'O' | 'Y' | 'G' | 'B'`.
- A slot holds `Color | null` (`null` = unfilled).
- Sticker index 4 of each face = center; centers are fixed and never `null`.
- The 48 non-center slots start `null`.

**Fixed color convention** (real-cube opposite pairs):
White↔Yellow, Orange↔Red, Green↔Blue.

Centers are assigned so that:
- Default orientation exposes `U`=White, `L`=Orange, `R`=Green.
- Flipped orientation exposes `U`=Yellow, `L`=Blue, `R`=Red.

The flip is a **whole-cube rotation** that brings the three hidden faces
(`D`, `B`, and the opposite side) into view — it does not repaint centers. The
center assignment is chosen once so both orientations match requirements 4 & 5.
(Exact per-face center constants and the rotation axis/angle are derived during
implementation and locked by a unit test asserting the two orientations show the
required center colors.)

### Rendering (CSS 3D)

- `.scene` element: `perspective` + centered.
- `.cube` element: `transform-style: preserve-3d`; its `transform` (a `rotateY`,
  possibly plus a small `rotateX` for the corner view) is the only thing that
  changes on flip. A single CSS `transition` on that transform produces the
  smooth flip animation (iOS-native, GPU-composited).
- Each visible face = a `div` positioned by `rotateX/rotateY + translateZ`,
  containing a 3×3 CSS grid of `Sticker` divs.
- Only 3 faces need to be visible per orientation (per requirement 4); the flip
  swaps which 3 face the viewer. Hidden faces may be omitted or `backface`-hidden.

### Components

- `Cube.tsx` — renders `CubeState` at a given orientation; used by **both** the
  paint screen and the solve overlay. Props include current orientation and an
  optional per-move layer-rotation (for solve animation).
- `Sticker.tsx` — one sticker; shows its color or empty; tappable (unless center)
  to paint with the active brush.
- `FlipButton.tsx` — two arrows around an upright-cube glyph; toggles orientation
  with animation.

### Filling interaction

- Palette color tap → sets active brush (visually highlighted).
- Non-center sticker tap → paints it the active brush color; if already painted,
  repaints.
- Centers non-interactive.
- On every paint/repaint, palette remaining-counts recompute and, if all 48 are
  filled, solvability re-runs (Section 3).

### Palette (`Palette.tsx`)

Six circles in order: **Yellow, Red, Blue, White, Orange, Green** (requirement 6).
Number inside each = remaining unplaced count for that color. A solved cube has
9 of each; the center of each color is pre-placed, so each circle starts at **8**
and counts down to **0**. All zero ⇒ 48 stickers filled.

---

## 3. Solvability Validator (`src/lib/solvability.ts`, `src/lib/cubie.ts`)

Runs when all 48 stickers are filled (and re-runs on any later repaint). All
pure functions, unit-tested. A random full coloring is solvable only ~1/12 of
the time.

**`cubie.ts`** converts the facelet `CubeState` into the cubie representation
(8 corners × 3 stickers, 12 edges × 2 stickers) — the same representation the
solver consumes.

Three checks:

- **Check 0 — Color count.** Exactly 9 of each of the 6 colors.
- **Check 1 — Piece legality.** Every extracted corner is one of the 8 valid
  color-triples (each exactly once); every edge one of the 12 valid color-pairs
  (each exactly once). Catches impossible stickerings (e.g. a corner bearing an
  opposite pair like White+Yellow).
- **Check 2 — Parity / solvability invariants.** On the legal piece set:
  - corner-orientation sum ≡ 0 (mod 3)
  - edge-orientation sum ≡ 0 (mod 2)
  - corner-permutation parity == edge-permutation parity

`validate(state): { solvable: boolean; reason?: string }`.

- **Fail** → show requirement 7's message verbatim:
  > 填色状态不可解，1.先检查填色状态与手上魔方状态是否一致。2.如果魔方被转角或者拆装错了，将导致无法还原(即不可解)
- **Pass** → enable navigation to the solve overlay.

---

## 4. LBL Solver & Solve Overlay

### Solver (`src/lib/solver.ts`, `src/lib/moves.ts`)

Beginner **Layer-By-Layer** solver on the cubie representation. Deterministic,
algorithmic, no lookup tables. Produces an ordered `SolveStep[]` grouped into the
same 7 stages as the tutorial:

1. 白色十字 (white cross)
2. 白色面 + 4 个侧面 T 字 (white corners / first layer)
3. 中层棱块 (middle-layer edges)
4. 顶层黄色十字 (LL edge orientation)
5. 顶层黄色面 (LL corner orientation)
6. 顶层凹字 → mapped to LL corner permutation
7. 顶层棱块 → mapped to LL edge permutation

`moves.ts` defines `type Move` (face `U D L R F B` + direction: cw / ccw / 180,
i.e. `R`, `U'`, `F2`) and a pure `applyMove(state, move)` that mutates a copy of
the cube state. Each generated move is human-readable and maps to a tutorial step.

`SolveStep = { stage: string; moves: Move[]; note: string }`.

> **Mapping note.** Requirement 9's last-layer labels are 顶层黄色十字 → 顶层黄色面
> → 顶层凹字 → 顶层棱块. Beginner LBL last-layer is: orient edges → orient corners
> → permute corners → permute edges. These map 1:1 onto the four labels above.
> Exact caption wording aligned when building tutorial content (Section 5).

### Solve overlay (`/solve`, `Solve.tsx`, `SolveControls.tsx`)

Full-screen animated layer over the paint screen. Reachable only when
`validate().solvable`.

- Reuses the `Cube` component, showing the user's painted colors.
- Steps through `SolveStep[]`: **Prev / Next / Play** controls.
- Each move animates the affected layer rotating (CSS transition on a
  layer-group transform), then commits to `CubeState`.
- Caption: current stage name + move notation + short hint, so the user turns
  their physical cube in sync.
- Progress indicator: step N / total, stage label.
- **返回填色** button dismisses back to `/` (requirement 8: "动效层可以切换回填色页").
- Entering the overlay works on a *copy* of the paint state, so returning to
  paint preserves the user's original filled cube.

---

## 5. Tutorial, Visual Design, File Structure

### Tutorial (`/tutorial`, `Tutorial.tsx`, `TutorialSection.tsx`, `src/data/tutorial.ts`)

Title: **三阶魔方教程**. Entered via the book-icon button (right-aligned on the
"填色" header row). One scrollable page with a **sticky top tab-bar** of 8 anchors;
tapping a tab scrolls to its section.

0. **魔方结构** — centers / edges / corners; notation (U D L R F B; prime =
   逆时针; 2 = 180°); fixed color pairs.
1. **对好白色十字**
2. **复原白色面和 4 个侧面 T 字**
3. **复原 4 个中层棱块**
4. **对好顶层黄色十字**
5. **复原顶层黄色面**
6. **复原顶层凹字**
7. **复原顶层棱块**

Each section = 中文说明 + 转法符号 (e.g. `R U R' U'`) + a static CSS/SVG diagram
of the pattern/target. Content lives in typed `src/data/tutorial.ts`
(`TutorialSection[]`) — easy to edit, testable (a test asserts 8 sections with
the required anchors/titles).

### Visual design (all screens)

- **Background**: 高级天空蓝 (premium sky blue) with a gradient that is **bluer
  toward the edges** — a radial gradient softer/lighter in the center, deeper
  sky-blue at the frame. Applied at the app root.
- **Paint screen layout**, top → bottom:
  1. Header row: **填色** centered; **book icon** button right-aligned.
  2. Cube, centered.
  3. Flip button (two arrows around an upright-cube glyph).
  4. Hint line: **请根据手上魔方各面颜色对图中魔方进行填色**.
  5. Six palette circles.
  6. Small `BuildInfo` at the very bottom.
- **Top word "填色"** doubles as the requirement-2 prompt that the user should
  paint first.
- iOS-native feel: rounded corners, `env(safe-area-inset-*)` padding for
  standalone Home-Screen mode, tap targets ≥ 44px.

### File structure

```
src/
  main.tsx          # ReactDOM root, imports styles + AppProvider
  App.tsx           # HashRouter + routes
  styles.css        # hand-written; sky-blue gradient, cube CSS, layout
  types.ts          # Color, Face, CubeState, Move, SolveStep, TutorialSection
  test/setup.ts     # jest-dom + jsdom setup
  routes/
    Paint.tsx        Solve.tsx        Tutorial.tsx
  components/
    Cube.tsx         Sticker.tsx      Palette.tsx       FlipButton.tsx
    SolveControls.tsx  TutorialSection.tsx  BuildInfo.tsx
  lib/
    cube.ts          # CubeState, centers, empty state, helpers
    cubie.ts         # facelet <-> cubie conversion
    solvability.ts   # 3 validity checks
    solver.ts        # LBL solver -> SolveStep[]
    moves.ts         # Move type, applyMove
    storage.ts       # load/save paint state, ensureSchema
    migrations.ts    # migrate() ladder, CURRENT_SCHEMA_VERSION
  data/
    tutorial.ts      # TutorialSection[]
  state/
    AppContext.tsx   # paint state, brush, orientation, solvability
    useApp.ts        # hook
```

---

## Testing strategy

Pure logic carries the coverage (no DOM needed):

- `cube.test.ts` — empty state has 48 nulls + 6 fixed centers; both orientations
  expose the required center colors (locks requirements 4 & 5).
- `cubie.test.ts` — facelet↔cubie round-trips a solved cube and known scrambles.
- `solvability.test.ts` — solved cube passes; known-unsolvable colorings fail
  each of the three checks (twisted corner, flipped edge, swapped pair, bad
  color count, illegal piece).
- `solver.test.ts` — for many random *solvable* scrambles, applying the emitted
  moves yields the solved cube; steps are grouped into the 7 stages.
- `moves.test.ts` — `applyMove` correctness (e.g. `R R R R` = identity, `R R'`
  = identity).
- `storage.test.ts` / `migrations.test.ts` — persistence + migration ladder.
- `tutorial.test.ts` — exactly 8 sections with the required anchors/titles.
- Light component tests (Palette counts decrement, unsolvable message renders,
  flip toggles orientation).

## Out of scope (YAGNI)

- Kociemba / optimal solver (LBL only).
- Free-drag 3D rotation (only the scripted flip).
- Playable animated mini-cubes in the tutorial (static diagrams only).
- Multi-language i18n (Chinese UI only).
- Cloud sync / accounts (device-local only).
