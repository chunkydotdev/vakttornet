/**
 * Music layer — looping background tracks resolved by pure file-drop.
 *
 * Tracks live in `public/audio/` (see its README for the contract). Nothing
 * is bundled: `playTrack(id)` probes for `audio/{id}.mp3` then `.ogg` with a
 * HEAD request, falling back `levelNN → battle → silence`. With zero files
 * present every call is a quiet no-op — probe failures never throw or log.
 *
 * Two <audio> slots crossfade (~1.2s linear ramp on a ~60ms interval).
 * Browsers block audio before a user gesture, so the manager arms itself on
 * the first pointerdown/keydown anywhere; a track requested before arming
 * starts at that moment. Mute persists in localStorage and only zeroes the
 * volume — playback keeps running so unmute is instant.
 */

const STORAGE_KEY = "vakttornet.audio.v1";
const TARGET_VOLUME = 0.35;
const FADE_MS = 1200;
const FADE_TICK_MS = 60;
const EXTENSIONS = ["mp3", "ogg"] as const;

/** ~50ms of silence — played inside the arming gesture so Safari "blesses"
 * both elements, allowing later play() calls from async (post-probe) code. */
const SILENT_WAV =
  "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQAAAAA=";

interface Slot {
  el: HTMLAudioElement;
  /** resolved URL this slot is (or was last) playing */
  url: string | null;
  /** current fade level 0..1 (multiplied by TARGET_VOLUME and the mute gate) */
  level: number;
  /** fade destination 0..1 */
  target: number;
}

function audioBase(): string {
  // Respect the Vite base ("/vakttornet/" in this repo) in dev and on Pages.
  return `${import.meta.env.BASE_URL}audio/`;
}

class MusicManager {
  private slots: [Slot, Slot];
  private active = 0;
  /** logical id last requested via playTrack — same-id calls are no-ops */
  private currentId: string | null = null;
  /** guards async probe races: only the latest playTrack may start audio */
  private playSeq = 0;
  /** resolved-but-unplayed URL waiting for the arming gesture */
  private pendingUrl: string | null | undefined = undefined;
  private armed = false;
  private mutedFlag = false;
  private fadeTimer: number | null = null;
  /** probe results per track name — a track is only ever probed once */
  private probeCache = new Map<string, Promise<string | null>>();

  constructor() {
    this.slots = [this.makeSlot(), this.makeSlot()];
    this.mutedFlag = this.loadMuted();
    window.addEventListener("pointerdown", this.arm, { capture: true });
    window.addEventListener("keydown", this.arm, { capture: true });
  }

  get muted(): boolean {
    return this.mutedFlag;
  }

  /** Mute = volume 0, playback continues (unmute is instant). Persisted. */
  setMuted(muted: boolean): void {
    this.mutedFlag = muted;
    for (const slot of this.slots) this.applyVolume(slot);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ muted }));
    } catch {
      // Storage unavailable (private mode, quota) — mute still works for
      // this session, it just won't stick.
    }
  }

  /**
   * Request a track by logical id ("hub", "battle", "level01"…). Resolution
   * and fallback happen asynchronously; calling again with the same id is a
   * no-op, and a missing file chain ends in silence, never an error.
   */
  playTrack(id: string): void {
    if (this.currentId === id) return;
    this.currentId = id;
    const seq = ++this.playSeq;
    void this.resolveTrackUrl(id).then((url) => {
      if (seq !== this.playSeq) return; // superseded by a newer request
      if (!this.armed) {
        this.pendingUrl = url; // started by arm()
        return;
      }
      this.startUrl(url);
    });
  }

  // ---- Resolution ----

  /** Fallback chain: levelNN → battle → silence; hub/battle → silence. */
  private async resolveTrackUrl(id: string): Promise<string | null> {
    const candidates = id.startsWith("level") && id !== "battle" ? [id, "battle"] : [id];
    for (const name of candidates) {
      const url = await this.probeTrack(name);
      if (url !== null) return url;
    }
    return null;
  }

  private probeTrack(name: string): Promise<string | null> {
    let cached = this.probeCache.get(name);
    if (!cached) {
      cached = this.probeUncached(name);
      this.probeCache.set(name, cached);
    }
    return cached;
  }

  private async probeUncached(name: string): Promise<string | null> {
    for (const ext of EXTENSIONS) {
      const url = `${audioBase()}${name}.${ext}`;
      if (await this.urlExists(url)) return url;
    }
    return null;
  }

  private async urlExists(url: string): Promise<boolean> {
    try {
      const res = await fetch(url, { method: "HEAD" });
      if (!res.ok) return false;
      // SPA-fallback guard: some static hosts answer missing paths with the
      // index page and a 200 — an HTML content-type means "not an audio file".
      const type = res.headers.get("content-type") ?? "";
      return !type.includes("text/html");
    } catch {
      return false; // network error = treat as missing, stay silent
    }
  }

  // ---- Playback ----

  private startUrl(url: string | null): void {
    const current = this.slots[this.active]!;
    if (url === null) {
      // Nothing to play — fade out whatever is running.
      for (const slot of this.slots) slot.target = 0;
      this.ensureFadeTimer();
      return;
    }
    if (current.url === url && !current.el.paused) {
      // Already playing this file (e.g. two levels both falling back to
      // battle.mp3) — keep it going instead of crossfading into itself.
      current.target = 1;
      for (const slot of this.slots) if (slot !== current) slot.target = 0;
      this.ensureFadeTimer();
      return;
    }
    const next = this.slots[this.active === 0 ? 1 : 0]!;
    this.active = this.active === 0 ? 1 : 0;
    next.url = url;
    next.el.src = url;
    next.el.loop = true;
    next.level = 0;
    next.target = 1;
    this.applyVolume(next);
    next.el.play().catch(() => {
      // Autoplay denied or decode failure — stay silent, never log.
    });
    current.target = 0;
    this.ensureFadeTimer();
  }

  // ---- Crossfade ----

  private ensureFadeTimer(): void {
    if (this.fadeTimer !== null) return;
    this.fadeTimer = window.setInterval(() => this.fadeTick(), FADE_TICK_MS);
  }

  private fadeTick(): void {
    const step = FADE_TICK_MS / FADE_MS;
    let settled = true;
    for (const slot of this.slots) {
      if (slot.level < slot.target) slot.level = Math.min(slot.target, slot.level + step);
      else if (slot.level > slot.target) {
        slot.level = Math.max(slot.target, slot.level - step);
      }
      this.applyVolume(slot);
      if (slot.level !== slot.target) settled = false;
      else if (slot.target === 0 && !slot.el.paused) slot.el.pause();
    }
    if (settled && this.fadeTimer !== null) {
      window.clearInterval(this.fadeTimer);
      this.fadeTimer = null;
    }
  }

  private applyVolume(slot: Slot): void {
    slot.el.volume = this.mutedFlag ? 0 : slot.level * TARGET_VOLUME;
  }

  // ---- Autoplay arming ----

  private arm = (): void => {
    if (this.armed) return;
    this.armed = true;
    window.removeEventListener("pointerdown", this.arm, { capture: true });
    window.removeEventListener("keydown", this.arm, { capture: true });
    // Unlock both elements inside the gesture (Safari requires each media
    // element to first play within a user gesture).
    for (const slot of this.slots) {
      const el = slot.el;
      el.src = SILENT_WAV;
      el.play()
        .then(() => {
          // Stop the silent loop once unlocked — unless a real track already
          // replaced it (changing src rejects the pending play() promise, so
          // this guard is belt-and-braces).
          if (el.src === SILENT_WAV) el.pause();
        })
        .catch(() => {});
    }
    if (this.pendingUrl !== undefined) {
      const url = this.pendingUrl;
      this.pendingUrl = undefined;
      this.startUrl(url);
    }
    // A probe still in flight sees armed=true when it resolves and starts
    // playback itself.
  };

  // ---- Internals ----

  private makeSlot(): Slot {
    const el = new Audio();
    el.loop = true;
    el.preload = "auto";
    el.volume = 0;
    // Attach to the DOM (invisible without `controls`) so the slots are
    // inspectable via document.querySelectorAll("audio") when debugging.
    el.dataset["music"] = "slot";
    document.body?.appendChild(el);
    return { el, url: null, level: 0, target: 0 };
  }

  private loadMuted(): boolean {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw === null) return false;
      const data: unknown = JSON.parse(raw);
      if (typeof data === "object" && data !== null && "muted" in data) {
        return (data as { muted: unknown }).muted === true;
      }
      return false;
    } catch {
      return false; // corrupt or unavailable storage = sound on
    }
  }
}

/** App-wide singleton. Created at import time; harmless without audio files. */
export const music = new MusicManager();
