/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of the leaderboard Worker (e.g. https://leaderboard.example.workers.dev).
   * Unset → all leaderboard UI is hidden and no requests are made. */
  readonly VITE_LEADERBOARD_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
