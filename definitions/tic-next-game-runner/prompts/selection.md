# Template Selection — TIC Next.js Game Runner

## Use this template when:

- Building **mobile-first mini-games** for web/WebView
- Need **Phaser** (2D) or **React Three Fiber** (3D) game engines
- Want **AI-powered asset generation** (images, 3D models, music, SFX, voiceovers via fal.ai)
- Building **highly shareable games** with score cards, challenge codes, or clips
- Need **native-like mobile experience** with pinch/pan/rotate gestures
- Target **embedded WebView** in native apps (full-screen, safe-area aware)
- Want **fast time-to-fun** games (10-60 second sessions)
- Building games with **Gemini AI orchestration** and skills

## Avoid this template when:

- Building non-game applications (dashboards, forms, content sites)
- Don't need game engines or physics
- Building static marketing sites or SEO-heavy landing pages
- Need server-side rendering for all pages (this uses App Router but focuses on client-side game logic)
- Don't want Next.js (prefer simpler Vite templates instead)

## Key Features:

- **Next.js 15** with App Router
- **Phaser 3** for 2D games (on-demand loaded)
- **React Three Fiber + Drei** for 3D games (on-demand loaded)
- **Cloudflare deployment** via @opennextjs/cloudflare
- **fal.ai integration** for AI asset generation (images, 3D, audio, video)
- **Mobile-first gestures** (pinch, pan, rotate) with proper touch handling
- **Native-like UX** (full-bleed canvas, safe-area HUD, no accidental zoom)
- **Gemini AI skills** for game orchestration and procedural generation
- **Minimal bundle** by default (engines load on-demand)
- **Toast notifications** (Sonner)
- **Theme support** (next-themes)

## Mental Model:

Think of this as a **mobile mini-game sandbox** where:
- The entire app is a single-game experience (enters at `/`)
- Game engines are loaded on-demand to keep initial bundle small
- Mobile gestures work like native apps (no browser zoom interference)
- AI can generate game assets procedurally with cost controls
- Share triggers are built-in (score cards, clips, challenge codes)

## Tech Stack:

- **Runtime**: Next.js 15 + React 19 + TypeScript
- **2D Engine**: Phaser 3 (client-side, dynamically imported)
- **3D Engine**: Three.js + React Three Fiber + Drei (client-side, dynamically imported)
- **Physics**: Rapier 3D, Cannon.js (optional, for physics-based games)
- **AI Assets**: fal.ai SDK (images, 3D, audio, video generation)
- **Deployment**: Cloudflare Workers via @opennextjs/cloudflare
- **UI**: Tailwind CSS + Radix UI primitives + Sonner toasts
- **Forms**: React Hook Form + Zod validation
- **State**: Zustand (lightweight state management)
