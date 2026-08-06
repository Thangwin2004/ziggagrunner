/* global console */

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const readJson = async (path) => JSON.parse(await readFile(path, "utf8"));
const config = await readJson("game.config.json");
const runtime = await readJson("public/wink-runtime-config.json");
const lock = await readJson("public/wink-bridge.lock.json");
const bridge = await readFile("public/wink-bridge.js");
const sha256 = createHash("sha256").update(bridge).digest("hex");

const expectedRuntime = {
  gameId: config.gameId,
  environment: config.environment,
  protocolVersion: config.protocolVersion,
  bridgeVersion: config.bridgeVersion,
  allowedParentOrigins: config.allowedParentOrigins,
};

if (JSON.stringify(runtime) !== JSON.stringify(expectedRuntime)) {
  throw new Error("WINK_RUNTIME_CONFIG_MISMATCH");
}
if (
  config.environment !== "prod" ||
  config.domain !== `${config.slug}.papastudio.net` ||
  config.allowedParentOrigins.length !== 1 ||
  config.allowedParentOrigins[0] !== "https://winkgames.papastudio.net"
) {
  throw new Error("WINK_PRODUCTION_CONFIG_INVALID");
}
if (
  lock.bridgeVersion !== config.bridgeVersion ||
  lock.protocolVersion !== config.protocolVersion ||
  lock.bytes !== bridge.length ||
  lock.sha256 !== sha256
) {
  throw new Error("WINK_BRIDGE_LOCK_MISMATCH");
}

console.log(
  `wink production contract verified slug=${config.slug} gameId=${config.gameId} bridge=${config.bridgeVersion} sha256=${sha256}`,
);
