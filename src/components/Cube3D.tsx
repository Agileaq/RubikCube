import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Text } from '@react-three/drei'
import { Suspense, useEffect, useRef, useState } from 'react'
import type { MutableRefObject } from 'react'
import * as THREE from 'three'
import {
  applyLayerTurn,
  cubiesFromState,
  GAP,
  layerPositions,
  ringArrowGeometry,
  turnDirection,
} from '../lib/cube3d'
import type { CubeState, Color, Move } from '../types'

const HEX: Record<Color, string> = {
  W: '#f8f8f8', Y: '#ffd500', R: '#c41e3a',
  O: '#ff8c00', G: '#009e60', B: '#0051ba',
}
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

// ---------------------------------------------------------------------------
// Ring flow arrows (direction indicator)
// ---------------------------------------------------------------------------
// Purple arrows lying ON the side faces of the turning layer's edge cubies —
// one per side face, spanning its full 3-sticker row — riding the rotating
// layer group. Pure geometry lives in lib/cube3d.ts (`ringArrowGeometry`) as
// the jsdom-testable surface; this component only renders shafts + chevron
// heads + optional "2" badges. Visible while the turn animates, gone the
// moment it ends (mount gated by `animating`).
const ARROW_COLOR = '#9333ea' // purple
function RingArrow({ face, dir }: { face: Move['face']; dir: Move['dir'] }) {
  const g = ringArrowGeometry(face, dir)
  return (
    <group>
      {g.bars.map((b, i) => (
        <mesh key={'b' + i} position={b.pos as unknown as [number, number, number]}>
          <boxGeometry args={b.dims} />
          <meshStandardMaterial color={ARROW_COLOR} />
        </mesh>
      ))}
      {g.wings.map((w, i) => (
        <mesh
          key={'w' + i}
          position={w.pos as unknown as [number, number, number]}
          rotation={w.rot}
        >
          <boxGeometry args={w.dims} />
          <meshStandardMaterial color={ARROW_COLOR} />
        </mesh>
      ))}
      {g.badges.map((b, i) => (
        <Suspense key={'g' + i} fallback={null}>
          {/* purple "2" seated in the shaft gap over the middle block's sticker.
              Same-color outline acts as faux bold without fetching a bold font. */}
          <Text
            position={b.pos as unknown as [number, number, number]}
            rotation={b.rot}
            fontSize={0.45}
            outlineWidth={0.024}
            outlineColor={ARROW_COLOR}
            color={ARROW_COLOR}
            anchorX="center"
            anchorY="middle"
          >
            2
          </Text>
        </Suspense>
      ))}
    </group>
  )
}

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
  // Sticker planes sit at ±0.51, NOT ±0.5: the black box core's surface is
  // exactly at ±0.5 (half of a 1×1×1 box), so a coplanar sticker z-fights with
  // the core and the black shows through in irregular patches. Nudging the
  // sticker just outside the core surface removes the depth conflict on all
  // six faces (front and back, since stickers are DoubleSide).
  const faces: FacePlane[] = [
    { color: faceColors[0] ? HEX[faceColors[0]] : BLACK, pos: [0.51, 0, 0], rot: [0, Math.PI / 2, 0] },   // +x R
    { color: faceColors[1] ? HEX[faceColors[1]] : BLACK, pos: [-0.51, 0, 0], rot: [0, Math.PI / 2, 0] },  // -x L
    { color: faceColors[2] ? HEX[faceColors[2]] : BLACK, pos: [0, 0.51, 0], rot: [-Math.PI / 2, 0, 0] }, // +y U
    { color: faceColors[3] ? HEX[faceColors[3]] : BLACK, pos: [0, -0.51, 0], rot: [Math.PI / 2, 0, 0] }, // -y D
    { color: faceColors[4] ? HEX[faceColors[4]] : BLACK, pos: [0, 0, 0.51], rot: [0, 0, 0] },           // +z F
    { color: faceColors[5] ? HEX[faceColors[5]] : BLACK, pos: [0, 0, -0.51], rot: [0, 0, 0] },          // -z B
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
          {/* DoubleSide so a face turned to the back shows its color, not the
              black core (planes are single-sided by default → back renders the
              core behind it, which looks like a black/missing face). */}
          <meshStandardMaterial color={f.color} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  )
}

// Inner scene rendered INSIDE <Canvas>. All R3F-context-dependent code lives
// here: `useFrame` and the `<group ref>` it drives, plus the R3F intrinsics
// (cubies, overlay layer, arrow, OrbitControls). The parent `Cube3D` owns the
// React state that must live above the Canvas (committed/animating/timing refs)
// and passes it down; `useFrame` only works because this component is a Canvas
// descendant (calling it from the Canvas PARENT throws "R3F: Hooks can only be
// used within the Canvas component!").
interface SceneProps {
  committed: CubeState
  pendingMove: Move | null
  stepMs: number
  animating: boolean
  startRef: MutableRefObject<number | null>
  setCommitted: (c: CubeState) => void
  setAnimating: (v: boolean) => void
  onAnimDone?: () => void
}

function Scene({
  committed, pendingMove, stepMs, animating,
  startRef, setCommitted, setAnimating, onAnimDone,
}: SceneProps) {
  const layerRef = useRef<THREE.Group>(null)

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
      // Snap the overlay to its FINAL angle (quarterTurns * 90°), NOT to 0.
      // React state updates (setCommitted/setAnimating) flush on the NEXT
      // render, so for the transition frame the overlay is still mounted and
      // the base layer's 9 cubies are still `hidden` (animating still true,
      // committed still pre-turn). Snapping the overlay rotation to 0 here
      // would render the turned face UN-rotated for that one frame — a
      // visible backward flicker on the face ("闪一下"). Snapping to the final
      // angle keeps the overlay showing the post-turn orientation for the
      // transition frame, which matches the about-to-commit base state, so
      // the handoff is seamless.
      const finalAngle = quarterTurns * (Math.PI / 2)
      const final = applyLayerTurn(committed, pendingMove.face, pendingMove.dir)
      if (axis === 'x') r.set(finalAngle, 0, 0)
      else if (axis === 'y') r.set(0, finalAngle, 0)
      else r.set(0, 0, finalAngle)
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
    <>
      <ambientLight intensity={1.0} />
      <directionalLight position={[5, 8, 5]} intensity={1.4} />
      <directionalLight position={[-5, -3, -5]} intensity={0.5} />
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
      {/* animated layer overlay: 9 cubie copies rotated about the face axis.
          The ring flow arrow is a CHILD of this group so it rides the turning
          cubies it is painted on, then unmounts when the turn ends. */}
      <group ref={layerRef}>
        {animating && pendingMove && layerPositionsArr.map((p, i) => {
          const c = data.find((d) => d.pos.join(',') === p.join(','))!
          return <Cubie key={'L' + i} pos={p} faceColors={c.faceColors} />
        })}
        {animating && pendingMove && (
          <RingArrow face={pendingMove.face} dir={pendingMove.dir} />
        )}
      </group>
      {/* user can orbit the view; pan disabled, zoom + polar clamped so the
          cube can't be flipped to a confusing upside-down view */}
      <OrbitControls
        enablePan={false}
        minDistance={4}
        maxDistance={12}
        minPolarAngle={Math.PI / 6}
        maxPolarAngle={Math.PI - Math.PI / 6}
      />
    </>
  )
}

export function Cube3D({ cube, pendingMove, stepMs, moveNonce, onAnimDone }: {
  cube: CubeState
  pendingMove: Move | null
  stepMs: number
  moveNonce: number
  onAnimDone?: () => void
}) {
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
    // animating is read here but intentionally not a dep: we re-sync on cube
    // changes, gating on the current animating flag.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cube])

  return (
    <div className="cube3d-wrap" data-testid="canvas">
      {/* Camera on the -x side so the default view shows U/L/F = white/orange/
          green, matching the paint screen's default three faces. */}
      <Canvas camera={{ position: [-5, 5, 5], fov: 45 }}>
        <Scene
          committed={committed}
          pendingMove={pendingMove}
          stepMs={stepMs}
          animating={animating}
          startRef={startRef}
          setCommitted={setCommitted}
          setAnimating={setAnimating}
          onAnimDone={onAnimDone}
        />
      </Canvas>
    </div>
  )
}
