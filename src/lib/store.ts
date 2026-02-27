import { MemoryLevel } from "memory-level";

// Singleton que sobrevive ao HMR do Next.js em desenvolvimento.
// Em produção, o módulo é carregado uma única vez e o globalThis é um no-op.
const g = globalThis as unknown as {
  __roomStore?: MemoryLevel<string, string>;
};

if (!g.__roomStore) {
  g.__roomStore = new MemoryLevel<string, string>({ valueEncoding: "json" });
}

export const roomStore = g.__roomStore;
