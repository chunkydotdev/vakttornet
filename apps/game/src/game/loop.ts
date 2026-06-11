/**
 * Fixed-timestep game loop — lives entirely outside React.
 *
 * requestAnimationFrame drives an accumulator: every frame we add the elapsed
 * wall time (scaled by the speed multiplier) and run sim.tick() while at least
 * TICK_SECONDS is banked. The leftover fraction (acc / TICK_SECONDS) is the
 * interpolation alpha handed to the renderer so movement looks smooth between
 * 30 Hz sim steps.
 */
import { TICK_SECONDS, type Sim, type SimEvent } from "@vakttornet/sim";

export type SimSpeed = 1 | 2;

export interface GameLoopOptions {
  sim: Sim;
  /** Called with each tick's events (only when non-empty). */
  onEvents: (events: SimEvent[]) => void;
  /** Called once after every frame that advanced at least one tick. */
  onTicked: () => void;
  /** Called every animation frame with the interpolation alpha in [0, 1]. */
  render: (alpha: number) => void;
}

export interface GameLoop {
  setSpeed(speed: SimSpeed): void;
  getSpeed(): SimSpeed;
  stop(): void;
}

/** Clamp huge frame deltas (tab was backgrounded) so we don't spiral. */
const MAX_FRAME_SECONDS = 0.25;

export function startGameLoop({ sim, onEvents, onTicked, render }: GameLoopOptions): GameLoop {
  let speed: SimSpeed = 1;
  let rafId = 0;
  let running = true;
  let last: number | null = null;
  let acc = 0;

  function frame(now: number): void {
    if (!running) return;
    rafId = requestAnimationFrame(frame);

    const dt = last === null ? 0 : Math.min((now - last) / 1000, MAX_FRAME_SECONDS);
    last = now;

    const ended = sim.state.status === "won" || sim.state.status === "lost";
    if (!ended) {
      acc += dt * speed;
      let ticked = false;
      while (acc >= TICK_SECONDS) {
        const events = sim.tick();
        if (events.length > 0) onEvents(events);
        acc -= TICK_SECONDS;
        ticked = true;
        if (sim.state.status === "won" || sim.state.status === "lost") {
          acc = 0;
          break;
        }
      }
      if (ticked) onTicked();
    }

    render(Math.min(acc / TICK_SECONDS, 1));
  }

  rafId = requestAnimationFrame(frame);

  return {
    setSpeed(next: SimSpeed) {
      speed = next;
    },
    getSpeed() {
      return speed;
    },
    stop() {
      running = false;
      cancelAnimationFrame(rafId);
    },
  };
}
