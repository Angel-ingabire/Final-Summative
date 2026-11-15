/// <reference types="vite/client" />

interface Window {
  ethereum?: {
    request(args: { method: string; params?: unknown[] }): Promise<unknown>;
    on(event: string, handler: (...args: unknown[]) => void): void;
    removeListener(event: string, handler: (...args: unknown[]) => void): void;
  };
}

interface ImportMetaEnv {
  readonly VITE_AMATASETTLE_ADDRESS: string;
  readonly VITE_MOCKRWF_ADDRESS: string;
  readonly VITE_CHAIN_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
