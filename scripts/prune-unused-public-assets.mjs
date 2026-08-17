import { readdir, readFile, rm, stat } from "node:fs/promises";
import console from "node:console";
import path from "node:path";
import { argv, cwd } from "node:process";

const projectRoot = path.resolve(argv[2] || cwd());
const publicDir = path.join(projectRoot, "public");
const distDir = path.join(projectRoot, "dist");
const textExtensions = new Set([
  ".css",
  ".html",
  ".htm",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".ts",
  ".tsx",
  ".json",
  ".gltf",
  ".mtl",
  ".obj",
  ".svg",
  ".xml",
  ".txt",
  ".md",
  ".webmanifest",
]);
const ignoredDirectories = new Set([
  ".git",
  "dist",
  "node_modules",
  "coverage",
]);
const ignoredFiles = new Set([
  "package-lock.json",
  "pnpm-lock.yaml",
  "yarn.lock",
  "asset-prune-report.json",
]);

async function walkFiles(directory, shouldEnter = () => true) {
  const output = [];
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch {
    return output;
  }

  for (const entry of entries) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (shouldEnter(entry.name, absolute)) {
        output.push(...(await walkFiles(absolute, shouldEnter)));
      }
    } else if (entry.isFile()) {
      output.push(absolute);
    }
  }
  return output;
}

function normalize(value) {
  return value.replaceAll("\\", "/");
}

function formatMb(bytes) {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

async function removeEmptyDirectories(directory) {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (entry.isDirectory()) {
      await removeEmptyDirectories(path.join(directory, entry.name));
    }
  }
  entries = await readdir(directory);
  if (entries.length === 0 && directory !== distDir) {
    await rm(directory, { recursive: true, force: true });
  }
}

const publicFiles = await walkFiles(publicDir);
const publicNameCounts = new Map();
for (const file of publicFiles) {
  const name = path.basename(file);
  publicNameCounts.set(name, (publicNameCounts.get(name) || 0) + 1);
}
const projectFiles = await walkFiles(
  projectRoot,
  (name) => !ignoredDirectories.has(name),
);
const textFiles = projectFiles.filter((file) => {
  if (ignoredFiles.has(path.basename(file))) return false;
  return textExtensions.has(path.extname(file).toLowerCase());
});

const chunks = [];
for (const file of textFiles) {
  try {
    chunks.push(normalize(await readFile(file, "utf8")));
  } catch {
    // A malformed optional text file must not break a production build.
  }
}
const corpus = chunks.join("\n");

// Preserve whole folders used through template URLs such as `/avatars/${name}.png`.
const dynamicPrefixes = new Set();
for (const match of corpus.matchAll(
  /["'`](\/?(?:[\w.@%+(), -]+\/)+)[^"'`\n]*?\$\{/g,
)) {
  dynamicPrefixes.add(match[1].replace(/^\//, ""));
}

let publicBytes = 0;
let removedBytes = 0;
let removedFiles = 0;
const removedExamples = [];

for (const publicFile of publicFiles) {
  const relative = normalize(path.relative(publicDir, publicFile));
  const fileName = path.basename(publicFile);
  const fileSize = (await stat(publicFile)).size;
  publicBytes += fileSize;

  const isReferenced =
    corpus.includes(relative) ||
    corpus.includes(`/${relative}`) ||
    (publicNameCounts.get(fileName) === 1 && corpus.includes(fileName)) ||
    [...dynamicPrefixes].some((prefix) => relative.startsWith(prefix));

  if (isReferenced) continue;

  const distFile = path.join(distDir, relative);
  try {
    const distSize = (await stat(distFile)).size;
    await rm(distFile, { force: true });
    removedBytes += distSize;
    removedFiles += 1;
    if (removedExamples.length < 8) removedExamples.push(relative);
  } catch {
    // The asset may already be excluded by the bundler.
  }
}

await removeEmptyDirectories(distDir);
const keptBytes = Math.max(0, publicBytes - removedBytes);
console.log(
  `[asset-prune] ${path.basename(projectRoot)}: removed ${removedFiles} unused files (${formatMb(removedBytes)}).`,
);
console.log(
  `[asset-prune] Public payload: ${formatMb(publicBytes)} -> ${formatMb(keptBytes)}.`,
);
if (removedExamples.length > 0) {
  console.log(`[asset-prune] Examples: ${removedExamples.join(", ")}`);
}
