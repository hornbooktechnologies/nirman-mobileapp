import { copyFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Resolve through the React wrapper to copy its exact matching renderer version.
const appRequire = createRequire(import.meta.url);
const playerRequire = createRequire(appRequire.resolve("@lottiefiles/dotlottie-react"));
const source = playerRequire.resolve("@lottiefiles/dotlottie-web/dotlottie-player.wasm");
const destination = fileURLToPath(new URL("../public/animations/dotlottie-player.wasm", import.meta.url));
mkdirSync(path.dirname(destination), { recursive: true });
copyFileSync(source, destination);
