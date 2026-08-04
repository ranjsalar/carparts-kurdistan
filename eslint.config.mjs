import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Generated Prisma client:
    "src/generated/**",
    // Gitignored one-off local scripts (see .gitignore). They never reach CI,
    // so linting them locally only produces failures that cannot be reproduced
    // there — `npm run lint` should mean the same thing in both places.
    "local-*.ts",
  ]),
]);

export default eslintConfig;
