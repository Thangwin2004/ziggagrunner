import js from "@eslint/js";
import prettier from "eslint-plugin-prettier/recommended";

export default [
  // .worktrees holds a full duplicate checkout (487MB). Without it here,
  // `eslint .` walks the copy and `pnpm build` takes minutes instead of seconds.
  // Note: the .eslintignore beside this file is dead — ESLint 9 flat config
  // does not read it, which is why these ignores must live here.
  {
    ignores: [
      "dist",
      "public",
      "public/**",
      "**/wink-bridge.js",
      ".worktrees",
      ".worktrees/**",
    ],
  },
  js.configs.recommended,
  prettier,
  {
    files: ["**/*.{js,jsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        window: "readonly",
        document: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
        AudioContext: "readonly",
        webkitAudioContext: "readonly",
        Audio: "readonly",
        console: "readonly",
        requestAnimationFrame: "readonly",
        Promise: "readonly",
        Math: "readonly",
      },
    },
    rules: {},
  },
];
