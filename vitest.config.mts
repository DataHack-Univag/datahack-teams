import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Testes das regras puras (domínio, validação e formatação). Não acessam o banco.
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: { include: ["src/**/*.test.ts"], environment: "node" },
});
