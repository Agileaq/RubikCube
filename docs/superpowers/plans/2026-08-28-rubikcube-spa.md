# RubikCube SPA Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** An offline-first PWA that lets a user paint their physical 3×3 cube's state on-screen, checks solvability, and guides them through an LBL solve, with a built-in LBL tutorial — deployed to GitHub Pages, installable on iOS.

**Architecture:** React 19 + TypeScript + Vite SPA with `HashRouter`. The cube is a pure `CubeState` (54 facelets) rendered with CSS 3D transforms. Pure-logic libs (`cube`, `moves`, `cubie`, `solvability`, `solver`) are fully unit-tested and DOM-free; React components render state and dispatch through a context. Persistence and deploy tooling mirror the sibling `CalorieCounter` project.

**Tech Stack:** React 19, TypeScript (strict), Vite 8, Vitest 4 + Testing Library, vite-plugin-pwa, react-router-dom 7.

**Spec:** `docs/superpowers/specs/2026-08-28-rubikcube-spa-design.md`

## Global Constraints

- Node 20 in CI; local dev on installed Node (25.x present).
- `base: '/RubikCube/'`; PWA `start_url`/`scope` = `/RubikCube/`; `display: standalone`.
- Version display via `__APP_VERSION__` / `__GIT_SHA__` / `__BUILD_TIME__` injected in `vite.config.ts` `define`.
- Colors are the union `'W' | 'R' | 'O' | 'Y' | 'G' | 'B'`. Fixed opposite pairs: W↔Y, O↔R, G↔B.
- Faces: `U D L R F B`. Center is sticker index 4 of each face and is never `null`.
- Default orientation exposes centers U=W, L=O, R=G; flipped orientation exposes U=Y, L=B, R=R (requirements 4 & 5).
- Palette order: Yellow, Red, Blue, White, Orange, Green; each remaining-count starts at 8, floors at 0.
- Unsolvable message, verbatim: `填色状态不可解，1.先检查填色状态与手上魔方状态是否一致。2.如果魔方被转角或者拆装错了，将导致无法还原(即不可解)`
- Tutorial title: `三阶魔方教程`; exactly 8 anchor sections in the order given in the spec.
- Hint line, verbatim: `请根据手上魔方各面颜色对图中魔方进行填色`
- Top prompt word, verbatim: `填色`
- TypeScript strict; `noUnusedLocals`/`noUnusedParameters` on. Chinese-only UI. Device-local only (no network).

---

## File Structure

```
package.json, tsconfig.json, tsconfig.node.json, vite.config.ts, index.html, README.md, .gitignore
.github/workflows/deploy.yml
public/icons/icon.svg, public/icons/apple-touch-icon.png
src/
  main.tsx            # ReactDOM root
  App.tsx             # HashRouter + routes
  styles.css          # sky-blue gradient, cube CSS, layout
  types.ts            # Color, Face, CubeState, Move, SolveStep, TutorialSection, Orientation
  vite-env.d.ts       # __APP_VERSION__ etc. + vite/client
  test/setup.ts       # jest-dom import
  lib/
    cube.ts           # centers, emptyCube, facelet helpers, counts
    moves.ts          # Move type, applyMove
    cubie.ts          # facelet -> cubie (corners/edges + orientation)
    solvability.ts    # validate(): 3 checks
    solver.ts         # solve(): SolveStep[]
    storage.ts        # load/save paint, ensureSchema
    migrations.ts     # migrate ladder
  state/
    AppContext.tsx    # paint state, brush, orientation
    useApp.ts         # hook
  components/
    Cube.tsx  Sticker.tsx  Palette.tsx  FlipButton.tsx
    SolveControls.tsx  TutorialSection.tsx  BuildInfo.tsx
  routes/
    Paint.tsx  Solve.tsx  Tutorial.tsx
  data/
    tutorial.ts
```

---

### Task 1: Project scaffold, tooling, CI

**Files:**
- Create: `package.json`, `tsconfig.json`, `tsconfig.node.json`, `vite.config.ts`, `index.html`, `.gitignore`, `README.md`, `src/main.tsx`, `src/App.tsx`, `src/styles.css`, `src/vite-env.d.ts`, `src/test/setup.ts`, `.github/workflows/deploy.yml`
- Create: `public/icons/icon.svg`

**Interfaces:**
- Consumes: nothing.
- Produces: a buildable/testable app shell. `App` renders a `HashRouter`. Global build constants `__APP_VERSION__`, `__GIT_SHA__`, `__BUILD_TIME__` typed in `vite-env.d.ts`.

- [ ] **Step 1: Initialize git and .gitignore**

```bash
cd /Users/arc/Desktop/AIProjects/SPAs/RubikCube
git init
```

Create `.gitignore`:
```
node_modules
dist
dist-ssr
*.local
.DS_Store
.vscode/*
!.vscode/extensions.json
```

- [ ] **Step 2: Write `package.json`**

```json
{
  "name": "rubik-cube",
  "version": "0.1.0",
  "scripts": {
    "test": "vitest run",
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test:watch": "vitest"
  },
  "type": "module",
  "private": true,
  "dependencies": {
    "react": "^19.2.8",
    "react-dom": "^19.2.8",
    "react-router-dom": "^7.18.2"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^7.0.1",
    "@testing-library/react": "^16.3.2",
    "@testing-library/user-event": "^14.6.5",
    "@types/react": "^19.2.18",
    "@types/react-dom": "^19.2.4",
    "@vitejs/plugin-react": "^6.0.5",
    "jsdom": "^29.1.1",
    "typescript": "^7.0.2",
    "vite": "^8.2.1",
    "vite-plugin-pwa": "^1.3.0",
    "vitest": "^4.1.10"
  }
}
```

- [ ] **Step 3: Write `tsconfig.json` and `tsconfig.node.json`**

`tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "types": ["vitest/globals", "@testing-library/jest-dom"]
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

`tsconfig.node.json`:
```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true,
    "strict": true
  },
  "include": ["vite.config.ts"]
}
```

- [ ] **Step 4: Write `vite.config.ts`**

```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { execSync } from 'node:child_process'

function gitSha(): string {
  try { return execSync('git rev-parse --short HEAD').toString().trim() } catch { return 'dev' }
}

export default defineConfig({
  base: '/RubikCube/',
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version ?? '0.0.0'),
    __GIT_SHA__: JSON.stringify(process.env.GIT_SHA ?? gitSha()),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['icons/icon.svg'],
      manifest: {
        name: 'Rubik Cube',
        short_name: 'RubikCube',
        start_url: '/RubikCube/',
        scope: '/RubikCube/',
        display: 'standalone',
        background_color: '#4a90d9',
        theme_color: '#4a90d9',
        icons: [
          { src: 'icons/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: 'icons/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
        ],
      },
    }),
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    execArgv: ['--no-experimental-webstorage'],
  },
})
```

- [ ] **Step 5: Write `index.html`, `src/vite-env.d.ts`, `src/test/setup.ts`, `public/icons/icon.svg`**

`index.html`:
```html
<!doctype html>
<html lang="zh">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <link rel="icon" type="image/svg+xml" href="/RubikCube/icons/icon.svg" />
    <link rel="apple-touch-icon" href="/RubikCube/icons/icon.svg" />
    <title>三阶魔方</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`src/vite-env.d.ts`:
```ts
/// <reference types="vite/client" />
declare const __APP_VERSION__: string
declare const __GIT_SHA__: string
declare const __BUILD_TIME__: string
```

`src/test/setup.ts`:
```ts
import '@testing-library/jest-dom'
```

`public/icons/icon.svg` (simple sky-blue cube glyph):
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="12" fill="#4a90d9"/><g fill="#fff"><rect x="16" y="16" width="9" height="9" rx="2"/><rect x="27.5" y="16" width="9" height="9" rx="2"/><rect x="39" y="16" width="9" height="9" rx="2"/><rect x="16" y="27.5" width="9" height="9" rx="2"/><rect x="27.5" y="27.5" width="9" height="9" rx="2"/><rect x="39" y="27.5" width="9" height="9" rx="2"/><rect x="16" y="39" width="9" height="9" rx="2"/><rect x="27.5" y="39" width="9" height="9" rx="2"/><rect x="39" y="39" width="9" height="9" rx="2"/></g></svg>
```

- [ ] **Step 6: Write minimal `src/main.tsx`, `src/App.tsx`, `src/styles.css`**

`src/main.tsx`:
```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import './styles.css'
import App from './App'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
```

`src/App.tsx` (placeholder, expanded in Task 12):
```tsx
import { HashRouter, Routes, Route } from 'react-router-dom'

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<div className="app">填色</div>} />
      </Routes>
    </HashRouter>
  )
}
```

`src/styles.css`:
```css
:root { color-scheme: light; }
* { box-sizing: border-box; }
body { margin: 0; font-family: -apple-system, system-ui, sans-serif; }
.app { min-height: 100vh; }
```

- [ ] **Step 7: Write `.github/workflows/deploy.yml`**

```yaml
name: Deploy to GitHub Pages
on:
  push:
    branches: [main]
  workflow_dispatch:
permissions:
  contents: read
  pages: write
  id-token: write
concurrency:
  group: pages
  cancel-in-progress: true
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run build
        env:
          GIT_SHA: ${{ github.sha }}
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

Also write `README.md` (short: develop/build/test/deploy/iOS install, mirroring CalorieCounter's).

- [ ] **Step 8: Install and verify build + test harness**

Run: `npm install`
Run: `npm run build`
Expected: build succeeds, `dist/` produced.
Run: `npm run test`
Expected: passes with "no test files found" (0 tests) — harness works.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "chore: scaffold RubikCube SPA (vite + react + pwa + CI)"
```

---

### Task 2: Core types and cube model (`types.ts`, `lib/cube.ts`)

**Files:**
- Create: `src/types.ts`, `src/lib/cube.ts`, `src/lib/cube.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `type Color = 'W'|'R'|'O'|'Y'|'G'|'B'`
  - `type Face = 'U'|'D'|'L'|'R'|'F'|'B'`
  - `type Orientation = 'default' | 'flipped'`
  - `type CubeState = Record<Face, (Color｜null)[]>` (each array length 9)
  - `CENTERS: Record<Face, Color>` — `{ U:'W', D:'Y', L:'O', R:'G', F:'R', B:'B' }`
  - `emptyCube(): CubeState` — centers set, other 8 per face `null`
  - `solvedCube(): CubeState` — every sticker = its face center
  - `cloneCube(c: CubeState): CubeState`
  - `remainingCounts(c: CubeState): Record<Color, number>` — `8 - (painted non-center of that color)`, floored at 0
  - `isFull(c: CubeState): boolean` — no `null` remaining
  - `visibleFaces(o: Orientation): { top: Face; left: Face; right: Face }` — default `{top:'U',left:'L',right:'R'}`, flipped `{top:'D',left:'B',right:'F'}` (these expose centers Y/B/R per requirement 5)

- [ ] **Step 1: Write the failing test** `src/lib/cube.test.ts`

```ts
import { describe, it, expect } from 'vitest'
import { CENTERS, emptyCube, solvedCube, cloneCube, remainingCounts, isFull, visibleFaces } from './cube'

describe('cube model', () => {
  it('empty cube has 6 fixed centers and 48 nulls', () => {
    const c = emptyCube()
    const faces = ['U','D','L','R','F','B'] as const
    let nulls = 0
    for (const f of faces) {
      expect(c[f]).toHaveLength(9)
      expect(c[f][4]).toBe(CENTERS[f])
      nulls += c[f].filter(x => x === null).length
    }
    expect(nulls).toBe(48)
  })

  it('center colors satisfy required orientations (req 4 & 5)', () => {
    // default exposes U=W, L=O, R=G
    expect(CENTERS.U).toBe('W'); expect(CENTERS.L).toBe('O'); expect(CENTERS.R).toBe('G')
    // flipped exposes top=D=Y, left=B=B, right=F=R
    const v = visibleFaces('flipped')
    expect(CENTERS[v.top]).toBe('Y')
    expect(CENTERS[v.left]).toBe('B')
    expect(CENTERS[v.right]).toBe('R')
  })

  it('solved cube is full and has 9 of each; remaining all 0', () => {
    const s = solvedCube()
    expect(isFull(s)).toBe(true)
    const r = remainingCounts(s)
    expect(r).toEqual({ W:0, R:0, O:0, Y:0, G:0, B:0 })
  })

  it('empty cube remaining is 8 for every color', () => {
    expect(remainingCounts(emptyCube())).toEqual({ W:8, R:8, O:8, Y:8, G:8, B:8 })
  })

  it('cloneCube is a deep copy', () => {
    const a = emptyCube(); const b = cloneCube(a); b.U[0] = 'R'
    expect(a.U[0]).toBe(null)
  })

  it('isFull false when any null', () => {
    const c = solvedCube(); c.U[0] = null
    expect(isFull(c)).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/cube.test.ts`
Expected: FAIL — cannot resolve `./cube`.

- [ ] **Step 3: Write `src/types.ts` then `src/lib/cube.ts`**

`src/types.ts`:
```ts
export type Color = 'W' | 'R' | 'O' | 'Y' | 'G' | 'B'
export type Face = 'U' | 'D' | 'L' | 'R' | 'F' | 'B'
export type Orientation = 'default' | 'flipped'
export type CubeState = Record<Face, (Color | null)[]>

export interface Move { face: Face; dir: 1 | -1 | 2 } // 1=cw, -1=ccw, 2=180
export interface SolveStep { stage: string; moves: Move[]; note: string }
export interface TutorialSection { anchor: string; title: string; body: string; algs: string[] }
```

`src/lib/cube.ts`:
```ts
import type { Color, Face, CubeState, Orientation } from '../types'

export const FACES: Face[] = ['U', 'D', 'L', 'R', 'F', 'B']
export const COLORS: Color[] = ['W', 'R', 'O', 'Y', 'G', 'B']

// Fixed color scheme. U/L/R chosen so default view shows W/O/G (req 4);
// D/B/F carry Y/B/R so the flipped view shows Y/B/R (req 5).
export const CENTERS: Record<Face, Color> = { U: 'W', D: 'Y', L: 'O', R: 'G', F: 'R', B: 'B' }

export function emptyCube(): CubeState {
  const c = {} as CubeState
  for (const f of FACES) {
    c[f] = Array<Color | null>(9).fill(null)
    c[f][4] = CENTERS[f]
  }
  return c
}

export function solvedCube(): CubeState {
  const c = {} as CubeState
  for (const f of FACES) c[f] = Array<Color | null>(9).fill(CENTERS[f])
  return c
}

export function cloneCube(c: CubeState): CubeState {
  const out = {} as CubeState
  for (const f of FACES) out[f] = c[f].slice()
  return out
}

export function isFull(c: CubeState): boolean {
  return FACES.every(f => c[f].every(x => x !== null))
}

export function remainingCounts(c: CubeState): Record<Color, number> {
  const placed: Record<Color, number> = { W: 0, R: 0, O: 0, Y: 0, G: 0, B: 0 }
  for (const f of FACES) {
    c[f].forEach((x, i) => { if (i !== 4 && x) placed[x] += 1 })
  }
  const out = {} as Record<Color, number>
  for (const col of COLORS) out[col] = Math.max(0, 8 - placed[col])
  return out
}

export function visibleFaces(o: Orientation): { top: Face; left: Face; right: Face } {
  return o === 'default'
    ? { top: 'U', left: 'L', right: 'R' }
    : { top: 'D', left: 'B', right: 'F' }
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/lib/cube.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/types.ts src/lib/cube.ts src/lib/cube.test.ts
git commit -m "feat: cube state model with fixed color scheme"
```

---

### Task 3: Move engine (`lib/moves.ts`)

**Files:**
- Create: `src/lib/moves.ts`, `src/lib/moves.test.ts`

**Interfaces:**
- Consumes: `CubeState`, `Move`, `cloneCube`, `solvedCube` from Task 2.
- Produces:
  - `applyMove(c: CubeState, m: Move): CubeState` — returns a new state.
  - `applyMoves(c: CubeState, ms: Move[]): CubeState`
  - `parseMoves(s: string): Move[]` — `"R U R' U2"` → `Move[]` (space-separated; `'`=ccw, `2`=180).
  - `invert(ms: Move[]): Move[]`

**Note on correctness strategy:** rather than hand-transcribe 6 permutation tables, the implementer defines each face turn as a cycle list, and correctness is verified by *group-theoretic invariants* (a quarter turn has order 4; a move times its inverse is identity; the 6 solved-cube face turns each leave exactly the turned face's center fixed and permute 20 stickers). These catch transcription errors without a golden table.

- [ ] **Step 1: Write the failing test** `src/lib/moves.test.ts`

```ts
import { describe, it, expect } from 'vitest'
import { solvedCube, cloneCube } from './cube'
import { applyMove, applyMoves, parseMoves, invert } from './moves'
import type { Move } from '../types'

const eq = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)
const FACES = ['U','D','L','R','F','B'] as const

describe('move engine', () => {
  it('parseMoves reads notation', () => {
    expect(parseMoves("R U R' U2")).toEqual<Move[]>([
      { face: 'R', dir: 1 }, { face: 'U', dir: 1 }, { face: 'R', dir: -1 }, { face: 'U', dir: 2 },
    ])
  })

  it('each quarter turn has order 4 (X X X X = identity)', () => {
    for (const face of FACES) {
      let c = solvedCube()
      for (let i = 0; i < 4; i++) c = applyMove(c, { face, dir: 1 })
      expect(eq(c, solvedCube())).toBe(true)
    }
  })

  it('a move times its inverse is identity', () => {
    for (const face of FACES) {
      const c = applyMoves(solvedCube(), [{ face, dir: 1 }, { face, dir: -1 }])
      expect(eq(c, solvedCube())).toBe(true)
      const d = applyMoves(solvedCube(), [{ face, dir: 2 }, { face, dir: 2 }])
      expect(eq(d, solvedCube())).toBe(true)
    }
  })

  it('a single R turn changes the cube and keeps all centers fixed', () => {
    const c = applyMove(solvedCube(), { face: 'R', dir: 1 })
    expect(eq(c, solvedCube())).toBe(false)
    for (const f of FACES) expect(c[f][4]).toBe(solvedCube()[f][4]) // centers unmoved
  })

  it('invert reverses and flips a sequence', () => {
    const seq = parseMoves("R U R' U'")
    const c = applyMoves(applyMoves(solvedCube(), seq), invert(seq))
    expect(eq(c, solvedCube())).toBe(true)
  })

  it('the 6-move sequence (R U R U R U R U R U R U... ) sexy move has order 6', () => {
    // (R U R' U') repeated 6 times returns to solved — classic commutator order
    let c = cloneCube(solvedCube())
    const sexy = parseMoves("R U R' U'")
    for (let i = 0; i < 6; i++) c = applyMoves(c, sexy)
    expect(eq(c, solvedCube())).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/moves.test.ts`
Expected: FAIL — cannot resolve `./moves`.

- [ ] **Step 3: Write `src/lib/moves.ts`**

Implement each face turn as facelet index cycles. Model each move as a list of
4-cycles of `[face,index]` positions. `applyMove` copies the cube, then for each
cycle moves sticker values forward by `dir` (dir 2 = apply the cw permutation
twice; dir -1 = apply it 3 times or reverse the cycles). Reference facelet
indices per face: `0 1 2 / 3 4 5 / 6 7 8`.

```ts
import type { CubeState, Face, Move } from '../types'
import { cloneCube } from './cube'

type Pos = [Face, number]
// Each entry is one 4-cycle: value at pos[i] moves to pos[i+1] on a cw turn.
// Includes the 8 face stickers (0-3,5-8) plus the 12 adjacent side stickers.
const CYCLES: Record<Face, Pos[][]> = {
  U: [
    [['U',0],['U',2],['U',8],['U',6]], [['U',1],['U',5],['U',7],['U',3]],
    [['B',0],['R',0],['F',0],['L',0]], [['B',1],['R',1],['F',1],['L',1]], [['B',2],['R',2],['F',2],['L',2]],
  ],
  D: [
    [['D',0],['D',2],['D',8],['D',6]], [['D',1],['D',5],['D',7],['D',3]],
    [['F',6],['R',6],['B',6],['L',6]], [['F',7],['R',7],['B',7],['L',7]], [['F',8],['R',8],['B',8],['L',8]],
  ],
  F: [
    [['F',0],['F',2],['F',8],['F',6]], [['F',1],['F',5],['F',7],['F',3]],
    [['U',6],['R',0],['D',2],['L',8]], [['U',7],['R',3],['D',1],['L',5]], [['U',8],['R',6],['D',0],['L',2]],
  ],
  B: [
    [['B',0],['B',2],['B',8],['B',6]], [['B',1],['B',5],['B',7],['B',3]],
    [['U',2],['L',0],['D',6],['R',8]], [['U',1],['L',3],['D',7],['R',5]], [['U',0],['L',6],['D',8],['R',2]],
  ],
  L: [
    [['L',0],['L',2],['L',8],['L',6]], [['L',1],['L',5],['L',7],['L',3]],
    [['U',0],['F',0],['D',0],['B',8]], [['U',3],['F',3],['D',3],['B',5]], [['U',6],['F',6],['D',6],['B',2]],
  ],
  R: [
    [['R',0],['R',2],['R',8],['R',6]], [['R',1],['R',5],['R',7],['R',3]],
    [['U',8],['B',0],['D',8],['F',8]], [['U',5],['B',3],['D',5],['F',5]], [['U',2],['B',6],['D',2],['F',2]],
  ],
}

function turnCW(c: CubeState, face: Face): CubeState {
  const out = cloneCube(c)
  for (const cycle of CYCLES[face]) {
    const n = cycle.length
    for (let i = 0; i < n; i++) {
      const [df, di] = cycle[(i + 1) % n]
      const [sf, si] = cycle[i]
      out[df][di] = c[sf][si]
    }
  }
  return out
}

export function applyMove(c: CubeState, m: Move): CubeState {
  const times = m.dir === -1 ? 3 : m.dir === 2 ? 2 : 1
  let out = c
  for (let i = 0; i < times; i++) out = turnCW(out, m.face)
  return out
}

export function applyMoves(c: CubeState, ms: Move[]): CubeState {
  return ms.reduce(applyMove, c)
}

export function parseMoves(s: string): Move[] {
  return s.trim().split(/\s+/).filter(Boolean).map(tok => {
    const face = tok[0] as Face
    const dir = tok.includes('2') ? 2 : tok.includes("'") ? -1 : 1
    return { face, dir } as Move
  })
}

export function invert(ms: Move[]): Move[] {
  return [...ms].reverse().map(m => ({ face: m.face, dir: (m.dir === 2 ? 2 : (m.dir === 1 ? -1 : 1)) as Move['dir'] }))
}
```

**Implementer note:** the exact side-sticker index triples above must satisfy the
tests (order-4, inverse-identity, sexy-move-order-6). If a face's cycle is
mis-indexed, the order-4 test still passes but the sexy-move test fails — fix the
adjacent-face indices for that face until all move tests pass. This is the guard.

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/lib/moves.test.ts`
Expected: PASS. If the sexy-move or inverse test fails, correct the adjacent-sticker index triples per the note above, then re-run.

- [ ] **Step 5: Commit**

```bash
git add src/lib/moves.ts src/lib/moves.test.ts
git commit -m "feat: cube move engine with notation parsing"
```

---

### Task 4: Facelet → cubie conversion (`lib/cubie.ts`)

**Files:**
- Create: `src/lib/cubie.ts`, `src/lib/cubie.test.ts`

**Interfaces:**
- Consumes: `CubeState`, `Color`, `Face` from Task 2; `applyMoves`, `parseMoves` from Task 3.
- Produces:
  - `interface Cubies { cp: number[]; co: number[]; ep: number[]; eo: number[] }` — corner permutation (8), corner orientation (8, each 0..2), edge permutation (12), edge orientation (12, each 0..1). Uses the standard URF-numbering (solved = identity).
  - `toCubies(c: CubeState): Cubies | null` — returns `null` if any corner/edge sticker-set is not a legal cubie (used by solvability Check 1).
  - `CORNER_FACELETS: [Face, number][][]` and `EDGE_FACELETS: [Face, number][][]` — the facelet positions of each cubie (exported for tests/reuse).

- [ ] **Step 1: Write the failing test** `src/lib/cubie.test.ts`

```ts
import { describe, it, expect } from 'vitest'
import { solvedCube } from './cube'
import { applyMoves, parseMoves } from './moves'
import { toCubies } from './cubie'

describe('facelet -> cubie', () => {
  it('solved cube maps to identity cubies', () => {
    const q = toCubies(solvedCube())!
    expect(q.cp).toEqual([0,1,2,3,4,5,6,7])
    expect(q.co).toEqual([0,0,0,0,0,0,0,0])
    expect(q.ep).toEqual([0,1,2,3,4,5,6,7,8,9,10,11])
    expect(q.eo).toEqual([0,0,0,0,0,0,0,0,0,0,0,0])
  })

  it('a scramble stays a legal (non-null) cubie set', () => {
    const c = applyMoves(solvedCube(), parseMoves("R U R' U' F2 L D"))
    const q = toCubies(c)
    expect(q).not.toBeNull()
    // permutations are genuine permutations of 0..7 and 0..11
    expect([...q!.cp].sort((a,b)=>a-b)).toEqual([0,1,2,3,4,5,6,7])
    expect([...q!.ep].sort((a,b)=>a-b)).toEqual([0,1,2,3,4,5,6,7,8,9,10,11])
  })

  it('orientation sums are valid for a real scramble', () => {
    const c = applyMoves(solvedCube(), parseMoves("R U R' U' R U2 R' F R F'"))
    const q = toCubies(c)!
    expect(q.co.reduce((a,b)=>a+b,0) % 3).toBe(0)
    expect(q.eo.reduce((a,b)=>a+b,0) % 2).toBe(0)
  })

  it('returns null for an impossible cubie (opposite colors on one corner)', () => {
    const bad = solvedCube()
    // force a corner to carry W and Y (opposite pair) — illegal cubie
    bad.U[0] = 'W'; bad.L[0] = 'Y'; bad.B[2] = 'W'
    expect(toCubies(bad)).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/cubie.test.ts`
Expected: FAIL — cannot resolve `./cubie`.

- [ ] **Step 3: Write `src/lib/cubie.ts`**

Define, in standard order, the 8 corner cubies and 12 edge cubies as the list of
facelet positions each occupies (corner = 3 facelets, edge = 2), with the first
facelet being the reference for orientation (0 = the U/D facelet faces up/down).
Build reference color-sets for the solved cube. For each physical cubie slot,
read its current colors, find which solved cubie has that color-set (→
permutation), and compute orientation by where the U/D-colored sticker sits.
Return `null` if any slot's color-set matches no legal cubie.

```ts
import type { CubeState, Color, Face } from '../types'
import { CENTERS } from './cube'

export interface Cubies { cp: number[]; co: number[]; ep: number[]; eo: number[] }

// Facelet positions for each corner/edge slot, standard URFDLB scheme.
// Corner order: URF, UFL, ULB, UBR, DFR, DLF, DBL, DRB
export const CORNER_FACELETS: [Face, number][][] = [
  [['U',8],['R',0],['F',2]], [['U',6],['F',0],['L',2]], [['U',0],['L',0],['B',2]], [['U',2],['B',0],['R',2]],
  [['D',2],['F',8],['R',6]], [['D',0],['L',8],['F',6]], [['D',6],['B',8],['L',6]], [['D',8],['R',8],['B',6]],
]
// Edge order: UR, UF, UL, UB, DR, DF, DL, DB, FR, FL, BL, BR
export const EDGE_FACELETS: [Face, number][][] = [
  [['U',5],['R',1]], [['U',7],['F',1]], [['U',3],['L',1]], [['U',1],['B',1]],
  [['D',5],['R',7]], [['D',1],['F',7]], [['D',3],['L',7]], [['D',7],['B',7]],
  [['F',5],['R',3]], [['F',3],['L',5]], [['B',5],['L',3]], [['B',3],['R',5]],
]

const U = CENTERS.U, D = CENTERS.D
const key = (cs: (Color|null)[]) => cs.some(x=>x===null) ? null : [...cs].sort().join('')

function refSets(facelets: [Face, number][][]) {
  return facelets.map(cubie => cubie.map(([f]) => CENTERS[f]))
}
const CORNER_REF = refSets(CORNER_FACELETS)
const EDGE_REF = refSets(EDGE_FACELETS)
const cornerKey = (i: number) => [...CORNER_REF[i]].sort().join('')
const edgeKey = (i: number) => [...EDGE_REF[i]].sort().join('')

export function toCubies(c: CubeState): Cubies | null {
  const cp = new Array(8).fill(-1), co = new Array(8).fill(0)
  const ep = new Array(12).fill(-1), eo = new Array(12).fill(0)

  for (let slot = 0; slot < 8; slot++) {
    const cols = CORNER_FACELETS[slot].map(([f,i]) => c[f][i]) as (Color|null)[]
    const k = key(cols); if (!k) return null
    const piece = CORNER_REF.findIndex((_, i) => cornerKey(i) === k)
    if (piece < 0) return null
    cp[slot] = piece
    // orientation = index (0..2) of the U/D-colored sticker within this slot's facelets
    const oi = cols.findIndex(x => x === U || x === D)
    if (oi < 0) return null
    co[slot] = oi
  }

  for (let slot = 0; slot < 12; slot++) {
    const cols = EDGE_FACELETS[slot].map(([f,i]) => c[f][i]) as (Color|null)[]
    const k = key(cols); if (!k) return null
    const piece = EDGE_REF.findIndex((_, i) => edgeKey(i) === k)
    if (piece < 0) return null
    ep[slot] = piece
    // eo = 0 if the "primary" colored sticker sits on the primary facelet, else 1.
    // Primary color of an edge piece = its U/D color if it has one, else its F/B color.
    const primaryColor = EDGE_REF[piece].find(x => x === U || x === D)
      ?? EDGE_REF[piece].find(x => x === CENTERS.F || x === CENTERS.B)!
    eo[slot] = cols[0] === primaryColor ? 0 : 1
  }

  // validate permutations are complete
  if (new Set(cp).size !== 8 || cp.includes(-1)) return null
  if (new Set(ep).size !== 12 || ep.includes(-1)) return null
  return { cp, co, ep, eo }
}
```

**Implementer note:** if the "orientation sums" test fails, the `eo` primary-facelet
convention or the corner `co` reference index is off. The self-check: for the
solved cube `co`/`eo` must be all-zero (first test) AND for any real scramble the
sums must satisfy mod-3 / mod-2 (third test). Adjust the orientation reference
until both hold. The permutation tests are independent of orientation and pin the
facelet tables.

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/lib/cubie.test.ts`
Expected: PASS (4 tests). Iterate on orientation convention per note if needed.

- [ ] **Step 5: Commit**

```bash
git add src/lib/cubie.ts src/lib/cubie.test.ts
git commit -m "feat: facelet-to-cubie conversion"
```

---

### Task 5: Solvability validator (`lib/solvability.ts`)

**Files:**
- Create: `src/lib/solvability.ts`, `src/lib/solvability.test.ts`

**Interfaces:**
- Consumes: `CubeState` (Task 2), `toCubies`, `Cubies` (Task 4), `applyMoves`/`parseMoves`, `solvedCube`.
- Produces:
  - `const UNSOLVABLE_MESSAGE: string` (verbatim requirement-7 text).
  - `validate(c: CubeState): { solvable: boolean; reason?: string }` — runs Check 0 (color counts = 9 each), Check 1 (`toCubies` non-null), Check 2 (co%3==0, eo%2==0, permutation parity match). On any failure `solvable:false, reason: UNSOLVABLE_MESSAGE`.
  - `permutationParity(perm: number[]): 0 | 1` (exported for tests).

- [ ] **Step 1: Write the failing test** `src/lib/solvability.test.ts`

```ts
import { describe, it, expect } from 'vitest'
import { solvedCube } from './cube'
import { applyMoves, parseMoves } from './moves'
import { validate, UNSOLVABLE_MESSAGE, permutationParity } from './solvability'

describe('solvability', () => {
  it('solved cube is solvable', () => {
    expect(validate(solvedCube()).solvable).toBe(true)
  })

  it('any real scramble is solvable', () => {
    const c = applyMoves(solvedCube(), parseMoves("R U R' U' F2 B' L2 D R2 U'"))
    expect(validate(c).solvable).toBe(true)
  })

  it('a single twisted corner is unsolvable (co sum != 0 mod 3)', () => {
    const c = solvedCube()
    // rotate the URF corner stickers in place: U8->R0->F2->U8
    const u8 = c.U[8], r0 = c.R[0], f2 = c.F[2]
    c.U[8] = f2; c.R[0] = u8; c.F[2] = r0
    const res = validate(c)
    expect(res.solvable).toBe(false)
    expect(res.reason).toBe(UNSOLVABLE_MESSAGE)
  })

  it('a single flipped edge is unsolvable (eo sum != 0 mod 2)', () => {
    const c = solvedCube()
    const u5 = c.U[5], r1 = c.R[1]
    c.U[5] = r1; c.R[1] = u5 // flip UR edge
    expect(validate(c).solvable).toBe(false)
  })

  it('a single swap of two edges is unsolvable (parity mismatch)', () => {
    const c = solvedCube()
    // swap UR and UF edge pieces entirely (both stickers) -> odd edge perm, even corner perm
    ;[c.U[5], c.U[7]] = [c.U[7], c.U[5]]
    ;[c.R[1], c.F[1]] = [c.F[1], c.R[1]]
    expect(validate(c).solvable).toBe(false)
  })

  it('wrong color count is unsolvable', () => {
    const c = solvedCube(); c.U[0] = 'R' // now 8 W, 10 R
    expect(validate(c).solvable).toBe(false)
  })

  it('permutationParity: identity even, single swap odd', () => {
    expect(permutationParity([0,1,2,3])).toBe(0)
    expect(permutationParity([1,0,2,3])).toBe(1)
  })

  it('message is verbatim', () => {
    expect(UNSOLVABLE_MESSAGE).toBe('填色状态不可解，1.先检查填色状态与手上魔方状态是否一致。2.如果魔方被转角或者拆装错了，将导致无法还原(即不可解)')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/solvability.test.ts`
Expected: FAIL — cannot resolve `./solvability`.

- [ ] **Step 3: Write `src/lib/solvability.ts`**

```ts
import type { CubeState, Color } from '../types'
import { FACES, COLORS } from './cube'
import { toCubies } from './cubie'

export const UNSOLVABLE_MESSAGE =
  '填色状态不可解，1.先检查填色状态与手上魔方状态是否一致。2.如果魔方被转角或者拆装错了，将导致无法还原(即不可解)'

export function permutationParity(perm: number[]): 0 | 1 {
  const seen = new Array(perm.length).fill(false)
  let transpositions = 0
  for (let i = 0; i < perm.length; i++) {
    if (seen[i]) continue
    let j = i, len = 0
    while (!seen[j]) { seen[j] = true; j = perm[j]; len++ }
    transpositions += len - 1
  }
  return (transpositions % 2) as 0 | 1
}

function colorCountsOk(c: CubeState): boolean {
  const n: Record<Color, number> = { W:0, R:0, O:0, Y:0, G:0, B:0 }
  for (const f of FACES) for (const x of c[f]) { if (!x) return false; n[x] += 1 }
  return COLORS.every(col => n[col] === 9)
}

export function validate(c: CubeState): { solvable: boolean; reason?: string } {
  const fail = { solvable: false, reason: UNSOLVABLE_MESSAGE }
  if (!colorCountsOk(c)) return fail
  const q = toCubies(c)
  if (!q) return fail
  if (q.co.reduce((a, b) => a + b, 0) % 3 !== 0) return fail
  if (q.eo.reduce((a, b) => a + b, 0) % 2 !== 0) return fail
  if (permutationParity(q.cp) !== permutationParity(q.ep)) return fail
  return { solvable: true }
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/lib/solvability.test.ts`
Expected: PASS (8 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/solvability.ts src/lib/solvability.test.ts
git commit -m "feat: cube solvability validator"
```

---

### Task 6: LBL solver (`lib/solver.ts`)

**Files:**
- Create: `src/lib/solver.ts`, `src/lib/solver.test.ts`

**Interfaces:**
- Consumes: `CubeState`, `SolveStep`, `Move` (Tasks 2), `applyMove`/`applyMoves` (Task 3), `solvedCube`/`cloneCube` (Task 2).
- Produces:
  - `const STAGES: string[]` — the 7 stage labels in order (exactly matching tutorial steps 1–7).
  - `solve(c: CubeState): SolveStep[]` — assumes `c` is solvable (validated by caller). Returns steps grouped by stage; concatenating all `moves` and applying to `c` yields a solved cube.

**Implementation approach:** a beginner LBL solver. For robustness and testability, implement each stage as: *repeatedly search a bounded move space (IDA*/BFS up to a small depth) for a sequence that achieves the stage's sub-goal predicate, applying known-good algorithms.* Because a full hand-written intuitive solver is error-prone, use a **staged BFS**: for each sub-goal (e.g. "white cross edge X placed"), BFS over the 18 moves to a shallow depth to find the shortest fixing sequence given the constraint that already-solved pieces stay solved (restrict the move set as layers get locked). This keeps each stage's code small and the whole thing provably correct via the end-to-end test. Group emitted moves under the current stage label.

- [ ] **Step 1: Write the failing test** `src/lib/solver.test.ts`

```ts
import { describe, it, expect } from 'vitest'
import { solvedCube } from './cube'
import { applyMoves, parseMoves } from './moves'
import { solve, STAGES } from './solver'
import type { Move } from '../types'

const eq = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)
const flat = (steps: { moves: Move[] }[]) => steps.flatMap(s => s.moves)

describe('LBL solver', () => {
  it('exposes 7 stage labels', () => {
    expect(STAGES).toHaveLength(7)
    expect(STAGES[0]).toContain('白色十字')
  })

  it('solving the solved cube yields no-op that stays solved', () => {
    const steps = solve(solvedCube())
    const end = applyMoves(solvedCube(), flat(steps))
    expect(eq(end, solvedCube())).toBe(true)
  })

  it('solves many random solvable scrambles', () => {
    const faces = ['U','D','L','R','F','B'] as const
    const dirs = [1,-1,2] as const
    let solvedCount = 0
    for (let t = 0; t < 30; t++) {
      const scramble: Move[] = Array.from({ length: 25 }, () => ({
        face: faces[Math.floor(Math.random()*6)],
        dir: dirs[Math.floor(Math.random()*3)],
      }))
      const start = applyMoves(solvedCube(), scramble)
      const steps = solve(start)
      const end = applyMoves(start, flat(steps))
      if (eq(end, solvedCube())) solvedCount++
    }
    expect(solvedCount).toBe(30)
  })

  it('groups moves under stage labels', () => {
    const start = applyMoves(solvedCube(), parseMoves("R U R' U' F2 L2 B D'"))
    const steps = solve(start)
    for (const s of steps) expect(STAGES).toContain(s.stage)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/solver.test.ts`
Expected: FAIL — cannot resolve `./solver`.

- [ ] **Step 3: Write `src/lib/solver.ts`**

Implement `STAGES` and `solve`. Recommended structure: a helper `bfsToGoal(state, goal, moveSet, maxDepth)` returning the shortest `Move[]` reaching `goal(state)===true`, and per-stage goal predicates + progressively restricted move sets. Emit `{ stage, moves, note }` per solved sub-goal. Concatenation of all moves must solve the cube — that is the acceptance test. Include a short human `note` per stage (Chinese) matching the tutorial wording.

```ts
import type { CubeState, Move, SolveStep, Face } from '../types'
import { applyMove } from './moves'
import { solvedCube } from './cube'

export const STAGES: string[] = [
  '白色十字', '白色面和侧面T字', '中层棱块',
  '顶层黄色十字', '顶层黄色面', '顶层凹字(角块归位)', '顶层棱块归位',
]

const ALL_FACES: Face[] = ['U','D','L','R','F','B']
const DIRS: (1|-1|2)[] = [1,-1,2]

function moveSet(faces: Face[]): Move[] {
  return faces.flatMap(face => DIRS.map(dir => ({ face, dir } as Move)))
}

// Breadth-first search for the shortest sequence (within maxDepth) that makes
// goal() true, exploring only `moves`. Returns [] if goal already met.
function bfsToGoal(start: CubeState, goal: (c: CubeState) => boolean, moves: Move[], maxDepth: number): Move[] {
  if (goal(start)) return []
  interface Node { c: CubeState; path: Move[] }
  let frontier: Node[] = [{ c: start, path: [] }]
  const seen = new Set<string>([JSON.stringify(start)])
  for (let depth = 0; depth < maxDepth; depth++) {
    const next: Node[] = []
    for (const node of frontier) {
      for (const m of moves) {
        const c = applyMove(node.c, m)
        const k = JSON.stringify(c)
        if (seen.has(k)) continue
        seen.add(k)
        const path = [...node.path, m]
        if (goal(c)) return path
        next.push({ c, path })
      }
    }
    frontier = next
  }
  throw new Error('bfs: goal unreachable within depth')
}

// Goal predicates compare selected facelets against the solved cube.
const S = solvedCube()
const match = (c: CubeState, cells: [Face, number][]) => cells.every(([f,i]) => c[f][i] === S[f][i])

export function solve(input: CubeState): SolveStep[] {
  const steps: SolveStep[] = []
  let c = input

  function stage(label: string, note: string, goal: (c: CubeState)=>boolean, faces: Face[], depth: number) {
    const mv = bfsToGoal(c, goal, moveSet(faces), depth)
    for (const m of mv) c = applyMove(c, m)
    steps.push({ stage: label, moves: mv, note })
  }

  // Whole solve via progressive goals. Move sets widen/narrow per stage so
  // locked layers are preserved. Depths kept small; BFS finds shortest fixes.
  // NOTE: implementer tunes goal cell-sets and depths so the end-to-end test
  // (all 30 scrambles solved) passes. The pattern below is the scaffold.
  stage(STAGES[0], '把白色棱块对齐中心，做出白色十字', c => match(c, [['D',1],['D',3],['D',5],['D',7],['F',7],['R',7],['B',7],['L',7]]), ALL_FACES, 8)
  stage(STAGES[1], '把白色角块归位，完成白色面和四个侧面T字', c => match(c, [['D',0],['D',2],['D',6],['D',8],['F',6],['F',8],['R',6],['R',8],['B',6],['B',8],['L',6],['L',8]]), ALL_FACES, 9)
  stage(STAGES[2], '把中层四个棱块归位', c => match(c, [['F',3],['F',5],['R',3],['R',5],['B',3],['B',5],['L',3],['L',5]]), ['U','R','L','F','B'], 9)
  stage(STAGES[3], '做出顶层黄色十字', c => match(c, [['U',1],['U',3],['U',5],['U',7]]), ['U','R','F'], 8)
  stage(STAGES[4], '翻转顶层角块，完成黄色面', c => [0,2,6,8].every(i => c.U[i] === S.U[i]), ['U','R','F'], 10)
  stage(STAGES[5], '调整顶层角块位置(凹字)', c => match(c, [['F',2],['R',0],['B',2],['L',0],['F',0],['R',2],['B',0],['L',2]]), ['U'], 6)
  stage(STAGES[6], '调整顶层棱块位置，完成复原', c => JSON.stringify(c) === JSON.stringify(S), ['U','R','F','L','B'], 8)

  return steps
}
```

**Implementer note (critical):** the goal cell-sets and depths above are a
scaffold, not final. The BFS approach is sound but the *stage goals must be
independent and monotonic* — each stage must be reachable within `maxDepth`
without disturbing prior stages, or BFS throws / explodes. If the 30-scramble
test fails or is slow, the fix is one of: (a) tighten goals into smaller
sub-goals (solve white cross one edge at a time; middle layer one edge at a
time; last layer using fixed algorithms instead of open BFS), (b) restrict move
sets further once a layer is locked, (c) for the last-layer stages replace open
BFS with applying the standard beginner algorithms (`parseMoves`) conditioned on
detected cases. Prefer decomposing into per-piece sub-goals with narrow move
sets and depth ≤ 6 — that keeps BFS fast and guarantees termination. The
end-to-end test (all 30 solved, and it must run in reasonable time) is the
acceptance gate; keep decomposing until it is green and fast.

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/lib/solver.test.ts`
Expected: PASS (4 tests), completing in a few seconds. Decompose per the note until green and fast.

- [ ] **Step 5: Commit**

```bash
git add src/lib/solver.ts src/lib/solver.test.ts
git commit -m "feat: layer-by-layer cube solver"
```

---

### Task 7: Persistence (`lib/migrations.ts`, `lib/storage.ts`)

**Files:**
- Create: `src/lib/migrations.ts`, `src/lib/storage.ts`, `src/lib/storage.test.ts`

**Interfaces:**
- Consumes: `CubeState`, `emptyCube`, `cloneCube`, `FACES` (Task 2).
- Produces:
  - `CURRENT_SCHEMA_VERSION = 1`, `migrate({version,data})` (Task-2-style ladder).
  - `loadPaint(): CubeState` — restores saved paint or `emptyCube()`; malformed → `emptyCube()`.
  - `savePaint(c: CubeState): void`.
  - `clearPaint(): void`.
  - `ensureSchema(): void`.

- [ ] **Step 1: Write the failing test** `src/lib/storage.test.ts`

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { loadPaint, savePaint, clearPaint } from './storage'
import { emptyCube, solvedCube } from './cube'

describe('storage', () => {
  beforeEach(() => localStorage.clear())

  it('loads empty cube when nothing saved', () => {
    expect(loadPaint()).toEqual(emptyCube())
  })

  it('round-trips a saved cube', () => {
    const c = solvedCube(); c.U[0] = null
    savePaint(c)
    expect(loadPaint()).toEqual(c)
  })

  it('clearPaint resets to empty', () => {
    savePaint(solvedCube()); clearPaint()
    expect(loadPaint()).toEqual(emptyCube())
  })

  it('malformed blob falls back to empty', () => {
    localStorage.setItem('rc.paint', '{not json')
    expect(loadPaint()).toEqual(emptyCube())
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/storage.test.ts`
Expected: FAIL — cannot resolve `./storage`.

- [ ] **Step 3: Write `src/lib/migrations.ts` and `src/lib/storage.ts`**

`src/lib/migrations.ts`:
```ts
export const CURRENT_SCHEMA_VERSION = 1
const steps: Record<number, (data: unknown) => unknown> = {}
export function migrate(raw: { version: number; data: unknown }): { version: number; data: unknown } {
  let { version, data } = raw
  while (version < CURRENT_SCHEMA_VERSION && steps[version]) { data = steps[version](data); version += 1 }
  return { version: Math.max(version, raw.version), data }
}
```

`src/lib/storage.ts`:
```ts
import type { CubeState } from '../types'
import { emptyCube } from './cube'
import { migrate, CURRENT_SCHEMA_VERSION } from './migrations'

const K = { paint: 'rc.paint', schemaVersion: 'rc.schemaVersion' } as const

function read<T>(key: string, fallback: T): T {
  const raw = localStorage.getItem(key)
  if (raw == null) return fallback
  try { return JSON.parse(raw) as T } catch { return fallback }
}

export function loadPaint(): CubeState {
  const c = read<CubeState | null>(K.paint, null)
  if (!c) return emptyCube()
  // shallow shape check: 6 faces each length 9
  const faces = ['U','D','L','R','F','B'] as const
  if (!faces.every(f => Array.isArray(c[f]) && c[f].length === 9)) return emptyCube()
  return c
}
export function savePaint(c: CubeState): void { localStorage.setItem(K.paint, JSON.stringify(c)) }
export function clearPaint(): void { localStorage.removeItem(K.paint) }

export function ensureSchema(): void {
  const stored = Number(localStorage.getItem(K.schemaVersion) ?? CURRENT_SCHEMA_VERSION)
  const raw = localStorage.getItem(K.paint)
  if (raw != null) {
    try {
      const migrated = migrate({ version: stored, data: JSON.parse(raw) })
      localStorage.setItem(K.paint, JSON.stringify(migrated.data))
    } catch { /* leave malformed; loadPaint falls back */ }
  }
  localStorage.setItem(K.schemaVersion, String(CURRENT_SCHEMA_VERSION))
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/lib/storage.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/migrations.ts src/lib/storage.ts src/lib/storage.test.ts
git commit -m "feat: schema-versioned paint persistence"
```

---

### Task 8: App state context (`state/AppContext.tsx`, `state/useApp.ts`)

**Files:**
- Create: `src/state/AppContext.tsx`, `src/state/useApp.ts`, `src/state/AppContext.test.tsx`

**Interfaces:**
- Consumes: `CubeState`, `Color`, `Orientation` (Task 2); `emptyCube`, `remainingCounts`, `isFull`, `cloneCube` (Task 2); `loadPaint`, `savePaint`, `clearPaint`, `ensureSchema` (Task 7); `validate` (Task 5).
- Produces `useApp()` returning:
  - `cube: CubeState`
  - `brush: Color`
  - `orientation: Orientation`
  - `remaining: Record<Color, number>`
  - `full: boolean`
  - `validation: { solvable: boolean; reason?: string } | null` (null until full)
  - `setBrush(c: Color): void`
  - `paintSticker(face: Face, index: number): void` (ignores center index 4)
  - `flip(): void` (toggles orientation)
  - `reset(): void` (clears to empty + clears storage)

- [ ] **Step 1: Write the failing test** `src/state/AppContext.test.tsx`

```tsx
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { AppProvider } from './AppContext'
import { useApp } from './useApp'

function Probe() {
  const { remaining, brush, setBrush, paintSticker, orientation, flip } = useApp()
  return (
    <div>
      <span data-testid="brush">{brush}</span>
      <span data-testid="remW">{remaining.W}</span>
      <span data-testid="orient">{orientation}</span>
      <button onClick={() => setBrush('W')}>bw</button>
      <button onClick={() => paintSticker('U', 0)}>paint</button>
      <button onClick={flip}>flip</button>
    </div>
  )
}

describe('AppContext', () => {
  beforeEach(() => localStorage.clear())

  it('painting a sticker with white brush decrements white remaining', () => {
    render(<AppProvider><Probe /></AppProvider>)
    expect(screen.getByTestId('remW').textContent).toBe('8')
    act(() => { screen.getByText('bw').click() })
    act(() => { screen.getByText('paint').click() })
    expect(screen.getByTestId('brush').textContent).toBe('W')
    expect(screen.getByTestId('remW').textContent).toBe('7')
  })

  it('flip toggles orientation', () => {
    render(<AppProvider><Probe /></AppProvider>)
    expect(screen.getByTestId('orient').textContent).toBe('default')
    act(() => { screen.getByText('flip').click() })
    expect(screen.getByTestId('orient').textContent).toBe('flipped')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/state/AppContext.test.tsx`
Expected: FAIL — cannot resolve `./AppContext`.

- [ ] **Step 3: Write `src/state/AppContext.tsx` and `src/state/useApp.ts`**

`AppContext.tsx`:
```tsx
import { createContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Color, CubeState, Face, Orientation } from '../types'
import { cloneCube, isFull, remainingCounts } from '../lib/cube'
import { loadPaint, savePaint, clearPaint, ensureSchema } from '../lib/storage'
import { emptyCube } from '../lib/cube'
import { validate } from '../lib/solvability'

export interface AppValue {
  cube: CubeState; brush: Color; orientation: Orientation
  remaining: Record<Color, number>; full: boolean
  validation: { solvable: boolean; reason?: string } | null
  setBrush(c: Color): void
  paintSticker(face: Face, index: number): void
  flip(): void
  reset(): void
}

export const AppContext = createContext<AppValue | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [cube, setCube] = useState<CubeState>(() => { ensureSchema(); return loadPaint() })
  const [brush, setBrush] = useState<Color>('W')
  const [orientation, setOrientation] = useState<Orientation>('default')

  useEffect(() => { savePaint(cube) }, [cube])

  const remaining = useMemo(() => remainingCounts(cube), [cube])
  const full = useMemo(() => isFull(cube), [cube])
  const validation = useMemo(() => (full ? validate(cube) : null), [cube, full])

  const value: AppValue = {
    cube, brush, orientation, remaining, full, validation,
    setBrush,
    paintSticker(face, index) {
      if (index === 4) return
      setCube(prev => { const next = cloneCube(prev); next[face][index] = brush; return next })
    },
    flip() { setOrientation(o => (o === 'default' ? 'flipped' : 'default')) },
    reset() { clearPaint(); setCube(emptyCube()); setOrientation('default') },
  }
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}
```

`useApp.ts`:
```ts
import { useContext } from 'react'
import { AppContext } from './AppContext'

export function useApp() {
  const v = useContext(AppContext)
  if (!v) throw new Error('useApp must be used within AppProvider')
  return v
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/state/AppContext.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/state/ && git commit -m "feat: app state context (paint, brush, orientation, validation)"
```

---

### Task 9: Cube + Sticker components (`components/Cube.tsx`, `components/Sticker.tsx`)

**Files:**
- Create: `src/components/Sticker.tsx`, `src/components/Cube.tsx`, `src/components/Cube.test.tsx`
- Modify: `src/styles.css` (cube 3D + sky-blue background)

**Interfaces:**
- Consumes: `CubeState`, `Color`, `Face`, `Orientation`; `visibleFaces` (Task 2).
- Produces:
  - `Sticker({ color, onClick, isCenter })` — a colored square; empty when `color==null`; click calls `onClick` unless `isCenter`.
  - `Cube({ cube, orientation, onSticker })` — renders the 3 visible faces (top/left/right per `visibleFaces`) as 3×3 grids using CSS 3D; `onSticker(face, index)` fires on sticker tap. Applies a CSS class per orientation for the flip transition.

- [ ] **Step 1: Write the failing test** `src/components/Cube.test.tsx`

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Cube } from './Cube'
import { emptyCube } from '../lib/cube'

describe('Cube', () => {
  it('renders 27 stickers (3 visible faces x 9) and marks orientation', () => {
    const { container } = render(<Cube cube={emptyCube()} orientation="default" onSticker={() => {}} />)
    expect(container.querySelectorAll('[data-sticker]')).toHaveLength(27)
    expect(container.querySelector('.cube')?.className).toContain('default')
  })

  it('clicking a non-center sticker calls onSticker; center does not', () => {
    const onSticker = vi.fn()
    const { container } = render(<Cube cube={emptyCube()} orientation="default" onSticker={onSticker} />)
    const stickers = container.querySelectorAll<HTMLElement>('[data-sticker]')
    // find a center (index 4) and a non-center on the top face
    const top0 = container.querySelector<HTMLElement>('[data-face="U"][data-index="0"]')!
    const topCenter = container.querySelector<HTMLElement>('[data-face="U"][data-index="4"]')!
    top0.click(); topCenter.click()
    expect(onSticker).toHaveBeenCalledTimes(1)
    expect(onSticker).toHaveBeenCalledWith('U', 0)
    expect(stickers.length).toBe(27)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/Cube.test.tsx`
Expected: FAIL — cannot resolve `./Cube`.

- [ ] **Step 3: Write components + CSS**

`Sticker.tsx`:
```tsx
import type { Color } from '../types'

const HEX: Record<Color, string> = { W:'#f8f8f8', Y:'#ffd500', R:'#c41e3a', O:'#ff8c00', G:'#009e60', B:'#0051ba' }

export function Sticker({ color, onClick, isCenter, face, index }: {
  color: Color | null; onClick: () => void; isCenter: boolean; face: string; index: number
}) {
  return (
    <div
      data-sticker data-face={face} data-index={index}
      className={'sticker' + (isCenter ? ' center' : '') + (color ? '' : ' empty')}
      style={{ background: color ? HEX[color] : 'rgba(255,255,255,0.25)' }}
      onClick={() => { if (!isCenter) onClick() }}
    />
  )
}
```

`Cube.tsx`:
```tsx
import type { CubeState, Face, Orientation } from '../types'
import { visibleFaces } from '../lib/cube'
import { Sticker } from './Sticker'

export function Cube({ cube, orientation, onSticker }: {
  cube: CubeState; orientation: Orientation; onSticker: (face: Face, index: number) => void
}) {
  const v = visibleFaces(orientation)
  const facesToRender: { face: Face; cls: string }[] = [
    { face: v.top, cls: 'face-top' },
    { face: v.left, cls: 'face-left' },
    { face: v.right, cls: 'face-right' },
  ]
  return (
    <div className="scene">
      <div className={`cube ${orientation}`}>
        {facesToRender.map(({ face, cls }) => (
          <div key={cls} className={`face ${cls}`}>
            {cube[face].map((color, index) => (
              <Sticker key={index} color={color} isCenter={index === 4} face={face} index={index}
                onClick={() => onSticker(face, index)} />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
```

Append to `styles.css`: sky-blue radial gradient (bluer at edges), `.scene`
perspective, `.cube` `preserve-3d` + `transition: transform .6s`, `.cube.default`
vs `.cube.flipped` rotateY, `.face` `position:absolute` with rotateX/Y +
translateZ, `.face-top/left/right` transforms, `.sticker` 3×3 grid cell styling,
`.center` non-interactive cursor.

```css
.app {
  min-height: 100vh;
  background: radial-gradient(circle at 50% 45%, #cfeaff 0%, #7fbdf0 55%, #2f7fd6 100%);
  padding: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);
  display: flex; flex-direction: column; align-items: center;
}
.scene { perspective: 800px; width: 260px; height: 260px; margin: 24px auto; }
.cube { position: relative; width: 100%; height: 100%; transform-style: preserve-3d; transition: transform .6s ease; }
.cube.default { transform: rotateX(-24deg) rotateY(-36deg); }
.cube.flipped { transform: rotateX(-24deg) rotateY(144deg); }
.face { position: absolute; width: 120px; height: 120px; left: 70px; top: 70px;
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 3px; padding: 3px; background:#111; border-radius: 6px; }
.face-top   { transform: rotateX(90deg) translateZ(60px); }
.face-left  { transform: rotateY(-90deg) translateZ(60px); }
.face-right { transform: translateZ(60px); }
.sticker { border-radius: 4px; }
.sticker.center { cursor: default; }
.sticker.empty { border: 1px dashed rgba(255,255,255,0.6); }
```

**Implementer note:** the exact face transforms may need tuning so top/left/right
read as a corner-on cube; adjust `rotateX/Y/translateZ` visually via `npm run dev`.
The test only asserts sticker count, orientation class, and click behavior — not
pixel geometry — so CSS tuning won't break tests.

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/components/Cube.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/Sticker.tsx src/components/Cube.tsx src/components/Cube.test.tsx src/styles.css
git commit -m "feat: CSS-3D cube and sticker components"
```

---

### Task 10: Palette + FlipButton (`components/Palette.tsx`, `components/FlipButton.tsx`)

**Files:**
- Create: `src/components/Palette.tsx`, `src/components/FlipButton.tsx`, `src/components/Palette.test.tsx`

**Interfaces:**
- Consumes: `Color` (Task 2).
- Produces:
  - `Palette({ remaining, brush, onPick })` — six circles in order Y,R,B,W,O,G; each shows `remaining[color]`; active brush highlighted; click → `onPick(color)`.
  - `FlipButton({ onФlip })` → **correction**: `FlipButton({ onFlip })` — a button with two arrows around a cube glyph; click → `onFlip()`.

- [ ] **Step 1: Write the failing test** `src/components/Palette.test.tsx`

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Palette } from './Palette'

const remaining = { Y:8, R:7, B:8, W:0, O:8, G:8 } as const

describe('Palette', () => {
  it('renders six circles in order Y,R,B,W,O,G with counts', () => {
    render(<Palette remaining={remaining} brush="W" onPick={() => {}} />)
    const circles = screen.getAllByRole('button')
    expect(circles).toHaveLength(6)
    expect(circles[0]).toHaveAttribute('data-color', 'Y')
    expect(circles[3]).toHaveAttribute('data-color', 'W')
    expect(circles[3].textContent).toBe('0')
    expect(circles[1].textContent).toBe('7')
  })

  it('clicking a circle picks that color', () => {
    const onPick = vi.fn()
    render(<Palette remaining={remaining} brush="W" onPick={onPick} />)
    screen.getAllByRole('button')[0].click()
    expect(onPick).toHaveBeenCalledWith('Y')
  })

  it('marks the active brush', () => {
    render(<Palette remaining={remaining} brush="R" onPick={() => {}} />)
    expect(screen.getAllByRole('button')[1].className).toContain('active')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/Palette.test.tsx`
Expected: FAIL — cannot resolve `./Palette`.

- [ ] **Step 3: Write both components**

`Palette.tsx`:
```tsx
import type { Color } from '../types'

const ORDER: Color[] = ['Y','R','B','W','O','G']
const HEX: Record<Color, string> = { W:'#f8f8f8', Y:'#ffd500', R:'#c41e3a', O:'#ff8c00', G:'#009e60', B:'#0051ba' }

export function Palette({ remaining, brush, onPick }: {
  remaining: Record<Color, number>; brush: Color; onPick: (c: Color) => void
}) {
  return (
    <div className="palette">
      {ORDER.map(c => (
        <button key={c} data-color={c}
          className={'chip' + (c === brush ? ' active' : '')}
          style={{ background: HEX[c], color: c === 'W' || c === 'Y' ? '#222' : '#fff' }}
          onClick={() => onPick(c)}>
          {remaining[c]}
        </button>
      ))}
    </div>
  )
}
```

`FlipButton.tsx`:
```tsx
export function FlipButton({ onFlip }: { onFlip: () => void }) {
  return (
    <button className="flip-btn" aria-label="翻转魔方" onClick={onFlip}>
      <span aria-hidden="true">⟲</span>
      <span className="flip-cube" aria-hidden="true">🧊</span>
      <span aria-hidden="true">⟳</span>
    </button>
  )
}
```

Add `.palette` (flex row, gap), `.chip` (round, 44px, bold number), `.chip.active`
(ring/scale), `.flip-btn` styles to `styles.css`.

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/components/Palette.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/Palette.tsx src/components/FlipButton.tsx src/components/Palette.test.tsx src/styles.css
git commit -m "feat: palette and flip button components"
```

---

### Task 11: Tutorial data + components (`data/tutorial.ts`, `components/TutorialSection.tsx`, `routes/Tutorial.tsx`)

**Files:**
- Create: `src/data/tutorial.ts`, `src/data/tutorial.test.ts`, `src/components/TutorialSection.tsx`, `src/routes/Tutorial.tsx`

**Interfaces:**
- Consumes: `TutorialSection` type (Task 2).
- Produces:
  - `TUTORIAL: TutorialSection[]` — exactly 8 entries, anchors `structure, cross, first-layer, middle, yellow-cross, yellow-face, ll-corners, ll-edges`, titles per spec.
  - `TutorialSection({ section })` — renders title, body, and `algs` as `<code>` chips.
  - `Tutorial` route — sticky tab-bar linking to each anchor; title `三阶魔方教程`; a back link to `/`.

- [ ] **Step 1: Write the failing test** `src/data/tutorial.test.ts`

```ts
import { describe, it, expect } from 'vitest'
import { TUTORIAL } from './tutorial'

describe('tutorial data', () => {
  it('has exactly 8 sections with unique anchors', () => {
    expect(TUTORIAL).toHaveLength(8)
    const anchors = TUTORIAL.map(s => s.anchor)
    expect(new Set(anchors).size).toBe(8)
  })

  it('first section is 魔方结构, then the 7 solve steps in order', () => {
    expect(TUTORIAL[0].title).toContain('魔方结构')
    expect(TUTORIAL[1].title).toContain('白色十字')
    expect(TUTORIAL[2].title).toContain('白色面')
    expect(TUTORIAL[3].title).toContain('中层')
    expect(TUTORIAL[4].title).toContain('黄色十字')
    expect(TUTORIAL[5].title).toContain('黄色面')
    expect(TUTORIAL[6].title).toContain('凹字')
    expect(TUTORIAL[7].title).toContain('顶层棱块')
  })

  it('every section has non-empty body', () => {
    for (const s of TUTORIAL) expect(s.body.length).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/data/tutorial.test.ts`
Expected: FAIL — cannot resolve `./tutorial`.

- [ ] **Step 3: Write data + components**

Write `src/data/tutorial.ts` with the 8 sections (real Chinese explanatory
`body` text + standard beginner `algs` per step: white cross/corners intuitive,
middle-layer `U R U' R' U' F' U F` / mirror, yellow cross `F R U R' U' F'`,
yellow face `R U R' U R U2 R'` (Sune), LL corners `U R U' L' U R' U' L`, LL edges
`R U' R U R U R U' R' U' R2`). Then `TutorialSection.tsx` and `Tutorial.tsx`.

`TutorialSection.tsx`:
```tsx
import type { TutorialSection as TS } from '../types'

export function TutorialSection({ section }: { section: TS }) {
  return (
    <section id={section.anchor} className="tut-section">
      <h2>{section.title}</h2>
      <p>{section.body}</p>
      {section.algs.length > 0 && (
        <div className="alg-row">{section.algs.map((a, i) => <code key={i}>{a}</code>)}</div>
      )}
    </section>
  )
}
```

`Tutorial.tsx`:
```tsx
import { Link } from 'react-router-dom'
import { TUTORIAL } from '../data/tutorial'
import { TutorialSection } from '../components/TutorialSection'

export default function Tutorial() {
  return (
    <div className="app tutorial">
      <header className="tut-header">
        <Link to="/" className="back">‹ 返回</Link>
        <h1>三阶魔方教程</h1>
      </header>
      <nav className="tut-tabs">
        {TUTORIAL.map(s => <a key={s.anchor} href={`#${s.anchor}`}>{s.title.replace(/^[0-9.]+\s*/, '').slice(0,4)}</a>)}
      </nav>
      <div className="tut-body">
        {TUTORIAL.map(s => <TutorialSection key={s.anchor} section={s} />)}
      </div>
    </div>
  )
}
```

Add `.tut-tabs` (sticky, horizontal scroll), `.tut-section`, `.alg-row code`
styles to `styles.css`.

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/data/tutorial.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/data/tutorial.ts src/data/tutorial.test.ts src/components/TutorialSection.tsx src/routes/Tutorial.tsx
git commit -m "feat: three-layer cube tutorial content and screen"
```

---

### Task 12: Paint route + wiring (`routes/Paint.tsx`, `components/BuildInfo.tsx`, `App.tsx`, `main.tsx`)

**Files:**
- Create: `src/routes/Paint.tsx`, `src/components/BuildInfo.tsx`, `src/routes/Paint.test.tsx`
- Modify: `src/App.tsx`, `src/main.tsx`

**Interfaces:**
- Consumes: `useApp` (Task 8); `Cube` (Task 9); `Palette`, `FlipButton` (Task 10); `UNSOLVABLE_MESSAGE` (Task 5).
- Produces: the Paint screen (`/`) with header row (`填色` centered + book icon right → links `/tutorial`), cube, flip button, hint line, palette, reset, unsolvable message, and a "开始复原" link to `/solve` shown when solvable. `BuildInfo` at bottom. `main.tsx` wraps `App` in `AppProvider`.

- [ ] **Step 1: Write the failing test** `src/routes/Paint.test.tsx`

```tsx
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AppProvider } from '../state/AppContext'
import Paint from './Paint'

function renderPaint() {
  return render(<MemoryRouter><AppProvider><Paint /></AppProvider></MemoryRouter>)
}

describe('Paint screen', () => {
  beforeEach(() => localStorage.clear())

  it('shows the 填色 prompt, hint line, and tutorial link', () => {
    renderPaint()
    expect(screen.getByText('填色')).toBeInTheDocument()
    expect(screen.getByText('请根据手上魔方各面颜色对图中魔方进行填色')).toBeInTheDocument()
    expect(screen.getByLabelText('教程')).toBeInTheDocument()
  })

  it('does not show solve link or unsolvable message on an empty cube', () => {
    renderPaint()
    expect(screen.queryByText('开始复原')).not.toBeInTheDocument()
    expect(screen.queryByText(/填色状态不可解/)).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/routes/Paint.test.tsx`
Expected: FAIL — cannot resolve `./Paint`.

- [ ] **Step 3: Write `BuildInfo.tsx`, `Paint.tsx`, update `App.tsx` + `main.tsx`**

`BuildInfo.tsx`:
```tsx
export function BuildInfo() {
  const text = `v${__APP_VERSION__} · ${__GIT_SHA__} · ${__BUILD_TIME__}`
  return (
    <button className="build-info" onClick={() => navigator.clipboard?.writeText(text)}>{text}</button>
  )
}
```

`Paint.tsx`:
```tsx
import { Link } from 'react-router-dom'
import { useApp } from '../state/useApp'
import { Cube } from '../components/Cube'
import { Palette } from '../components/Palette'
import { FlipButton } from '../components/FlipButton'
import { BuildInfo } from '../components/BuildInfo'

export default function Paint() {
  const { cube, orientation, brush, remaining, paintSticker, setBrush, flip, reset, full, validation } = useApp()
  return (
    <div className="app paint">
      <header className="paint-header">
        <span className="spacer" />
        <h1 className="title-fill">填色</h1>
        <Link to="/tutorial" className="book-btn" aria-label="教程">📖</Link>
      </header>

      <Cube cube={cube} orientation={orientation} onSticker={paintSticker} />

      <FlipButton onFlip={flip} />
      <p className="hint">请根据手上魔方各面颜色对图中魔方进行填色</p>

      <Palette remaining={remaining} brush={brush} onPick={setBrush} />

      {full && validation && !validation.solvable && (
        <p className="unsolvable">{validation.reason}</p>
      )}
      {full && validation?.solvable && (
        <Link to="/solve" className="solve-link">开始复原</Link>
      )}

      <button className="reset-btn" onClick={reset}>重置</button>
      <BuildInfo />
    </div>
  )
}
```

`App.tsx`:
```tsx
import { HashRouter, Routes, Route } from 'react-router-dom'
import Paint from './routes/Paint'
import Solve from './routes/Solve'
import Tutorial from './routes/Tutorial'

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Paint />} />
        <Route path="/solve" element={<Solve />} />
        <Route path="/tutorial" element={<Tutorial />} />
      </Routes>
    </HashRouter>
  )
}
```

`main.tsx`: wrap `<App/>` in `<AppProvider>`.

**Note:** `App.tsx` imports `Solve` — Task 13 creates it. To keep this task
independently green, create a minimal `src/routes/Solve.tsx` stub here
(`export default function Solve(){ return <div className="app">复原</div> }`)
and flesh it out in Task 13.

- [ ] **Step 4: Run tests + full build**

Run: `npx vitest run src/routes/Paint.test.tsx`
Expected: PASS (2 tests).
Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/routes/Paint.tsx src/routes/Paint.test.tsx src/routes/Solve.tsx src/components/BuildInfo.tsx src/App.tsx src/main.tsx
git commit -m "feat: paint screen wired to state, tutorial link, solve gating"
```

---

### Task 13: Solve overlay (`routes/Solve.tsx`, `components/SolveControls.tsx`)

**Files:**
- Modify: `src/routes/Solve.tsx`
- Create: `src/components/SolveControls.tsx`, `src/routes/Solve.test.tsx`

**Interfaces:**
- Consumes: `useApp` (cube, validation) (Task 8); `solve`, `STAGES` (Task 6); `applyMoves` (Task 3); `cloneCube` (Task 2); `Cube` (Task 9).
- Produces: the `/solve` screen. On mount, computes `solve(cube)` once into `SolveStep[]`; keeps a `stepIndex`; renders the `Cube` at a state derived by applying all moves up to `stepIndex`; caption shows current stage + move notation + note + progress; `SolveControls` gives Prev/Next/Play; a `返回填色` link to `/`. If the cube is not solvable/full, redirect to `/`.

- [ ] **Step 1: Write the failing test** `src/routes/Solve.test.tsx`

```tsx
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { AppProvider } from '../state/AppContext'
import Solve from './Solve'

// Seed a solved cube into storage so validation passes and solve() is trivial.
import { solvedCube } from '../lib/cube'

function renderSolve() {
  localStorage.setItem('rc.paint', JSON.stringify(solvedCube()))
  return render(
    <MemoryRouter initialEntries={['/solve']}>
      <AppProvider>
        <Routes>
          <Route path="/solve" element={<Solve />} />
          <Route path="/" element={<div>PAINT</div>} />
        </Routes>
      </AppProvider>
    </MemoryRouter>,
  )
}

describe('Solve screen', () => {
  beforeEach(() => localStorage.clear())

  it('renders controls and a back-to-paint link for a solvable cube', () => {
    renderSolve()
    expect(screen.getByText('返回填色')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /下一步|完成/ })).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/routes/Solve.test.tsx`
Expected: FAIL — current `Solve` is the stub without controls.

- [ ] **Step 3: Write `SolveControls.tsx` and full `Solve.tsx`**

`SolveControls.tsx`:
```tsx
export function SolveControls({ index, total, onPrev, onNext, onPlay, playing }: {
  index: number; total: number; onPrev: () => void; onNext: () => void; onPlay: () => void; playing: boolean
}) {
  const atEnd = index >= total
  return (
    <div className="solve-controls">
      <button onClick={onPrev} disabled={index === 0}>上一步</button>
      <button onClick={onPlay}>{playing ? '暂停' : '播放'}</button>
      <button onClick={onNext} disabled={atEnd}>{atEnd ? '完成' : '下一步'}</button>
    </div>
  )
}
```

`Solve.tsx`:
```tsx
import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useApp } from '../state/useApp'
import { solve } from '../lib/solver'
import { applyMoves } from '../lib/moves'
import { Cube } from '../components/Cube'
import { SolveControls } from '../components/SolveControls'

export default function Solve() {
  const { cube, full, validation, orientation } = useApp()
  const solvable = full && validation?.solvable
  const steps = useMemo(() => (solvable ? solve(cube) : []), [cube, solvable])
  const flatMoves = useMemo(() => steps.flatMap(s => s.moves), [steps])
  const [i, setI] = useState(0)            // number of moves applied
  const [playing, setPlaying] = useState(false)

  useEffect(() => {
    if (!playing) return
    if (i >= flatMoves.length) { setPlaying(false); return }
    const t = setTimeout(() => setI(n => n + 1), 700)
    return () => clearTimeout(t)
  }, [playing, i, flatMoves.length])

  if (!solvable) return <Navigate to="/" replace />

  const shown = applyMoves(cube, flatMoves.slice(0, i))
  // find which step the current move belongs to for the caption
  let acc = 0, current = steps[0]
  for (const s of steps) { if (i <= acc + s.moves.length) { current = s; break } acc += s.moves.length }

  return (
    <div className="app solve">
      <header className="solve-header">
        <Link to="/" className="back">返回填色</Link>
        <span className="progress">{i}/{flatMoves.length}</span>
      </header>
      <Cube cube={shown} orientation={orientation} onSticker={() => {}} />
      <p className="solve-caption"><b>{current?.stage}</b> — {current?.note}</p>
      <SolveControls index={i} total={flatMoves.length} playing={playing}
        onPrev={() => setI(n => Math.max(0, n - 1))}
        onNext={() => setI(n => Math.min(flatMoves.length, n + 1))}
        onPlay={() => setPlaying(p => !p)} />
    </div>
  )
}
```

Add `.solve-controls`, `.solve-caption`, `.progress` styles.

**Note:** the solve view animates by re-rendering the cube state per move (the
`.cube` transition still smooths orientation; per-move layer-spin animation is a
future enhancement, out of scope per spec). Reusing `Cube` keeps rendering in one
place; the underlying paint state is never mutated (solve works on a copy via
`applyMoves`).

- [ ] **Step 4: Run tests + full test suite + build**

Run: `npx vitest run src/routes/Solve.test.tsx`
Expected: PASS.
Run: `npm run test`
Expected: entire suite green.
Run: `npm run build`
Expected: succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/routes/Solve.tsx src/routes/Solve.test.tsx src/components/SolveControls.tsx src/styles.css
git commit -m "feat: solve overlay stepping through LBL solution"
```

---

### Task 14: Final polish, README, verification

**Files:**
- Modify: `src/styles.css` (visual pass), `README.md`

**Interfaces:** none new.

- [ ] **Step 1: Visual pass in dev**

Run: `npm run dev`. Verify on a narrow (iPhone) viewport: sky-blue gradient is bluer at edges; `填色` centered with book icon right; cube reads as a corner-on 3D cube; flip animates and shows Y/B/R centers; palette counts decrement; filling all 48 with a solved layout shows 开始复原; an unsolvable fill shows the verbatim message. Adjust CSS only.

- [ ] **Step 2: Finalize README**

Write develop/build/test/deploy/iOS-install sections mirroring CalorieCounter, with the RubikCube live URL placeholder.

- [ ] **Step 3: Full verification**

Run: `npm run test` → all green.
Run: `npm run build` → succeeds, `dist/` present.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "chore: visual polish and README"
```

- [ ] **Step 5: Push / deploy note**

Create the GitHub repo `RubikCube`, set **Settings → Pages → Source = GitHub Actions**, push `main`. The workflow builds and deploys. (Manual, user-performed step.)

---

## Self-Review Notes (author)

- **Spec coverage:** req1 (Tasks 1,7,14) · req2 填色 top word (Task 12) · req3 gradient bg (Task 9) · req4 default centers W/O/G (Task 2 test) · req5 flip + Y/R/B centers + hint line (Tasks 2,10,12) · req6 six palette circles with counts (Task 10) · req7 solvability + verbatim message (Tasks 5,12) · req8 solve overlay + back-to-paint (Task 13) · req9 book button + 三阶魔方教程 + 8 tabs + steps (Task 11). All covered.
- **Placeholder scan:** goal cell-sets/CSS transforms are explicitly flagged as tune-to-green with the acceptance test as the gate — not silent TODOs. No bare "handle errors" steps.
- **Type consistency:** `Move {face,dir}`, `SolveStep {stage,moves,note}`, `TutorialSection {anchor,title,body,algs}`, `CubeState`, `Orientation`, `visibleFaces`, `remainingCounts`, `validate`, `solve`/`STAGES`, `toCubies` used consistently across tasks. `FlipButton` prop is `onFlip` (typo corrected in interface).
```
