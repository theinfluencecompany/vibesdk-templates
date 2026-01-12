import { z } from "zod"

/**
 * Native-share message contract:
 * - Web sends a JSON string via a WebView bridge
 * - Native listens for `channel === "tic-native"` + `type === "share-request"`
 * - Native performs platform share and can optionally post a result back
 */

export const nativeShareAssetSchema = z.object({
  kind: z.enum(["image", "video", "audio", "file"]),
  // Zod uses `z.string().url()`; there is no `z.url()`.
  url: z.string().url(),
  mimeType: z.string().trim().min(1).optional(),
  name: z.string().trim().min(1).optional(),
})

export type NativeShareAsset = z.infer<typeof nativeShareAssetSchema>

export const nativeSharePayloadSchema = z.object({
  title: z.string().trim().min(1).optional(),
  text: z.string().trim().min(1).optional(),
  url: z.string().url().optional(),
  assets: z.array(nativeShareAssetSchema).max(10).optional(),
  /**
   * Optional metadata for native analytics/debugging.
   * Keep small and stable; do not put large blobs here.
   */
  meta: z.record(z.string(), z.unknown()).optional(),
})

export type NativeSharePayload = z.infer<typeof nativeSharePayloadSchema>

export const nativeShareRequestMessageSchema = z.object({
  channel: z.literal("tic-native"),
  type: z.literal("share-request"),
  version: z.literal(1),
  requestId: z.string().trim().min(1),
  payload: nativeSharePayloadSchema,
})

export type NativeShareRequestMessage = z.infer<typeof nativeShareRequestMessageSchema>

export const nativeShareResultMessageSchema = z.object({
  channel: z.literal("tic-native"),
  type: z.literal("share-result"),
  version: z.literal(1),
  requestId: z.string().trim().min(1),
  status: z.enum(["success", "cancel", "error"]),
  errorMessage: z.string().trim().min(1).optional(),
})

export type NativeShareResultMessage = z.infer<typeof nativeShareResultMessageSchema>

export type NativeBridgeKind = "react-native-webview" | "ios-webkit-message-handler"

export type RequestNativeShareResult =
  | { ok: true; requestId: string; bridge: NativeBridgeKind }
  | { ok: false; requestId: string; reason: "no-window" | "no-bridge" | "post-failed"; error?: unknown }

function createRequestId(): string {
  // Stable enough for correlating a request with a native callback.
  return `shr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
}

function safeStringify(value: unknown): string {
  return JSON.stringify(value)
}

declare global {
  interface Window {
    ReactNativeWebView?: {
      postMessage: (message: string) => void
    }
    webkit?: {
      messageHandlers?: Record<string, { postMessage: (message: unknown) => void }>
    }
  }
}

function postToReactNativeWebView(message: string): boolean {
  if (!window.ReactNativeWebView?.postMessage) return false
  window.ReactNativeWebView.postMessage(message)
  return true
}

function postToIosWebkitMessageHandler(handlerName: string, message: unknown): boolean {
  const handler = window.webkit?.messageHandlers?.[handlerName]
  if (!handler?.postMessage) return false
  handler.postMessage(message)
  return true
}

/**
 * Sends a share request to native (if available).
 *
 * Native side should listen for messages where:
 * - `channel === "tic-native"`
 * - `type === "share-request"`
 *
 * Bridge support:
 * - React Native WebView: `window.ReactNativeWebView.postMessage(JSON_STRING)`
 * - iOS WKWebView: `window.webkit.messageHandlers[handlerName].postMessage(OBJECT)`
 */
export function requestNativeShare(params: {
  payload: NativeSharePayload
  /**
   * iOS bridge name. Use whatever your native app registers.
   * Example: "ticNative" or "share" etc.
   */
  iosHandlerName?: string
  /**
   * Provide a requestId if you want to correlate across layers.
   */
  requestId?: string
}): RequestNativeShareResult {
  if (typeof window === "undefined") {
    return { ok: false, requestId: params.requestId ?? "no-window", reason: "no-window" }
  }

  const requestId = params.requestId ?? createRequestId()

  const message: NativeShareRequestMessage = nativeShareRequestMessageSchema.parse({
    channel: "tic-native",
    type: "share-request",
    version: 1,
    requestId,
    payload: params.payload,
  })

  try {
    // Prefer RN WebView path: native expects a JSON string.
    const json = safeStringify(message)
    if (postToReactNativeWebView(json)) {
      return { ok: true, requestId, bridge: "react-native-webview" }
    }

    // iOS WKWebView: native expects an object (not necessarily a string).
    const handlerName = params.iosHandlerName ?? "ticNative"
    if (postToIosWebkitMessageHandler(handlerName, message)) {
      return { ok: true, requestId, bridge: "ios-webkit-message-handler" }
    }

    return { ok: false, requestId, reason: "no-bridge" }
  } catch (error) {
    return { ok: false, requestId, reason: "post-failed", error }
  }
}

/**
 * Optional helper for parsing native responses posted back to web.
 * (How native posts back is app-specific; this just gives you a schema.)
 */
export function parseNativeShareResultMessage(message: unknown): NativeShareResultMessage {
  return nativeShareResultMessageSchema.parse(message)
}

