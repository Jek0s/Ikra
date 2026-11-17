/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_BACKEND?: 'd1';
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}