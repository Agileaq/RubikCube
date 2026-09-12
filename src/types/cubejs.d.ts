// Minimal typing for the `cubejs` Kociemba solver (no shipped types).
// Only the surface lib/kociemba.ts uses is declared; slot conventions
// (corners URF..DRB = 0..7, edges UR..BR = 0..11, co mod 3 / eo mod 2)
// match our cubie.ts exactly, which the round-trip test verifies.
declare module 'cubejs' {
  export class Cube {
    center: number[]
    cp: number[]
    co: number[]
    ep: number[]
    eo: number[]
    constructor(other?: Cube)
    static initSolver(): void
    solve(maxDepth?: number): string
    move(arg: string): Cube
    asString(): string
    isSolved(): boolean
    static random(): Cube
    static fromString(str: string): Cube
  }
}
