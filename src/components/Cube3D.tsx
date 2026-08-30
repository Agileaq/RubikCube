import { Canvas, useFrame } from '@react-three/fiber'
import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import {
  applyLayerTurn,
  cubiesFromState,
  layerPositions,
  turnDirection,
} from '../lib/cube3d'
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

// Pure timing helpers (the testable surface — useFrame is a no-op in jsdom).
// easeInOutCubic for smooth start/stop. Clamped to [0,1] so overruns don't
// overshoot past the target angle.
export const animationProgress = (elapsedMs: number, stepMs: number) => {
  const t = Math.min(1, Math.max(0, elapsedMs / stepMs))
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}
export const isDone = (elapsedMs: number, stepMs: number) => elapsedMs >= stepMs

interface FacePlane {
  color: string
  pos: [number, number, number]
  rot: [number, number, number]
}

function Cubie({ pos, faceColors, hidden }: {
  pos: [number, number, number]
  faceColors: (Color | null)[]
  hidden?: boolean
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
    <group position={[x * GAP, y * GAP, z * GAP]} visible={!hidden} data-cubie>
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

export function Cube3D({ cube, pendingMove, stepMs, moveNonce, onAnimDone }: {
  cube: CubeState
  pendingMove: Move | null
  stepMs: number
  moveNonce: number
  onAnimDone?: () => void
}) {
  const layerRef = useRef<THREE.Group>(null)
  const startRef = useRef<number | null>(null)
  const [committed, setCommitted] = useState<CubeState>(cube)
  const [animating, setAnimating] = useState(false)

  // Trigger animation on each new step. moveNonce changes every step (including
  // repeated same-move steps), so depending on it (rather than pendingMove) lets
  // the effect retrigger — required for Task 8's prev/step-back over equal moves.
  useEffect(() => {
    if (pendingMove && !animating) {
      startRef.current = null
      setAnimating(true)
    }
    // pendingMove is read here but intentionally not a dep: moveNonce is the
    // retrigger signal; pendingMove is the move to animate.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moveNonce])

  // Re-sync committed when the parent changes `cube` externally (e.g. Task 8
  // manual prev/step-back), but never mid-animation — otherwise an external
  // change would clobber the in-flight layer swap.
  useEffect(() => {
    if (!animating) setCommitted(cube)
  }, [cube])

  useFrame((state) => {
    if (!animating || !pendingMove || !layerRef.current) return
    if (startRef.current === null) startRef.current = state.clock.elapsedTime * 1000
    const elapsed = state.clock.elapsedTime * 1000 - startRef.current
    const p = animationProgress(elapsed, stepMs)
    const { axis, quarterTurns } = turnDirection(pendingMove.face, pendingMove.dir)
    const angle = quarterTurns * (Math.PI / 2) * p
    const r = layerRef.current.rotation
    if (axis === 'x') r.set(angle, 0, 0)
    else if (axis === 'y') r.set(0, angle, 0)
    else r.set(0, 0, angle)
    if (isDone(elapsed, stepMs)) {
      // Snap overlay to 0, commit the post-turn state, notify parent. The swap
      // is seamless because applyLayerTurn produced the exact end state.
      const final = applyLayerTurn(committed, pendingMove.face, pendingMove.dir)
      r.set(0, 0, 0)
      setCommitted(final)
      setAnimating(false)
      onAnimDone?.()
    }
  })

  // The 9 layer positions while animating; empty otherwise so the overlay group
  // renders nothing and the base shows all 27 cubies.
  const layerPositionsArr = pendingMove && animating ? layerPositions(pendingMove.face) : []
  const layerSet = new Set(layerPositionsArr.map((p) => p.join(',')))
  const data = cubieMeshData(committed)
  return (
    <div className="cube3d-wrap" data-testid="canvas">
      <Canvas camera={{ position: [3.5, 3.5, 3.5], fov: 45 }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 8, 5]} intensity={0.8} />
        <group rotation={[0, 0, 0]}>
          {data.map((c, i) => (
            <Cubie
              key={i}
              pos={c.pos}
              faceColors={c.faceColors}
              hidden={animating && layerSet.has(c.pos.join(','))}
            />
          ))}
        </group>
        {/* animated layer overlay: 9 cubie copies rotated about the face axis */}
        <group ref={layerRef}>
          {animating && pendingMove && layerPositionsArr.map((p, i) => {
            const c = data.find((d) => d.pos.join(',') === p.join(','))!
            return <Cubie key={'L' + i} pos={p} faceColors={c.faceColors} />
          })}
        </group>
      </Canvas>
    </div>
  )
}
