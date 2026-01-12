import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Required for OpenNext Cloudflare to generate standalone output
  output: "standalone",
  // Ensure standalone output is relative to this project (fixes multiple-lockfile detection)
  outputFileTracingRoot: __dirname,
};

// Enables Cloudflare bindings/context access during `next dev` when developing locally.
// See: https://opennext.js.org/cloudflare/get-started
void initOpenNextCloudflareForDev();

export default nextConfig;
