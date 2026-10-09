import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Project-level overrides.
  {
    rules: {
      // Apostrophes and quotes render fine in JSX; the default rule
      // is noisy and inconsistent with the rest of the codebase.
      "react/no-unescaped-entities": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Local smoke tests for the storage normalizers — not part of
    // the shipped app, intentionally permissive with `any`.
    "scripts/**",
  ]),
]);

export default eslintConfig;
