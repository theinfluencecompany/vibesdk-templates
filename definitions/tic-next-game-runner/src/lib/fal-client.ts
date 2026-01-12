import "server-only";

import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

import { z } from "zod";

import { env } from "@/env";

const FalClientSchema = z
  .object({
    fal: z.object({
      config: z.any().optional(),
      subscribe: z.any(),
    }),
  })
  .passthrough();

const FalImageSchema = z
  .object({
    url: z.string().url(),
  })
  .passthrough();

const FalImagesDataSchema = z
  .object({
    images: z.array(FalImageSchema).min(1),
  })
  .passthrough();

const FalSubscribeResultSchema = z
  .object({
    data: z.unknown(),
    requestId: z.string().optional(),
  })
  .passthrough();

type FalSubscribeResult = z.infer<typeof FalSubscribeResultSchema>;

function isValidUrl(value: string): boolean {
  try {
    // eslint-disable-next-line no-new
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

function collectUrlsDeep(value: unknown, acc: Set<string>, depth: number): void {
  if (depth <= 0) return;

  if (typeof value === "string") {
    if (isValidUrl(value)) acc.add(value);
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) collectUrlsDeep(item, acc, depth - 1);
    return;
  }

  if (value && typeof value === "object") {
    for (const v of Object.values(value as Record<string, unknown>)) {
      collectUrlsDeep(v, acc, depth - 1);
    }
  }
}

export function falExtractUrlsFromData(data: unknown): string[] {
  const urls = new Set<string>();

  // Fast path for common Fal payload shapes.
  const imagesParsed = FalImagesDataSchema.safeParse(data);
  if (imagesParsed.success) {
    for (const img of imagesParsed.data.images) urls.add(img.url);
  }

  // Common single fields seen across providers.
  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    for (const key of [
      "url",
      "file_url",
      "fileUrl",
      "audio_url",
      "audioUrl",
      "video_url",
      "videoUrl",
      "glb_url",
      "glbUrl",
      "model_url",
      "modelUrl",
    ]) {
      const v = obj[key];
      if (typeof v === "string" && isValidUrl(v)) urls.add(v);
    }
  }

  // Last resort: bounded deep scan for any URL strings.
  collectUrlsDeep(data, urls, 6);

  return Array.from(urls);
}

async function importOptional(moduleName: string): Promise<unknown> {
  // Keep the base repo typecheckable even when the optional dependency isn't installed.
  const importer = new Function("m", "return import(m)") as (m: string) => Promise<unknown>;
  return await importer(moduleName);
}

async function getFalClient(): Promise<{
  fal: {
    config?: (args: { credentials: string }) => void;
    subscribe: (modelId: string, options: unknown) => Promise<unknown>;
  };
}> {
  const mod = await importOptional("@fal-ai/client").catch(() => {
    throw new Error("Missing dependency '@fal-ai/client'. Install with: bun add @fal-ai/client");
  });

  const parsed = FalClientSchema.parse(mod);

  const subscribe = parsed.fal.subscribe as (modelId: string, options: unknown) => Promise<unknown>;
  const config =
    typeof parsed.fal.config === "function"
      ? (parsed.fal.config as (args: { credentials: string }) => void)
      : undefined;

  return { fal: { subscribe, config } };
}

export async function falSubscribe(params: {
  modelId: string;
  input: Record<string, unknown>;
  credentials?: string;
  logs?: boolean;
  onQueueUpdate?: (update: unknown) => void;
  headers?: Record<string, string>;
}): Promise<FalSubscribeResult> {
  const { modelId, input, credentials, logs, onQueueUpdate, headers } = params;

  const falKey = credentials ?? env.FAL_KEY;
  if (!falKey) {
    throw new Error("Missing Fal credentials. Set FAL_KEY or pass credentials explicitly.");
  }

  const { fal } = await getFalClient();
  if (fal.config) fal.config({ credentials: falKey });

  const resultUnknown = await fal.subscribe(modelId, { input, logs, onQueueUpdate, headers });
  return FalSubscribeResultSchema.parse(resultUnknown);
}

export async function falGenerateAsset(params: {
  modelId: string;
  input: Record<string, unknown>;
  credentials?: string;
  logs?: boolean;
  headers?: Record<string, string>;
}): Promise<{
  urls: string[];
  requestId: string | null;
  data: unknown;
}> {
  const result = await falSubscribe({
    modelId: params.modelId,
    input: params.input,
    credentials: params.credentials,
    logs: params.logs,
    headers: params.headers,
  });

  return {
    urls: falExtractUrlsFromData(result.data),
    requestId: result.requestId ?? null,
    data: result.data,
  };
}

export async function falGenerateImage(params: {
  modelId: string;
  prompt: string;
  negativePrompt?: string;
  seed?: number;
}): Promise<{
  imageUrl: string;
  requestId: string | null;
  data: unknown;
}> {
  const result = await falSubscribe({
    modelId: params.modelId,
    input: {
      prompt: params.prompt,
      negative_prompt: params.negativePrompt,
      seed: params.seed,
    },
  });

  const data = FalImagesDataSchema.parse(result.data);
  return {
    imageUrl: data.images[0].url,
    requestId: result.requestId ?? null,
    data: result.data,
  };
}

export async function falEditImage(params: {
  prompt: string;
  imageUrls: string[];
  modelId?: string;
}): Promise<{
  imageUrls: string[];
  requestId: string | null;
  data: unknown;
}> {
  const modelId = params.modelId ?? "fal-ai/flux-2/edit";

  const result = await falSubscribe({
    modelId,
    input: {
      prompt: params.prompt,
      image_urls: params.imageUrls,
    },
  });

  const data = FalImagesDataSchema.parse(result.data);
  return {
    imageUrls: data.images.map((img) => img.url),
    requestId: result.requestId ?? null,
    data: result.data,
  };
}

export async function downloadUrlToFile(url: string, outPath: string): Promise<void> {
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) throw new Error(`Download failed: ${res.status} ${res.statusText}`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  await mkdir(dirname(outPath), { recursive: true });
  await writeFile(outPath, bytes);
}
