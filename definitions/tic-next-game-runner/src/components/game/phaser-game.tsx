"use client"

import * as React from "react"

export type PhaserGameProps = Readonly<{
  /**
   * Logical game resolution (the game will be scaled to fit the container).
   */
  logicalWidth?: number
  logicalHeight?: number
  className?: string
}>

/**
 * Minimal Phaser example for Next.js App Router (mobile-first).
 *
 * - Client-only
 * - Dynamic import for SSR safety
 * - Proper destroy on unmount
 * - Conservative DPR clamp
 *
 * Usage (optional):
 * - Wrap with `MobileGameShell` and render in `src/app/page.tsx`
 */
export function PhaserGame({
  logicalWidth = 360,
  logicalHeight = 640,
  className,
}: PhaserGameProps): React.JSX.Element {
  const hostRef = React.useRef<HTMLDivElement | null>(null)
  const gameRef = React.useRef<unknown>(null)

  React.useEffect(() => {
    let cancelled = false

    async function start(): Promise<void> {
      if (!hostRef.current) return

      const Phaser = await import("phaser")
      if (cancelled) return

      // Avoid re-creating if hot-reload runs effect twice.
      if (gameRef.current) return

      const dpr = Math.min(window.devicePixelRatio || 1, 2)

      type PhaserGameInstance = Record<string, unknown> & {
        destroy?: (removeCanvas?: boolean) => void
        renderer?: { resolution?: number }
        scale?: { refresh?: () => void }
        __ticCleanup?: () => void
      }

      class DemoScene extends Phaser.Scene {
        public create(): void {
          const w = this.scale.gameSize.width
          const h = this.scale.gameSize.height

          this.cameras.main.setBackgroundColor("#0b0f1a")

          const title = this.add
            .text(w / 2, h / 2 - 16, "Phaser Sandbox", {
              fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial",
              fontSize: "22px",
              color: "#e5e7eb",
            })
            .setOrigin(0.5, 0.5)

          const hint = this.add
            .text(w / 2, h / 2 + 20, "Tap anywhere", {
              fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial",
              fontSize: "14px",
              color: "#9ca3af",
            })
            .setOrigin(0.5, 0.5)

          this.input.on("pointerdown", () => {
            title.setText("Nice.")
            hint.setText("Now replace this scene.")
          })
        }
      }

      const game = new Phaser.Game({
        type: Phaser.AUTO,
        parent: hostRef.current,
        width: logicalWidth,
        height: logicalHeight,
        backgroundColor: "#0b0f1a",
        scene: [DemoScene],
        scale: {
          mode: Phaser.Scale.FIT,
          autoCenter: Phaser.Scale.CENTER_BOTH,
        },
        input: {
          activePointers: 2,
        },
        render: {
          antialias: true,
          pixelArt: false,
        },
        fps: {
          target: 60,
          forceSetTimeOut: false,
        },
      })

      // Phaser config uses `resolution` rather than `devicePixelRatio`,
      // but we can approximate by setting the game renderer's resolution.
      const g = game as unknown as PhaserGameInstance
      if (g.renderer) g.renderer.resolution = dpr

      gameRef.current = game

      const onResize = (): void => {
        // FIT mode should handle canvas size, but refreshing helps on mobile WebViews.
        g.scale?.refresh?.()
      }

      window.addEventListener("resize", onResize, { passive: true })
      window.addEventListener("orientationchange", onResize, { passive: true })

      // Cleanup handler stored on the game instance for simplicity.
      g.__ticCleanup = () => {
        window.removeEventListener("resize", onResize)
        window.removeEventListener("orientationchange", onResize)
      }
    }

    void start()

    return () => {
      cancelled = true
      const game = gameRef.current as
        | (Record<string, unknown> & {
            destroy?: (removeCanvas?: boolean) => void
            __ticCleanup?: () => void
          })
        | null

      try {
        game?.__ticCleanup?.()
        game?.destroy?.(true)
      } finally {
        gameRef.current = null
        if (hostRef.current) hostRef.current.innerHTML = ""
      }
    }
  }, [logicalWidth, logicalHeight])

  return <div ref={hostRef} className={className} />
}

