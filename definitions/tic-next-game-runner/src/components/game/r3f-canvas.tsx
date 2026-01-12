"use client"

import type { RootState } from "@react-three/fiber"
import { Canvas, useFrame } from "@react-three/fiber"
import * as React from "react"
import type { Mesh } from "three"

export type R3FCanvasProps = Readonly<{
  className?: string
  /**
   * Clamp DPR on mobile for performance.
   * Default is `[1, 2]`.
   */
  dpr?: number | readonly [number, number]
  /**
   * Use continuous rendering only when needed.
   * Default is `"always"`.
   */
  frameloop?: "always" | "demand" | "never"
}>

function SpinningBox(): React.JSX.Element {
  const meshRef = React.useRef<Mesh | null>(null)

  useFrame((state: RootState, delta: number) => {
    const mesh = meshRef.current
    if (!mesh) return
    mesh.rotation.x += delta * 0.6
    mesh.rotation.y += delta * 0.9
  })

  return (
    <mesh ref={meshRef}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#60a5fa" roughness={0.7} metalness={0.1} />
    </mesh>
  )
}

/**
 * Minimal React Three Fiber example for mobile-first sandbox usage.
 *
 * Usage (optional):
 * - Wrap with `MobileGameShell` and render in `src/app/page.tsx`
 */
export function R3FCanvas({
  className,
  dpr = [1, 2],
  frameloop = "always",
}: R3FCanvasProps): React.JSX.Element {
  return (
    <Canvas
      className={className}
      dpr={dpr as number | [number, number]}
      frameloop={frameloop}
      gl={{
        antialias: true,
        alpha: false,
        powerPreference: "high-performance",
      }}
      camera={{ position: [0, 0, 3], fov: 55 }}
    >
      <color attach="background" args={["#0b0f1a"]} />
      <ambientLight intensity={0.6} />
      <directionalLight position={[3, 3, 3]} intensity={0.9} />
      <SpinningBox />
    </Canvas>
  )
}

