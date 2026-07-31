/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_MODE?: "kiosk" | "web";
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
