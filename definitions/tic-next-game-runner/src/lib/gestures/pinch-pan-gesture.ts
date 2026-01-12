export type GesturePoint = Readonly<{
  x: number;
  y: number;
}>;

export type PinchPanGesturePhase = "start" | "move" | "end" | "cancel";

export type PinchPanGestureSnapshot = Readonly<{
  phase: PinchPanGesturePhase;
  pointers: number;
  /**
   * Center point in **client coordinates**.
   * Convert to canvas/world coordinates using your game surface bounds.
   */
  center: GesturePoint;
  /**
   * Delta from the previous emitted snapshot (client coords).
   */
  delta: GesturePoint;
  /**
   * Translation from the gesture start (client coords).
   */
  translation: GesturePoint;
  /**
   * Distance between the 2 touch points (only when `pointers === 2`).
   * Useful for debugging; typically you use `scale`.
   */
  pinchDistance?: number;
  /**
   * Scale relative to the start of the current 2-pointer gesture.
   * `1` at start; >1 zoom in; <1 zoom out.
   */
  scale: number;
  /**
   * Rotation in radians relative to the start of the current 2-pointer gesture.
   * Positive is clockwise in screen coordinates.
   */
  rotationRad: number;
  /**
   * Timestamp from `performance.now()`.
   */
  timestamp: number;
}>;

export type PinchPanGestureHandlers = Readonly<{
  onStart?: (snapshot: PinchPanGestureSnapshot) => void;
  onMove?: (snapshot: PinchPanGestureSnapshot) => void;
  onEnd?: (snapshot: PinchPanGestureSnapshot) => void;
  onCancel?: (snapshot: PinchPanGestureSnapshot) => void;
}>;

export type PinchPanGestureOptions = Readonly<{
  /**
   * If true (default), calls `preventDefault()` to suppress browser gestures
   * on the target element.
   */
  preventDefault?: boolean;
  /**
   * If true (default), captures pointers so the gesture stays stable even if
   * fingers drift outside the element bounds.
   */
  capturePointers?: boolean;
}>;

type MutablePoint = { x: number; y: number };

type Metrics = Readonly<{
  center: MutablePoint;
  distance?: number;
  angleRad?: number;
}>;

function clampPointersCount(count: number): 0 | 1 | 2 {
  if (count <= 0) return 0;
  if (count === 1) return 1;
  return 2;
}

function computeMetrics(points: ReadonlyArray<MutablePoint>): Metrics {
  if (points.length === 0) {
    return { center: { x: 0, y: 0 } };
  }
  if (points.length === 1) {
    return { center: { x: points[0].x, y: points[0].y } };
  }

  // Only consider the first 2 pointers for gesture math.
  const a = points[0];
  const b = points[1];
  const cx = (a.x + b.x) / 2;
  const cy = (a.y + b.y) / 2;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const distance = Math.hypot(dx, dy);
  const angleRad = Math.atan2(dy, dx);

  return { center: { x: cx, y: cy }, distance, angleRad };
}

function toReadonlyPoint(p: MutablePoint): GesturePoint {
  return { x: p.x, y: p.y };
}

export function attachPinchPanGesture(
  target: HTMLElement,
  handlers: PinchPanGestureHandlers,
  options: PinchPanGestureOptions = {},
): () => void {
  const { preventDefault = true, capturePointers = true } = options;

  const pointers = new Map<number, MutablePoint>();

  let active = false;
  let gestureStartCenter: MutablePoint | null = null;
  let gestureStartDistance: number | null = null;
  let gestureStartAngleRad: number | null = null;

  let lastCenter: MutablePoint | null = null;
  let translation: MutablePoint = { x: 0, y: 0 };

  const emit = (phase: PinchPanGesturePhase, metrics: Metrics): void => {
    const timestamp = performance.now();
    const center = metrics.center;

    if (!lastCenter) lastCenter = { x: center.x, y: center.y };
    if (!gestureStartCenter) gestureStartCenter = { x: center.x, y: center.y };

    const delta = { x: center.x - lastCenter.x, y: center.y - lastCenter.y };
    translation = {
      x: center.x - gestureStartCenter.x,
      y: center.y - gestureStartCenter.y,
    };

    const hasPinch = typeof metrics.distance === "number";

    if (hasPinch && gestureStartDistance === null) {
      gestureStartDistance = metrics.distance ?? 0;
    }
    if (hasPinch && gestureStartAngleRad === null) {
      gestureStartAngleRad = metrics.angleRad ?? 0;
    }

    const scale =
      hasPinch && gestureStartDistance && gestureStartDistance > 0
        ? (metrics.distance ?? gestureStartDistance) / gestureStartDistance
        : 1;

    const rotationRad =
      hasPinch && gestureStartAngleRad !== null && typeof metrics.angleRad === "number"
        ? metrics.angleRad - gestureStartAngleRad
        : 0;

    const snapshot: PinchPanGestureSnapshot = {
      phase,
      pointers: clampPointersCount(pointers.size),
      center: toReadonlyPoint(center),
      delta: toReadonlyPoint(delta),
      translation: toReadonlyPoint(translation),
      pinchDistance: metrics.distance,
      scale,
      rotationRad,
      timestamp,
    };

    lastCenter = { x: center.x, y: center.y };

    if (phase === "start") handlers.onStart?.(snapshot);
    if (phase === "move") handlers.onMove?.(snapshot);
    if (phase === "end") handlers.onEnd?.(snapshot);
    if (phase === "cancel") handlers.onCancel?.(snapshot);
  };

  const resetGestureState = (): void => {
    gestureStartCenter = null;
    gestureStartDistance = null;
    gestureStartAngleRad = null;
    lastCenter = null;
    translation = { x: 0, y: 0 };
  };

  const getActivePoints = (): MutablePoint[] => {
    return Array.from(pointers.values());
  };

  const onPointerDown = (e: PointerEvent): void => {
    if (preventDefault) e.preventDefault();

    // Only track touch + pen by default; allow mouse for desktop debugging.
    if (e.pointerType === "touch" || e.pointerType === "pen" || e.pointerType === "mouse") {
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    }

    if (capturePointers) {
      try {
        target.setPointerCapture(e.pointerId);
      } catch {
        // Some WebViews can throw if capture isn't allowed; ignore.
      }
    }

    const metrics = computeMetrics(getActivePoints());

    // Start only when the first pointer arrives, or when we transition 1 -> 2.
    if (!active) {
      active = true;
      resetGestureState();
    }

    // If this is the first pointer, we start a pan gesture.
    // If this is the second pointer, we "rebase" to start a pinch from now.
    if (pointers.size === 1 || pointers.size === 2) {
      gestureStartCenter = { x: metrics.center.x, y: metrics.center.y };
      lastCenter = { x: metrics.center.x, y: metrics.center.y };
      translation = { x: 0, y: 0 };

      gestureStartDistance =
        typeof metrics.distance === "number" ? metrics.distance : null;
      gestureStartAngleRad =
        typeof metrics.angleRad === "number" ? metrics.angleRad : null;

      emit("start", metrics);
    }
  };

  const onPointerMove = (e: PointerEvent): void => {
    if (!pointers.has(e.pointerId)) return;
    if (preventDefault) e.preventDefault();

    const p = pointers.get(e.pointerId);
    if (!p) return;
    p.x = e.clientX;
    p.y = e.clientY;

    const metrics = computeMetrics(getActivePoints());
    if (!active) return;

    // Only emit moves for 1- or 2-pointer states; ignore extra fingers.
    if (pointers.size === 1 || pointers.size === 2) {
      emit("move", metrics);
    }
  };

  const endLike =
    (phase: "end" | "cancel") =>
    (e: PointerEvent): void => {
      if (!pointers.has(e.pointerId)) return;
      if (preventDefault) e.preventDefault();

      pointers.delete(e.pointerId);

      // Emit end/cancel snapshot based on the last known center.
      const remaining = getActivePoints();
      const metrics =
        remaining.length > 0
          ? computeMetrics(remaining)
          : {
              center: lastCenter
                ? { x: lastCenter.x, y: lastCenter.y }
                : { x: e.clientX, y: e.clientY },
            };
      emit(phase, metrics);

      // If we still have pointers down, rebase the gesture so it feels continuous.
      if (pointers.size === 1 || pointers.size === 2) {
        const m = computeMetrics(getActivePoints());
        gestureStartCenter = { x: m.center.x, y: m.center.y };
        lastCenter = { x: m.center.x, y: m.center.y };
        translation = { x: 0, y: 0 };
        gestureStartDistance = typeof m.distance === "number" ? m.distance : null;
        gestureStartAngleRad = typeof m.angleRad === "number" ? m.angleRad : null;
        emit("start", m);
        return;
      }

      if (pointers.size === 0) {
        active = false;
        resetGestureState();
      }
    };

  const onPointerUp = endLike("end");
  const onPointerCancel = endLike("cancel");

  // Ensure touch-action is correct even if caller forgets the class.
  // (Do not override if already set inline.)
  if (!target.style.touchAction) target.style.touchAction = "none";

  target.addEventListener("pointerdown", onPointerDown, { passive: false });
  target.addEventListener("pointermove", onPointerMove, { passive: false });
  target.addEventListener("pointerup", onPointerUp, { passive: false });
  target.addEventListener("pointercancel", onPointerCancel, { passive: false });

  return () => {
    target.removeEventListener("pointerdown", onPointerDown);
    target.removeEventListener("pointermove", onPointerMove);
    target.removeEventListener("pointerup", onPointerUp);
    target.removeEventListener("pointercancel", onPointerCancel);
    pointers.clear();
    active = false;
    resetGestureState();
  };
}

