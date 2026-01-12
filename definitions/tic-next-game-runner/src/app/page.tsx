export default function Home(): React.JSX.Element {
  return (
    <main className="h-full w-full">
      {/* Single-game sandbox entrypoint.
          Replace this with your Phaser/Three/canvas game client component. */}
      <div className="safe-area-pad flex h-full w-full items-center justify-center">
        <div className="max-w-sm text-center text-sm text-muted-foreground">
          Edit <span className="font-mono text-foreground">src/app/page.tsx</span> to start vibe coding your
          mini-game.
          <div className="mt-3 space-y-1 text-xs">
            <div>
              Optional example: <span className="font-mono text-foreground">src/components/game/phaser-game.tsx</span>
            </div>
            <div>
              Optional example: <span className="font-mono text-foreground">src/components/game/r3f-canvas.tsx</span>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
