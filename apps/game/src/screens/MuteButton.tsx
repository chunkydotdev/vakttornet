/**
 * Shared mute toggle — same look on the hub toolbar and the run HUD.
 * Mute keeps playback running at volume 0 (see music.ts), so toggling back
 * is instant. State lives in the MusicManager; this component just mirrors it.
 */
import { useState } from "react";
import { music } from "../game/music";
import { useT } from "../i18n";

export function MuteButton() {
  const { t } = useT();
  const [muted, setMuted] = useState<boolean>(() => music.muted);

  function toggle() {
    const next = !muted;
    music.setMuted(next);
    setMuted(next);
  }

  const label = muted ? t("soundOn") : t("soundOff");

  return (
    <button
      type="button"
      className="btn mute-btn"
      onClick={toggle}
      aria-label={label}
      title={label}
      aria-pressed={muted}
    >
      {muted ? "🔇" : "🔊"}
    </button>
  );
}
