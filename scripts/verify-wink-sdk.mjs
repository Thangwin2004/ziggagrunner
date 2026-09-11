import { access, readFile, readdir } from "node:fs/promises";
import { extname, join } from "node:path";

const SDK_URL = "https://sdk.winkgames.fun/v1/wink.js";
const forbiddenFiles = [
  "public/wink-bridge.js",
  "public/wink-bridge.lock.json",
  "public/wink-runtime-config.json",
  "wink-integration.json",
  "game.config.json",
];

const [indexHtml, manifestText] = await Promise.all([
  readFile("index.html", "utf8"),
  readFile("wink.game.json", "utf8"),
]);
const manifest = JSON.parse(manifestText);

if (
  manifest?.schemaVersion !== 1 ||
  manifest?.runtime?.kind !== "wink-sdk" ||
  manifest?.runtime?.protocolVersion !== 1 ||
  manifest?.runtime?.sdkMajor !== 1 ||
  manifest?.build?.profile !== "vite-static-v1" ||
  manifest?.build?.outputDirectory !== "dist"
) {
  throw new Error("wink.game.json does not match the Wink SDK v1 contract");
}

const escapedUrl = SDK_URL.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const sdkTags =
  indexHtml.match(
    new RegExp(
      `<script\\s+[^>]*src=["']${escapedUrl}["'][^>]*>\\s*</script>`,
      "g",
    ),
  ) || [];
const sdkPosition = indexHtml.indexOf(SDK_URL);
const modulePosition = indexHtml.search(/<script\s+[^>]*type=["']module["']/i);

if (
  sdkTags.length !== 1 ||
  sdkPosition < 0 ||
  (modulePosition >= 0 && sdkPosition > modulePosition)
) {
  throw new Error(
    "index.html must load the canonical Wink SDK exactly once before the game entrypoint",
  );
}
if (/wink-bridge|wink-runtime-config|WinkBridge/i.test(indexHtml)) {
  throw new Error("index.html still references the legacy Wink Bridge runtime");
}

for (const path of forbiddenFiles) {
  try {
    await access(path);
    throw new Error(`legacy Wink file must be removed: ${path}`);
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
}

async function collectSourceFiles(directory) {
  const files = [];
  try {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) files.push(...(await collectSourceFiles(path)));
      else if ([".js", ".jsx", ".ts", ".tsx"].includes(extname(entry.name)))
        files.push(path);
    }
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
  return files;
}

for (const path of await collectSourceFiles("src")) {
  const source = await readFile(path, "utf8");
  if (
    /WinkBridge|wink-bridge|wink-runtime-config|wink-integration/i.test(source)
  ) {
    throw new Error(`legacy Wink runtime reference remains in ${path}`);
  }
  if (/window\.parent\.postMessage\s*\(/.test(source)) {
    throw new Error(`custom parent messaging is not allowed in ${path}`);
  }
  if (/(?:winkGame|Wink|sdk)\.track\s*\(/.test(source)) {
    throw new Error(`custom Wink tracking is not allowed in ${path}`);
  }
}

const adapterCandidates = [
  "src/integrations/wink/wink-adapter.js",
  "src/integrations/wink/client.ts",
];
let adapterSource = null;
for (const path of adapterCandidates) {
  try {
    adapterSource = await readFile(path, "utf8");
    break;
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
}
if (
  !adapterSource ||
  !/\.init\s*\(/.test(adapterSource) ||
  !/gameplayStart(?:\?\.)?\s*\(/.test(adapterSource) ||
  !/gameplayStop(?:\?\.)?\s*\(/.test(adapterSource)
) {
  throw new Error(
    "Wink SDK adapter must initialize SDK v1 and expose gameplay start/stop boundaries",
  );
}
