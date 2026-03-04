import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: { bin: "src/bin.ts" },
    format: ["esm"],
    dts: true,
    sourcemap: true,
    clean: true,
    target: "node18",
    banner: { js: "#!/usr/bin/env node" },
  },
  {
    entry: {
      server: "src/server.ts",
      "transport/index": "src/transport/index.ts",
    },
    format: ["esm"],
    dts: true,
    sourcemap: true,
    target: "node18",
  },
]);
