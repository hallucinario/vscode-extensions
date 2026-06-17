const esbuild = require("esbuild");
const { copyFileSync, mkdirSync, existsSync } = require("fs");
const path = require("path");

const production = process.argv.includes("--production");
const watch = process.argv.includes("--watch");

async function main() {
  // Extension host bundle (Node.js, CJS)
  const extensionCtx = await esbuild.context({
    entryPoints: ["src/extension.ts"],
    bundle: true,
    format: "cjs",
    platform: "node",
    target: "node20",
    outfile: "dist/extension.js",
    external: ["vscode"],
    sourcemap: !production,
    minify: production,
    sourcesContent: false,
    treeShaking: true,
  });

  // Webview bundle (Browser, IIFE)
  const webviewCtx = await esbuild.context({
    entryPoints: ["src/ui/webview/main.ts"],
    bundle: true,
    format: "iife",
    platform: "browser",
    target: "es2022",
    outfile: "dist/webview.js",
    sourcemap: !production,
    minify: production,
    sourcesContent: false,
    treeShaking: true,
  });

  // Copy CSS to dist
  if (!existsSync("dist")) {
    mkdirSync("dist", { recursive: true });
  }
  const cssSource = path.join("src", "ui", "webview", "styles.css");
  if (existsSync(cssSource)) {
    copyFileSync(cssSource, path.join("dist", "webview.css"));
  }

  if (watch) {
    await Promise.all([extensionCtx.watch(), webviewCtx.watch()]);
    console.log("[watch] Build started...");
  } else {
    await Promise.all([extensionCtx.rebuild(), webviewCtx.rebuild()]);
    await Promise.all([extensionCtx.dispose(), webviewCtx.dispose()]);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
