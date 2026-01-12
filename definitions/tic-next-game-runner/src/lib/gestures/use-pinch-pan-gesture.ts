"use client";

import { useEffect, useRef } from "react";
import type { RefObject } from "react";
import {
  attachPinchPanGesture,
  type PinchPanGestureHandlers,
  type PinchPanGestureOptions,
} from "@/lib/gestures/pinch-pan-gesture";

export function usePinchPanGesture(
  targetRef: RefObject<HTMLElement | null>,
  handlers: PinchPanGestureHandlers,
  options?: PinchPanGestureOptions,
): void {
  const handlersRef = useRef<PinchPanGestureHandlers>(handlers);

  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  useEffect(() => {
    const el = targetRef.current;
    if (!el) return;

    return attachPinchPanGesture(
      el,
      {
        onStart: (s) => handlersRef.current.onStart?.(s),
        onMove: (s) => handlersRef.current.onMove?.(s),
        onEnd: (s) => handlersRef.current.onEnd?.(s),
        onCancel: (s) => handlersRef.current.onCancel?.(s),
      },
      options,
    );
  }, [
    targetRef,
    options?.capturePointers,
    options?.preventDefault,
    // Intentionally not depending on `handlers` to avoid reattaching listeners.
  ]);
}

