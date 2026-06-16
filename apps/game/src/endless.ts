/**
 * App glue for Endless mode. Turns a (localised) content bundle into the
 * self-contained bundle + level the RunScreen feeds to the sim: the generated
 * scaled enemies replace the normal roster, and the single endless level
 * replaces the campaign levels. Towers/globals are kept as-is so building and
 * vårdträd accounting work exactly like a campaign run.
 *
 * Localisation falls out for free: generateEndless copies names/art from the
 * enemies it's handed, so passing the localised base bundle yields localised
 * scaled enemies — no per-id overlay needed for the hundreds of variants.
 */
import { generateEndless, type ContentBundle, type LevelDef } from "@vakttornet/content";

/** Fixed seed: the gauntlet is identical for everyone, so the run seed is a
 * constant (the sim's RNG is unused by current mechanics anyway). */
export const ENDLESS_SEED = 1;

export function buildEndlessBundle(base: ContentBundle): {
  bundle: ContentBundle;
  level: LevelDef;
} {
  const { level, enemies } = generateEndless(base.enemies);
  const bundle: ContentBundle = { ...base, enemies, levels: [level] };
  return { bundle, level };
}
