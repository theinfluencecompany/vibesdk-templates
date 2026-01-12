"use client";

import type React from "react";
import { cn } from "@/lib/utils";

export type MobileGameShellProps = Readonly<{
  /**
   * The game surface, typically a `<canvas />` (Phaser/Three) or the engine container.
   * This area should capture gestures (pinch/pan) and suppress page scrolling.
   */
  children: React.ReactNode;
  /**
   * Optional HUD overlay (score, timer, buttons).
   * Render controls inside with `pointer-events-auto` if they are interactive.
   */
  hud?: React.ReactNode;
  className?: string;
  surfaceClassName?: string;
}>;

export function MobileGameShell({
  children,
  hud,
  className,
  surfaceClassName,
}: MobileGameShellProps): React.JSX.Element {
  return (
    <div className={cn("relative h-full w-full bg-background", className)}>
      <div className={cn("game-surface absolute inset-0", surfaceClassName)}>
        {children}
      </div>
      {hud ? (
        <div className="pointer-events-none absolute inset-0 safe-area-pad">
          {hud}
        </div>
      ) : null}
    </div>
  );
}

