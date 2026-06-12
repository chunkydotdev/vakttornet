# Music drop-in folder

Background tracks are picked up from this folder by pure file-drop — no code
changes, no manifest. Drop a file, reload, done. With zero files present the
game runs silently and error-free.

## File contract

| File                        | Plays on                                              |
| --------------------------- | ----------------------------------------------------- |
| `hub.mp3`                   | Title, level select, sägner codex, topplista          |
| `battle.mp3`                | Default in-run track (fallback for all maps)          |
| `level01.mp3` … `level09.mp3` | Per-map in-run track (optional, one per level id)   |

Fallback chain: a missing `levelNN` file falls back to `battle.mp3`; a
missing `battle.mp3` falls back to silence. A missing `hub.mp3` is silence.

## Format

- MP3 or OGG — the loader probes `.mp3` first, then `.ogg` (e.g.
  `hub.ogg` works if no `hub.mp3` exists).
- Tracks must loop cleanly (`loop` is always on; trim silence at both ends).
- Suggested encoding: 128–192 kbps. Playback volume is ~0.35, so no need to
  master quiet.

The player-facing logic lives in `apps/game/src/game/music.ts` (probing,
fallback, ~1.2s crossfade, mute persistence).

## Licensing

**Audio files in this folder are NOT covered by the repo's MIT license.**
Licensed tracks (e.g. Envato Elements) should be registered to this project
under their own license terms; check redistribution rights before committing
a file. Do NOT gitignore audio here — the GitHub Pages build ships exactly
what is committed, so the creator decides per file what goes in.
