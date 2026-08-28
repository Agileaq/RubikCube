export type Color = 'W' | 'R' | 'O' | 'Y' | 'G' | 'B'
export type Face = 'U' | 'D' | 'L' | 'R' | 'F' | 'B'
export type Orientation = 'default' | 'flipped'
export type CubeState = Record<Face, (Color | null)[]>

export interface Move { face: Face; dir: 1 | -1 | 2 } // 1=cw, -1=ccw, 2=180
export interface SolveStep { stage: string; moves: Move[]; note: string }
export interface TutorialSection { anchor: string; title: string; body: string; algs: string[] }
