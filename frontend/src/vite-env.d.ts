/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

/** Injetadas pelo Vite no build — ver `define` em `vite.config.ts`. */
declare const __APP_VERSION__: string;
declare const __BUILD_DATE__: string;
