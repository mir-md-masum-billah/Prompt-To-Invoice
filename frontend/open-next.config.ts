import { defineCloudflareConfig } from "@opennextjs/cloudflare";

export default {
  ...defineCloudflareConfig(),
  // `npm run build` runs OpenNext, so OpenNext must call plain `next build`
  // (otherwise it would call itself forever).
  buildCommand: "npm run build:next",
};
