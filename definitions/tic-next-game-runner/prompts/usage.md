# Usage Guide — TIC Next.js Game Runner

## Overview

This is a **mobile-first, single-game sandbox** template for building shareable mini-games on Cloudflare.

- **Entry point**: `/` (src/app/page.tsx)
- **Touch-first**: Canvas-ready defaults with pinch/pan/rotate gestures
- **Native-like UX**: WebView-friendly full-screen shell + safe-area helpers
- **AI assets**: fal.ai integration for procedural asset generation
- **Game engines**: Phaser (2D) and React Three Fiber (3D), loaded on-demand

## Quick Start

```bash
# Install dependencies
bun install

# Start development server
bun dev

# Build for production
bun run build

# Deploy to Cloudflare
bun run deploy
```

Open `http://localhost:3000` to see your game sandbox.

## Project Structure

```
src/
├── app/
│   ├── page.tsx           # Main game entry point
│   ├── layout.tsx         # Root layout with theme provider
│   └── globals.css        # Global styles + game-surface classes
├── components/
│   ├── game/
│   │   ├── phaser-game.tsx      # Phaser 2D example
│   │   ├── r3f-canvas.tsx       # React Three Fiber 3D example
│   │   └── mobile-game-shell.tsx # Full-screen game container
│   └── ui/                # Radix UI components (Shadcn)
├── lib/
│   ├── fal-client.ts      # fal.ai SDK wrapper
│   ├── native-share.ts    # Native share API helper
│   ├── gestures/          # Pinch/pan/rotate gesture handlers
│   └── game-dsl/          # Game Definition Schema Language
└── env.ts                 # Typed environment variables (T3 Env)
```

## Core Concepts

### 1. Single-Game Sandbox

- The app **always enters at `/`** and the game lives there
- Implement your mini-game in `src/app/page.tsx`
- Keep `/` runnable at all times; it should feel like a native mini app

### 2. Mobile-First Design

- **One-thumb controls** (tap/hold/swipe) by default
- **Readable UI** at small sizes; avoid tiny text
- **Fast loading**: minimal bundles, small textures, simple shaders
- **Touch gestures**: Use `.game-surface` class and gesture helpers
- **Safe areas**: UI respects notches/home indicators via `.safe-area-pad`

### 3. Game Engines (On-Demand)

#### Phaser (2D Games)

```tsx
// src/app/page.tsx
import dynamic from 'next/dynamic';

const PhaserGame = dynamic(
  () => import('@/components/game/phaser-game'),
  { ssr: false }
);

export default function GamePage() {
  return <PhaserGame />;
}
```

**Phaser Best Practices:**
- Always use `"use client"` for Phaser components
- Dynamically import Phaser inside `useEffect()` to avoid SSR
- Use stable logical resolution (e.g., 360×640) with contain/letterbox scaling
- Clamp DPR for performance: `Math.min(window.devicePixelRatio ?? 1, 2)`
- Clean up on unmount: `game.destroy(true)`
- **Animation compatibility**: Different game objects support different tween properties
  - `Sprite`, `Image`, `Container`: support `x`, `y`, `scale`, `alpha`, `rotation`
  - `Arc`, `Circle` (shape objects): support `x`, `y`, `radius`, `alpha` (NOT `scale`)
  - When animating shapes, use their specific properties (e.g., `radius` for circles)

#### React Three Fiber (3D Games)

```tsx
// src/app/page.tsx
import dynamic from 'next/dynamic';

const R3FCanvas = dynamic(
  () => import('@/components/game/r3f-canvas'),
  { ssr: false }
);

export default function GamePage() {
  return <R3FCanvas />;
}
```

**R3F Best Practices:**
- Keep Three.js imports client-side only
- Clamp DPR: `dpr={[1, 2]}` to prevent over-rendering
- Use `frameloop="demand"` for mostly-static scenes
- Avoid OrbitControls by default on mobile; use fixed camera
- Keep geometry/materials simple; avoid heavy postprocessing

### 4. Native-Like Gestures

```tsx
import { usePinchPanGesture } from '@/lib/gestures/use-pinch-pan-gesture';

function MyGame() {
  const containerRef = useRef<HTMLDivElement>(null);
  
  usePinchPanGesture(containerRef, {
    onPinch: ({ scale }) => {
      // Handle pinch-to-zoom
    },
    onPan: ({ deltaX, deltaY }) => {
      // Handle pan/drag
    },
    onRotate: ({ angle }) => {
      // Handle rotation
    }
  });

  return (
    <div ref={containerRef} className="game-surface">
      {/* Your game canvas */}
    </div>
  );
}
```

**Key Points:**
- Wrap canvas with `.game-surface` class to prevent browser zoom
- Use `usePinchPanGesture` hook or `attachPinchPanGesture` for custom gestures
- Browser pinch-zoom is disabled by default (viewport meta tag)
- Touch coordinates are client coords; convert using canvas bounds

### 5. AI Asset Generation (fal.ai)

```tsx
import { generateImage, generateMusic } from '@/lib/fal-client';

// Generate an image
const imageUrl = await generateImage({
  prompt: 'pixel art spaceship',
  model: 'fal-ai/fast-sdxl',
});

// Generate background music
const audioUrl = await generateMusic({
  prompt: 'upbeat 8-bit game music',
  duration: 30,
});
```

**Cost Control:**
- **Default: zero external API calls** unless explicitly requested
- **Max 3 external asset calls per game** (configurable)
- Prefer SVG, canvas primitives, procedural assets
- Cache results and reuse across variants

### 6. Full-Screen Game Shell

```tsx
import { MobileGameShell } from '@/components/game/mobile-game-shell';

export default function GamePage() {
  return (
    <MobileGameShell
      hud={
        <div className="flex justify-between items-start p-4">
          <div>Score: 100</div>
          <button>Pause</button>
        </div>
      }
    >
      <canvas ref={canvasRef} className="w-full h-full" />
    </MobileGameShell>
  );
}
```

**Features:**
- Full-bleed game surface (under notches)
- Safe-area padded HUD overlay
- Pointer-events-none by default on HUD (game receives all touches)
- Prevents outer scrolling

## Environment Variables

```bash
# .dev.vars
FAL_KEY=your-fal-api-key  # Required for AI asset generation
```

Uses **T3 Env** (`src/env.ts`) for typed environment access.

## Styling Guidelines

- **Game surface**: Use `.game-surface` class for canvas containers
- **Safe areas**: Use `.safe-area-pad` for HUD elements
- **Full-bleed**: Use `100dvh/100dvw` + `viewport-fit=cover`
- **Fonts**: Use `next/font/google` for self-hosted fonts (performance)
- **Tailwind**: Use utility classes; avoid inline styles

## Audio Best Practices

- Start **muted** by default with in-game toggle
- Only start audio **after user gesture** (tap)
- Use **Phaser built-in audio** for Phaser games
- Use **Howler.js** for standalone audio needs
- Keep assets tiny: short SFX, low sample rate
- Prefer **procedural SFX** (oscillator) over large files

## WebView / Embedded Constraints

- Runs inside **native app WebView** (not full browser)
- **Fixed root shell**: `100dvh/100dvw` + no outer scrolling
- Disable text selection by default (except inputs)
- Keep navigation self-contained (avoid opening new tabs)
- Respect safe areas: `env(safe-area-inset-*)`

## Deployment

```bash
# Build and deploy to Cloudflare
bun run deploy

# Or build and preview locally
bun run preview
```

Uses **@opennextjs/cloudflare** to compile Next.js to Cloudflare Workers.

## Gemini AI Skills

Located in `.gemini/skills/`:
- `mini-game-orchestrator`: End-to-end game generation (concept → GDD → implementation)
- `assets/fal-*-generator`: AI asset generation skills (image, 3D, music, SFX, video, voiceover)

See `GEMINI.md` for full AI orchestration guidelines.

## Important Rules

### ✅ Do:
- Build mobile-first with touch controls
- Load game engines on-demand (dynamic imports)
- Use provided gesture helpers for native-like feel
- Respect safe areas for HUD/UI
- Keep initial bundle small
- Cache and reuse AI-generated assets

### ❌ Don't:
- Import Phaser/Three.js from shared/always-loaded modules
- Use global touch-action: none (only on `.game-surface`)
- Rely on hover or precise mouse interactions
- Generate many AI assets without user approval
- Use heavy postprocessing or large textures by default
- Forget to clean up game instances on unmount

## Examples in Template

- **Phaser**: `src/components/game/phaser-game.tsx`
- **R3F**: `src/components/game/r3f-canvas.tsx`
- **Gestures**: `src/lib/gestures/use-pinch-pan-gesture.ts`
- **Game Shell**: `src/components/game/mobile-game-shell.tsx`

Copy and customize these as starting points for your games!
