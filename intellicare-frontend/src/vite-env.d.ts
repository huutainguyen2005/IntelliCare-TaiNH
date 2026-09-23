/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_MODE?: "kiosk" | "web";
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_DEVICE_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
