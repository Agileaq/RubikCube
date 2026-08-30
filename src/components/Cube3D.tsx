import { Canvas } from '@react-three/fiber'
import { cubiesFromState } from '../lib/cube3d'
import type { CubeState, Color, Move } from '../types'

const HEX: Record<Color, string> = {
  W: '#f8f8f8', Y: '#ffd500', R: '#c41e3a',
  O: '#ff8c00', G: '#009e60', B: '#0051ba',
}
const GAP = 1.08 // cubie spacing
const BLACK = '#111'

export interface CubieMeshData {
  pos: [number, number, number]
  faceColors: (Color | null)[]
}

export function cubieMeshData(cube: CubeState): CubieMeshData[] {
  return cubiesFromState(cube).map((c) => ({ pos: c.pos, faceColors: c.colors }))
}

interface FacePlane {
  color: string
  pos: [number, number, number]
  rot: [number, number, number]
}

function Cubie({ pos, faceColors }: {
  pos: [number, number, number]
  faceColors: (Color | null)[]
}) {
  const [x, y, z] = pos
  const faces: FacePlane[] = [
    { color: faceColors[0] ? HEX[faceColors[0]] : BLACK, pos: [0.5, 0, 0], rot: [0, Math.PI / 2, 0] },   // +x R
    { color: faceColors[1] ? HEX[faceColors[1]] : BLACK, pos: [-0.5, 0, 0], rot: [0, Math.PI / 2, 0] },  // -x L
    { color: faceColors[2] ? HEX[faceColors[2]] : BLACK, pos: [0, 0.5, 0], rot: [-Math.PI / 2, 0, 0] }, // +y U
    { color: faceColors[3] ? HEX[faceColors[3]] : BLACK, pos: [0, -0.5, 0], rot: [Math.PI / 2, 0, 0] }, // -y D
    { color: faceColors[4] ? HEX[faceColors[4]] : BLACK, pos: [0, 0, 0.5], rot: [0, 0, 0] },           // +z F
    { color: faceColors[5] ? HEX[faceColors[5]] : BLACK, pos: [0, 0, -0.5], rot: [0, 0, 0] },          // -z B
  ]
  return (
    <group position={[x * GAP, y * GAP, z * GAP]} data-cubie>
      {/* black core */}
      <mesh>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={BLACK} />
      </mesh>
      {faces.map((f, i) => (
        <mesh key={i} position={f.pos} rotation={f.rot}>
          <planeGeometry args={[0.92, 0.92]} />
          <meshStandardMaterial color={f.color} />
        </mesh>
      ))}
    </group>
  )
}

export function Cube3D({ cube, pendingMove, stepMs, onAnimDone }: {
  cube: CubeState
  pendingMove: Move | null
  stepMs: number
  onAnimDone?: () => void
}) {
  // Animation (Task 6) and arrow (Task 7) are not implemented yet; the props
  // are accepted to keep the component signature stable.
  void pendingMove
  void stepMs
  void onAnimDone

  const data = cubieMeshData(cube)
  return (
    <div className="cube3d-wrap" data-testid="canvas">
      <Canvas camera={{ position: [3.5, 3.5, 3.5], fov: 45 }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 8, 5]} intensity={0.8} />
        <group rotation={[0, 0, 0]}>
          {data.map((c, i) => (
            <Cubie key={i} pos={c.pos} faceColors={c.faceColors} />
          ))}
        </group>
      </Canvas>
    </div>
  )
}
