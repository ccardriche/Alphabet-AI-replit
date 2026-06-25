// Vercel Build Output API builder for the Numbers AI pnpm monorepo.
//
// Produces a single deployable on one origin:
//   - SPA static files  -> .vercel/output/static
//   - Express API       -> .vercel/output/functions/api.func  (mounted at /api)
//
// Why custom: this is a pnpm workspace where the frontend (artifacts/numbers-ai)
// fetches "/api/*" same-origin and the API (artifacts/api-server) is an Express
// app cleanly separated from app.listen(). We bundle that Express app with
// esbuild (which inlines every workspace dep) into a self-contained serverless
// function, and serve the Vite build as static assets behind it.

import { execSync } from "node:child_process";
import { createRequire } from "node:module";
import { cpSync, mkdirSync, rmSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outRoot = path.join(root, ".vercel", "output");
const staticDir = path.join(outRoot, "static");
const funcDir = path.join(outRoot, "functions", "api.func");

const run = (cmd, opts = {}) => {
  console.log(`\n$ ${cmd}`);
  execSync(cmd, { stdio: "inherit", cwd: root, ...opts });
};

// Clean previous output
rmSync(outRoot, { recursive: true, force: true });
mkdirSync(staticDir, { recursive: true });
mkdirSync(funcDir, { recursive: true });

// 1) Build the frontend. vite.config.ts hard-requires PORT and BASE_PATH.
//    BASE_PATH="/" makes the client call "/api/*" at the root origin.
run("pnpm --filter @workspace/alphabet-ai run build", {
  env: { ...process.env, NODE_ENV: "production", PORT: "3000", BASE_PATH: "/" },
});

const feDist = path.join(root, "artifacts", "alphabet-ai", "dist", "public");
if (!existsSync(feDist)) {
  throw new Error(`Frontend build output not found at ${feDist}`);
}
cpSync(feDist, staticDir, { recursive: true });
console.log(`\nCopied frontend -> ${staticDir}`);

// 2) Bundle the Express app into the serverless function directory.
//    Reuse esbuild + the pino plugin from the api-server package, and mirror
//    its externals (native/optional modules that must not be bundled).
const apiDir = path.join(root, "artifacts", "api-server");
const apiRequire = createRequire(path.join(apiDir, "package.json"));
const { build: esbuild } = apiRequire("esbuild");
const esbuildPluginPino = apiRequire("esbuild-plugin-pino").default ?? apiRequire("esbuild-plugin-pino");

await esbuild({
  entryPoints: [path.join(apiDir, "src", "app.ts")],
  platform: "node",
  target: "node20",
  bundle: true,
  format: "esm",
  outdir: funcDir,
  outExtension: { ".js": ".mjs" },
  logLevel: "info",
  external: [
    "*.node", "sharp", "better-sqlite3", "sqlite3", "canvas", "bcrypt", "argon2",
    "fsevents", "re2", "farmhash", "xxhash-addon", "bufferutil", "utf-8-validate",
    "ssh2", "cpu-features", "dtrace-provider", "isolated-vm", "lightningcss",
    "pg-native", "oracledb", "mongodb-client-encryption", "nodemailer", "handlebars",
    "knex", "typeorm", "protobufjs", "onnxruntime-node", "@tensorflow/*",
    "@prisma/client", "@mikro-orm/*", "@grpc/*", "@swc/*", "@aws-sdk/*", "@azure/*",
    "@opentelemetry/*", "@google-cloud/*", "@google/*", "googleapis", "firebase-admin",
    "@parcel/watcher", "@sentry/profiling-node", "@tree-sitter/*", "aws-sdk",
    "classic-level", "dd-trace", "ffi-napi", "grpc", "hiredis", "kerberos",
    "leveldown", "miniflare", "mysql2", "newrelic", "odbc", "piscina", "realm",
    "ref-napi", "rocksdb", "sass-embedded", "sequelize", "serialport", "snappy",
    "tinypool", "usb", "workerd", "wrangler", "zeromq", "zeromq-prebuilt",
    "playwright", "puppeteer", "puppeteer-core", "electron",
  ],
  sourcemap: "linked",
  plugins: [esbuildPluginPino({ transports: ["pino-pretty"] })],
  banner: {
    js: `import { createRequire as __cr } from 'node:module';
import __p from 'node:path';
import __u from 'node:url';
globalThis.require = __cr(import.meta.url);
globalThis.__filename = __u.fileURLToPath(import.meta.url);
globalThis.__dirname = __p.dirname(globalThis.__filename);`,
  },
});
console.log(`\nBundled Express app -> ${funcDir}/app.mjs`);

// 3) Wrap the Express app as the function entrypoint. The Vercel Node launcher
//    invokes the default export as an (req, res) handler; an Express app is one.
writeFileSync(
  path.join(funcDir, "index.mjs"),
  `import app from "./app.mjs";\nexport default app;\n`,
);

writeFileSync(
  path.join(funcDir, ".vc-config.json"),
  JSON.stringify(
    { runtime: "nodejs20.x", handler: "index.mjs", launcherType: "Nodejs", shouldAddHelpers: false },
    null,
    2,
  ),
);

// 4) Top-level routing: /api/* -> function, static assets, SPA fallback.
writeFileSync(
  path.join(outRoot, "config.json"),
  JSON.stringify(
    {
      version: 3,
      routes: [
        { src: "/api/(.*)", dest: "/api" },
        { handle: "filesystem" },
        { src: "/(.*)", dest: "/index.html" },
      ],
    },
    null,
    2,
  ),
);

console.log("\n✅ Build Output ready at .vercel/output");
