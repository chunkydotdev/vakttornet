import { describe, expect, it } from "vitest";
import { NO_META, type SimEvent } from "../src/index";
import { setup } from "./fixtures";

/** Run one tick and return events of a given type. */
function eventsOfType<T extends SimEvent["type"]>(
  events: SimEvent[],
  type: T,
): Array<Extract<SimEvent, { type: T }>> {
  return events.filter((e): e is Extract<SimEvent, { type: T }> => e.type === type);
}

describe("createSim initial state", () => {
  it("starts in building with the level's gold/lives and no entities", () => {
    const { sim } = setup();
    expect(sim.state.status).toBe("building");
    expect(sim.state.tick).toBe(0);
    expect(sim.state.gold).toBe(100);
    expect(sim.state.lives).toBe(3);
    expect(sim.state.score).toBe(0);
    expect(sim.state.waveIndex).toBe(0);
    expect(sim.state.totalWaves).toBe(1);
    expect(sim.state.towers).toEqual([]);
    expect(sim.state.enemies).toEqual([]);
    expect(sim.state.projectiles).toEqual([]);
  });

  it("applies meta startGoldBonus and startLivesBonus", () => {
    const { sim } = setup({}, { meta: { ...NO_META, startGoldBonus: 25, startLivesBonus: 2 } });
    expect(sim.state.gold).toBe(125);
    expect(sim.state.lives).toBe(5);
  });
});

describe("placeTower", () => {
  it("rejects unknown tower types", () => {
    const { sim } = setup();
    expect(sim.placeTower("nope", { col: 1, row: 1 })).toEqual({
      ok: false,
      reason: "unknown-tower",
    });
  });

  it("rejects non-buildable tiles (path tiles and out of bounds)", () => {
    const { sim } = setup();
    expect(sim.placeTower("archer", { col: 1, row: 2 })).toEqual({
      ok: false,
      reason: "not-buildable",
    });
    expect(sim.placeTower("archer", { col: 99, row: 0 })).toEqual({
      ok: false,
      reason: "not-buildable",
    });
  });

  it("rejects water tiles", () => {
    const { sim } = setup({ map: ["S~E", "P~P", "PPP"] });
    expect(sim.placeTower("archer", { col: 1, row: 0 })).toEqual({
      ok: false,
      reason: "not-buildable",
    });
  });

  it("rejects occupied tiles", () => {
    const { sim } = setup();
    expect(sim.placeTower("archer", { col: 1, row: 1 }).ok).toBe(true);
    expect(sim.placeTower("sniper", { col: 1, row: 1 })).toEqual({
      ok: false,
      reason: "occupied",
    });
  });

  it("rejects when gold is insufficient", () => {
    const { sim } = setup({ startGold: 40 });
    expect(sim.placeTower("archer", { col: 1, row: 1 })).toEqual({
      ok: false,
      reason: "insufficient-gold",
    });
  });

  it("checks occupied before insufficient-gold", () => {
    const { sim } = setup({ startGold: 50 });
    expect(sim.placeTower("archer", { col: 1, row: 1 }).ok).toBe(true); // gold now 0
    expect(sim.placeTower("archer", { col: 1, row: 1 })).toEqual({
      ok: false,
      reason: "occupied",
    });
  });

  it("deducts gold and adds the tower on success", () => {
    const { sim } = setup();
    const result = sim.placeTower("archer", { col: 1, row: 1 });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("unreachable");
    expect(result.tower).toMatchObject({
      typeId: "archer",
      tile: { col: 1, row: 1 },
      level: 1,
      cooldown: 0,
    });
    expect(sim.state.gold).toBe(50);
    expect(sim.state.towers).toHaveLength(1);
    expect(sim.state.towers[0]).toBe(result.tower);
  });

  it("allows placement during a wave", () => {
    const { sim } = setup();
    sim.startWave();
    sim.tick();
    expect(sim.state.status).toBe("wave");
    expect(sim.placeTower("archer", { col: 1, row: 1 }).ok).toBe(true);
  });
});

describe("command events", () => {
  it("queues command events and returns them on the next tick, in order", () => {
    const { sim } = setup({ startGold: 200 });
    const a = sim.placeTower("archer", { col: 1, row: 1 });
    const b = sim.placeTower("sniper", { col: 3, row: 1 });
    if (!a.ok || !b.ok) throw new Error("placement failed");
    expect(sim.upgradeTower(a.tower.id)).toBe(true);

    const events = sim.tick();
    expect(events).toEqual([
      { type: "towerPlaced", towerId: a.tower.id },
      { type: "towerPlaced", towerId: b.tower.id },
      { type: "towerUpgraded", towerId: a.tower.id, level: 2 },
    ]);
    // Queue is drained; nothing else happens while building.
    expect(sim.tick()).toEqual([]);
  });
});

describe("startWave and spawn timing", () => {
  it("transitions to wave, increments waveIndex, and emits waveStarted on next tick", () => {
    const { sim } = setup();
    expect(sim.startWave()).toBe(true);
    expect(sim.state.status).toBe("wave");
    expect(sim.state.waveIndex).toBe(1); // index of the NEXT wave to start
    const events = sim.tick();
    expect(eventsOfType(events, "waveStarted")).toEqual([{ type: "waveStarted", waveIndex: 0 }]);
  });

  it("returns false while a wave is active or when no waves remain", () => {
    const { sim } = setup();
    sim.startWave();
    expect(sim.startWave()).toBe(false); // already in a wave
  });

  it("spawns per entry with exact spacing and delay ticks", () => {
    const { sim } = setup({
      waves: [
        {
          entries: [
            { enemyTypeId: "runt", count: 2, spacingTicks: 5, delayTicks: 2 },
            { enemyTypeId: "runt", count: 2, spacingTicks: 3, delayTicks: 4 },
          ],
        },
      ],
    });
    sim.startWave();
    // Entry 1: offsets 2 and 7 (delay 2, spacing 5).
    // Entry 2: starts 4 after entry 1's last spawn → offsets 11 and 14.
    // Offset 0 spawns on the first tick after startWave → ticks 3, 8, 12, 15.
    const spawnTicks: number[] = [];
    for (let t = 1; t <= 16; t++) {
      const spawned = eventsOfType(sim.tick(), "enemySpawned");
      for (let i = 0; i < spawned.length; i++) spawnTicks.push(sim.state.tick);
    }
    expect(spawnTicks).toEqual([3, 8, 12, 15]);
  });

  it("spawns the first enemy on the first tick after startWave when delay is 0", () => {
    const { sim } = setup();
    sim.startWave();
    const events = sim.tick();
    expect(eventsOfType(events, "enemySpawned")).toHaveLength(1);
    expect(sim.state.enemies).toHaveLength(1);
  });
});

describe("movement and leaking", () => {
  it("moves enemies along the path and tracks prevPos for interpolation", () => {
    const { sim } = setup();
    sim.startWave();
    sim.tick();
    const enemy = sim.state.enemies[0]!;
    // Spawned at path[0] (0.5, 2.5) and moved 0.25 tiles on the spawn tick.
    expect(enemy.prevPos).toEqual({ x: 0.5, y: 2.5 });
    expect(enemy.pos).toEqual({ x: 0.75, y: 2.5 });
    expect(enemy.pathIndex).toBe(1);
    sim.tick();
    expect(enemy.prevPos).toEqual({ x: 0.75, y: 2.5 });
    expect(enemy.pos).toEqual({ x: 1, y: 2.5 });
  });

  it("leaks at the exit, decrementing lives, after exactly 24 ticks", () => {
    // Two waves so the run continues after the leak clears wave 0.
    const { sim } = setup({
      waves: [
        { entries: [{ enemyTypeId: "runt", count: 1, spacingTicks: 1 }] },
        { entries: [{ enemyTypeId: "runt", count: 1, spacingTicks: 1 }] },
      ],
    });
    sim.startWave();
    // 6 tiles at 0.25 tiles/tick = 24 ticks, first move on the spawn tick.
    for (let t = 1; t <= 23; t++) {
      expect(eventsOfType(sim.tick(), "enemyLeaked")).toHaveLength(0);
    }
    const events = sim.tick();
    expect(sim.state.tick).toBe(24);
    const leaks = eventsOfType(events, "enemyLeaked");
    expect(leaks).toHaveLength(1);
    expect(leaks[0]!.livesLeft).toBe(2);
    expect(sim.state.lives).toBe(2);
    expect(sim.state.enemies).toEqual([]);
    // Leaked wave still counts as cleared (everything spawned, nothing alive).
    expect(eventsOfType(events, "waveCleared")).toEqual([
      { type: "waveCleared", waveIndex: 0, bonus: 10 },
    ]);
    expect(sim.state.status).toBe("building");
  });

  it("loses the run when lives hit 0 and freezes the sim", () => {
    const { sim } = setup({ startLives: 1 });
    sim.startWave();
    let events: SimEvent[] = [];
    for (let t = 1; t <= 24; t++) events = sim.tick();
    expect(eventsOfType(events, "enemyLeaked")[0]!.livesLeft).toBe(0);
    expect(eventsOfType(events, "runLost")).toEqual([{ type: "runLost", score: 0 }]);
    expect(sim.state.status).toBe("lost");
    expect(sim.state.lives).toBe(0);

    // Frozen: tick is a no-op, commands are rejected.
    expect(sim.tick()).toEqual([]);
    expect(sim.state.tick).toBe(24);
    expect(sim.placeTower("archer", { col: 1, row: 1 }).ok).toBe(false);
    expect(sim.upgradeTower(1)).toBe(false);
    expect(sim.sellTower(1)).toBe(false);
    expect(sim.startWave()).toBe(false);
  });
});

describe("targeting", () => {
  it("fires on cooldown and targets the enemy furthest along the path", () => {
    const { sim } = setup({
      waves: [{ entries: [{ enemyTypeId: "runt", count: 2, spacingTicks: 4 }] }],
    });
    const placed = sim.placeTower("sniper", { col: 3, row: 1 }); // range 20, cooldown 5
    if (!placed.ok) throw new Error("placement failed");
    sim.startWave();

    const firstSpawnEvents = sim.tick(); // t1: enemy A spawns, sniper fires at it
    const enemyA = eventsOfType(firstSpawnEvents, "enemySpawned")[0]!.enemyId;
    expect(eventsOfType(firstSpawnEvents, "towerFired")).toHaveLength(1);

    for (let t = 2; t <= 5; t++) sim.tick(); // t5: enemy B spawns
    expect(sim.state.enemies).toHaveLength(2);

    // t6: cooldown elapsed (fires every 5 ticks: t1, t6). A is on pathIndex 2,
    // B on pathIndex 1 — the shot must target A. The sniper projectile is fast
    // enough to hit within the same tick, so read the hit event.
    const t6 = sim.tick();
    const fired = eventsOfType(t6, "towerFired");
    expect(fired).toHaveLength(1);
    const hit = eventsOfType(t6, "projectileHit").find(
      (h) => h.projectileId === fired[0]!.projectileId,
    );
    expect(hit).toBeDefined();
    expect(hit!.enemyId).toBe(enemyA);
  });

  it("breaks full ties by lowest enemy id", () => {
    const { sim } = setup({
      waves: [
        {
          entries: [
            { enemyTypeId: "runt", count: 1, spacingTicks: 1 },
            { enemyTypeId: "runt", count: 1, spacingTicks: 1 }, // delay 0 → same tick
          ],
        },
      ],
    });
    sim.placeTower("sniper", { col: 3, row: 1 });
    sim.startWave();
    const events = sim.tick(); // both spawn at the same position this tick
    const spawned = eventsOfType(events, "enemySpawned").map((e) => e.enemyId);
    expect(spawned).toHaveLength(2);
    const fired = eventsOfType(events, "towerFired");
    expect(fired).toHaveLength(1);
    // Projectile is still in flight this tick — inspect its target.
    const projectile = sim.state.projectiles.find((p) => p.id === fired[0]!.projectileId)!;
    expect(projectile.targetEnemyId).toBe(Math.min(...spawned));
  });
});

describe("combat, wave clear, win and loss", () => {
  it("kills award bounty as gold and score; clearing the last wave wins the run", () => {
    const { sim } = setup(); // 1 wave, 1 runt; archer one-shots it (12 dmg vs 10 hp)
    sim.placeTower("archer", { col: 1, row: 1 });
    sim.startWave();

    const t1 = sim.tick();
    expect(t1.map((e) => e.type)).toEqual([
      "towerPlaced",
      "waveStarted",
      "enemySpawned",
      "towerFired",
    ]);

    const t2 = sim.tick();
    expect(t2.map((e) => e.type)).toEqual([
      "projectileHit",
      "enemyDied",
      "waveCleared",
      "runWon",
    ]);
    expect(eventsOfType(t2, "enemyDied")[0]).toMatchObject({ bounty: 5 });
    expect(eventsOfType(t2, "waveCleared")[0]).toEqual({
      type: "waveCleared",
      waveIndex: 0,
      bonus: 10, // (0 + 1) * 10
    });
    // score = bounty 5 + wave bonus 10 + 3 lives * 2 win bonus = 21
    expect(eventsOfType(t2, "runWon")[0]).toEqual({ type: "runWon", score: 21 });
    expect(sim.state.score).toBe(21);
    expect(sim.state.gold).toBe(55); // 100 - 50 archer + 5 bounty
    expect(sim.state.status).toBe("won");
    expect(sim.state.enemies).toEqual([]);
    expect(sim.state.projectiles).toEqual([]);

    // Frozen after winning.
    expect(sim.tick()).toEqual([]);
    expect(sim.state.tick).toBe(2);
    expect(sim.startWave()).toBe(false);
    expect(sim.placeTower("archer", { col: 4, row: 1 }).ok).toBe(false);
  });

  it("returns to building between waves and scales the clear bonus by wave number", () => {
    const { sim } = setup({
      waves: [
        { entries: [{ enemyTypeId: "runt", count: 1, spacingTicks: 1 }] },
        { entries: [{ enemyTypeId: "runt", count: 1, spacingTicks: 1 }] },
      ],
    });
    sim.placeTower("archer", { col: 1, row: 1 });
    sim.startWave();
    sim.tick();
    const t2 = sim.tick();
    expect(eventsOfType(t2, "waveCleared")).toEqual([
      { type: "waveCleared", waveIndex: 0, bonus: 10 },
    ]);
    expect(eventsOfType(t2, "runWon")).toEqual([]);
    expect(sim.state.status).toBe("building");
    expect(sim.state.waveIndex).toBe(1);

    expect(sim.startWave()).toBe(true);
    let won = false;
    let finalEvents: SimEvent[] = [];
    for (let t = 0; t < 200 && !won; t++) {
      finalEvents = sim.tick();
      won = sim.state.status === "won";
    }
    expect(won).toBe(true);
    expect(eventsOfType(finalEvents, "waveCleared")).toEqual([
      { type: "waveCleared", waveIndex: 1, bonus: 20 }, // (1 + 1) * 10
    ]);
    // score = 2 bounties (10) + bonuses (10 + 20) + 3 lives * 2 = 46
    expect(sim.state.score).toBe(46);
    expect(sim.state.lives).toBe(3);
  });
});

describe("meta modifiers", () => {
  it("applies damageMult to projectile damage", () => {
    const { sim } = setup({}, { meta: { ...NO_META, damageMult: 2 } });
    sim.placeTower("sniper", { col: 3, row: 1 }); // base damage 1
    sim.startWave();
    const t1 = sim.tick();
    const fired = eventsOfType(t1, "towerFired")[0]!;
    const projectile = sim.state.projectiles.find((p) => p.id === fired.projectileId)!;
    expect(projectile.damage).toBe(2);
  });

  it("applies rangeMult to tower range at targeting time", () => {
    // Shed at (3,0) has center (3.5, 0.5); the path row is 2 tiles away,
    // beyond its base range of 1.
    const runWave = (meta?: { rangeMult: number }) => {
      const { sim } = setup(
        {
          waves: [
            { entries: [{ enemyTypeId: "runt", count: 1, spacingTicks: 1 }] },
            { entries: [{ enemyTypeId: "runt", count: 1, spacingTicks: 1 }] },
          ],
        },
        { meta: meta ? { ...NO_META, rangeMult: meta.rangeMult } : undefined },
      );
      sim.placeTower("shed", { col: 3, row: 0 });
      sim.startWave();
      const fired: SimEvent[] = [];
      for (let t = 1; t <= 24; t++) fired.push(...eventsOfType(sim.tick(), "towerFired"));
      return fired;
    };
    expect(runWave()).toHaveLength(0); // out of range without meta
    expect(runWave({ rangeMult: 2.5 }).length).toBeGreaterThan(0);
  });
});

describe("slow (petrify)", () => {
  /** Tick until an enemySlowed event appears; returns that tick's events. */
  function tickUntilSlowed(sim: ReturnType<typeof setup>["sim"], maxTicks = 30): SimEvent[] {
    for (let t = 0; t < maxTicks; t++) {
      const events = sim.tick();
      if (eventsOfType(events, "enemySlowed").length > 0) return events;
    }
    throw new Error("no enemySlowed event within maxTicks");
  }

  it("spawns enemies unslowed (slowTicksLeft 0, slowFactor 1)", () => {
    const { sim } = setup();
    sim.startWave();
    sim.tick();
    expect(sim.state.enemies[0]).toMatchObject({ slowTicksLeft: 0, slowFactor: 1 });
  });

  it("slow-tower projectiles carry the slow payload; no-slow towers' carry none", () => {
    const { sim } = setup({ startGold: 200 });
    // Archer projectile (1 tile/tick) stays in flight after the firing tick.
    sim.placeTower("archer", { col: 1, row: 1 });
    const lantern = sim.placeTower("lantern", { col: 5, row: 1 });
    if (!lantern.ok) throw new Error("placement failed");
    sim.startWave();
    const t1 = sim.tick(); // both fire at the freshly spawned runt
    const fired = eventsOfType(t1, "towerFired");
    expect(fired).toHaveLength(2);
    const byTower = (typeId: string) =>
      sim.state.projectiles.find((p) => p.towerTypeId === typeId)!;
    expect(byTower("archer").slow).toBeUndefined();
    expect(byTower("lantern").slow).toEqual({ factor: 0.5, durationTicks: 12 });
  });

  it("a slowed enemy travels less distance than an unslowed one over the same ticks", () => {
    const distanceAfter20Ticks = (withLantern: boolean) => {
      const { sim } = setup();
      if (withLantern) sim.placeTower("lantern", { col: 3, row: 1 });
      sim.startWave();
      for (let t = 1; t <= 20; t++) sim.tick();
      return sim.state.enemies[0]!.pos.x; // straight path: x = distance walked
    };
    expect(distanceAfter20Ticks(true)).toBeLessThan(distanceAfter20Ticks(false));
  });

  it("emits enemySlowed in the same tick as the projectileHit when the target survives", () => {
    const { sim } = setup();
    sim.placeTower("lantern", { col: 3, row: 1 }); // damage 1, runt has 10 hp
    sim.startWave();
    const events = tickUntilSlowed(sim);
    const hit = eventsOfType(events, "projectileHit")[0]!;
    expect(eventsOfType(events, "enemySlowed")).toEqual([
      { type: "enemySlowed", enemyId: hit.enemyId, durationTicks: 12 },
    ]);
    expect(eventsOfType(events, "enemyDied")).toEqual([]);
    expect(sim.state.enemies[0]).toMatchObject({ slowFactor: 0.5, slowTicksLeft: 12 });
  });

  it("does not emit enemySlowed when the hit kills the enemy", () => {
    const { sim } = setup();
    sim.placeTower("beacon", { col: 3, row: 1 }); // damage 50 one-shots the runt
    sim.startWave();
    let died: SimEvent[] = [];
    for (let t = 0; t < 10 && died.length === 0; t++) {
      const events = sim.tick();
      died = eventsOfType(events, "enemyDied");
      expect(eventsOfType(events, "enemySlowed")).toEqual([]);
    }
    expect(died).toHaveLength(1);
  });

  it("a new application overwrites factor and duration (no stacking, no strongest-wins)", () => {
    const { sim } = setup({
      startGold: 200,
      waves: [{ entries: [{ enemyTypeId: "tank", count: 1, spacingTicks: 1 }] }],
    });
    sim.placeTower("lantern", { col: 3, row: 1 }); // 0.5 × 12
    sim.startWave();
    tickUntilSlowed(sim);
    const enemy = sim.state.enemies[0]!;
    expect(enemy.slowFactor).toBe(0.5);
    expect(enemy.slowTicksLeft).toBe(12);

    // Second, WEAKER slow lands before the first expires: both values must be
    // replaced — stacking or strongest-wins would keep factor 0.5.
    sim.placeTower("beacon", { col: 3, row: 3 }); // 0.8 × 40
    const events = tickUntilSlowed(sim);
    expect(eventsOfType(events, "enemySlowed")).toEqual([
      { type: "enemySlowed", enemyId: enemy.id, durationTicks: 40 },
    ]);
    expect(enemy.slowFactor).toBe(0.8);
    expect(enemy.slowTicksLeft).toBe(40);
  });

  it("applies the factor for exactly durationTicks of movement, then restores full speed", () => {
    const { sim } = setup();
    sim.placeTower("lantern", { col: 3, row: 1 }); // 0.5 × 12, fires once
    sim.startWave();
    tickUntilSlowed(sim);
    const enemy = sim.state.enemies[0]!;
    expect(enemy.slowTicksLeft).toBe(12);

    // 12 ticks at 0.5 × 0.25 = 0.125 tiles/tick — the FULL duration moves slow.
    for (let i = 0; i < 12; i++) {
      const before = enemy.pos.x;
      sim.tick();
      expect(enemy.pos.x - before).toBeCloseTo(0.125, 10);
    }
    expect(enemy.slowTicksLeft).toBe(0);
    expect(enemy.slowFactor).toBe(1); // reset on expiry

    // Next tick moves at full speed again.
    const before = enemy.pos.x;
    sim.tick();
    expect(enemy.pos.x - before).toBeCloseTo(0.25, 10);
  });

  // slowResist 0 (the default, used by runt/tank in every test above) leaves
  // behavior unchanged: effective factor = payload factor. The suite above is
  // the regression coverage for that case.

  it("slowResist 1: no slow state, no enemySlowed event, full speed after the hit", () => {
    const { sim } = setup({
      waves: [{ entries: [{ enemyTypeId: "stoneskin", count: 1, spacingTicks: 1 }] }],
    });
    sim.placeTower("lantern", { col: 3, row: 1 }); // damage 1, slow 0.5 × 12
    sim.startWave();

    let hit: SimEvent | undefined;
    for (let t = 1; t <= 5 && !hit; t++) {
      const events = sim.tick();
      // An immune enemy shows no petrify: the event never fires.
      expect(eventsOfType(events, "enemySlowed")).toEqual([]);
      hit = eventsOfType(events, "projectileHit")[0];
    }
    expect(hit).toBeDefined(); // the projectile DID land (damage applies)...
    const enemy = sim.state.enemies[0]!;
    expect(enemy.hp).toBe(9);
    // ...but no slow state was set.
    expect(enemy).toMatchObject({ slowTicksLeft: 0, slowFactor: 1 });

    // Full speed on every following tick (0.25 tiles/tick, exact).
    for (let t = 0; t < 5; t++) {
      const before = enemy.pos.x;
      expect(eventsOfType(sim.tick(), "enemySlowed")).toEqual([]);
      expect(enemy.pos.x - before).toBe(0.25);
    }
  });

  it("slowResist 0.5 against factor 0.5: effective factor 0.75, duration unchanged", () => {
    const { sim } = setup({
      waves: [{ entries: [{ enemyTypeId: "halfskin", count: 1, spacingTicks: 1 }] }],
    });
    sim.placeTower("lantern", { col: 3, row: 1 }); // slow 0.5 × 12, fires once
    sim.startWave();

    const events = tickUntilSlowed(sim);
    const enemy = sim.state.enemies[0]!;
    // Partial resist still emits enemySlowed, with the payload's duration.
    expect(eventsOfType(events, "enemySlowed")).toEqual([
      { type: "enemySlowed", enemyId: enemy.id, durationTicks: 12 },
    ]);
    expect(enemy.slowFactor).toBe(0.75); // 0.5 + (1 − 0.5) × 0.5
    expect(enemy.slowTicksLeft).toBe(12);

    // 0.75 × 0.25 = exactly 0.1875 tiles/tick for the full 12-tick duration
    // (all positions are multiples of 1/16, so the math is float-exact).
    for (let i = 0; i < 12; i++) {
      const before = enemy.pos.x;
      sim.tick();
      expect(enemy.pos.x - before).toBe(0.1875);
    }
    expect(enemy.slowTicksLeft).toBe(0);
    expect(enemy.slowFactor).toBe(1);

    // Back to full speed once the slow expires.
    const before = enemy.pos.x;
    sim.tick();
    expect(enemy.pos.x - before).toBe(0.25);
  });
});

describe("splash", () => {
  it("kills every clustered enemy in radius in one hit, each paying bounty; outside radius unhurt", () => {
    const { sim } = setup({
      waves: [{ entries: [{ enemyTypeId: "runt", count: 3, spacingTicks: 2 }] }],
    });
    sim.startWave();
    // Spawns on ticks 1, 3, 5; let the first two walk ahead first.
    for (let t = 1; t <= 4; t++) sim.tick();
    // Place mid-wave so the boulder's first shot is on tick 5, when all three
    // runts are alive. After tick 5's movement: A x=1.75, B x=1.25, C x=0.75.
    const placed = sim.placeTower("boulder", { col: 1, row: 1 });
    if (!placed.ok) throw new Error("placement failed");
    const goldBefore = sim.state.gold;
    const scoreBefore = sim.state.score;

    const t5 = sim.tick();
    // Boulder targets A (furthest along); projectile speed 60 hits same tick.
    const hits = eventsOfType(t5, "projectileHit");
    expect(hits).toHaveLength(1);
    expect(hits[0]!.splashRadius).toBe(0.75); // event carries the radius
    expect(hits[0]!.at).toEqual({ x: 1.75, y: 2.5 }); // impact = A's position

    // A (primary) and B (0.5 tiles from impact) die; C (1.0 tiles) is outside
    // the 0.75 radius and completely unhurt. Both deaths pay full bounty.
    const died = eventsOfType(t5, "enemyDied");
    expect(died).toHaveLength(2);
    expect(died.map((d) => d.bounty)).toEqual([5, 5]);
    expect(sim.state.enemies).toHaveLength(1);
    expect(sim.state.enemies[0]!.hp).toBe(10);
    expect(sim.state.gold).toBe(goldBefore + 10);
    expect(sim.state.score).toBe(scoreBefore + 10);
  });

  it("non-splash projectile hits do not carry splashRadius", () => {
    const { sim } = setup();
    sim.placeTower("sniper", { col: 3, row: 1 });
    sim.startWave();
    let hit: SimEvent | undefined;
    for (let t = 0; t < 10 && !hit; t++) {
      hit = eventsOfType(sim.tick(), "projectileHit")[0];
    }
    expect(hit).toBeDefined();
    expect("splashRadius" in hit!).toBe(false);
  });
});

describe("splitsInto", () => {
  const splitterWave = {
    waves: [{ entries: [{ enemyTypeId: "splitter", count: 1, spacingTicks: 1 }] }],
  };

  it("killing a splitter spawns its children at the parent's position, same tick, after enemyDied", () => {
    const { sim } = setup(splitterWave);
    sim.placeTower("archer", { col: 1, row: 1 }); // 12 dmg one-shots hp 10
    sim.startWave();
    sim.tick(); // t1: spawn + fire
    const t2 = sim.tick(); // t2: hit kills the parent
    expect(t2.map((e) => e.type)).toEqual([
      "projectileHit",
      "enemyDied",
      "enemySpawned",
      "enemySpawned",
    ]);
    const died = eventsOfType(t2, "enemyDied")[0]!;
    expect(died).toMatchObject({ typeId: "splitter", bounty: 8 });

    const spawned = eventsOfType(t2, "enemySpawned");
    expect(spawned.map((e) => e.typeId)).toEqual(["runt", "runt"]);
    expect(sim.state.enemies.map((e) => e.id)).toEqual(spawned.map((e) => e.enemyId));
    for (const child of sim.state.enemies) {
      // Spawned exactly where the parent died, continuing its journey:
      // same pathIndex, prevPos = spawn pos, fresh stats, no inherited slow.
      expect(child.pos).toEqual(died.at);
      expect(child.prevPos).toEqual(child.pos);
      expect(child).toMatchObject({
        typeId: "runt",
        hp: 10,
        maxHp: 10,
        speed: 7.5,
        pathIndex: 1,
        bounty: 5,
        slowTicksLeft: 0,
        slowFactor: 1,
      });
    }
    // Distinct, deterministic ids in spawn order.
    expect(sim.state.enemies[1]!.id).toBe(sim.state.enemies[0]!.id + 1);

    // The wave is NOT cleared while children live.
    expect(eventsOfType(t2, "waveCleared")).toEqual([]);
    expect(sim.state.status).toBe("wave");
  });

  it("children walk the rest of the path and leak, costing lives", () => {
    const { sim } = setup({ ...splitterWave, startLives: 3 });
    sim.placeTower("beacon", { col: 3, row: 1 }); // 50 dmg one-shot, cooldown 90
    sim.startWave();

    // Kill the parent; children spawn mid-path.
    let died: Array<Extract<SimEvent, { type: "enemyDied" }>> = [];
    for (let t = 1; t <= 10 && died.length === 0; t++) {
      died = eventsOfType(sim.tick(), "enemyDied");
    }
    expect(died).toHaveLength(1);
    const childIds = sim.state.enemies.map((e) => e.id);
    expect(childIds).toHaveLength(2);

    // Both children (same pos, same speed) reach the exit in the same tick.
    let leaks: Array<Extract<SimEvent, { type: "enemyLeaked" }>> = [];
    let finalEvents: SimEvent[] = [];
    for (let t = 1; t <= 30 && leaks.length === 0; t++) {
      finalEvents = sim.tick();
      leaks = eventsOfType(finalEvents, "enemyLeaked");
    }
    expect(leaks.map((l) => l.enemyId)).toEqual(childIds);
    expect(leaks.map((l) => l.livesLeft)).toEqual([2, 1]);
    expect(sim.state.lives).toBe(1);
    expect(sim.state.enemies).toEqual([]);
    // Everything spawned and nothing alive → the wave clears in the leak tick.
    expect(eventsOfType(finalEvents, "waveCleared")).toHaveLength(1);
  });

  it("a LEAKED splitter does not split", () => {
    const { sim } = setup(splitterWave); // no towers — the parent walks through
    sim.startWave();
    const all: SimEvent[] = [];
    for (let t = 1; t <= 24; t++) all.push(...sim.tick());
    expect(eventsOfType(all, "enemyLeaked")).toHaveLength(1);
    expect(eventsOfType(all, "enemySpawned")).toHaveLength(1); // only the parent
    expect(eventsOfType(all, "enemyDied")).toEqual([]);
    expect(sim.state.enemies).toEqual([]);
    expect(sim.state.lives).toBe(2);
  });

  it("children pay their own bounty when killed; the wave clears only once they are all dead", () => {
    const { sim } = setup(splitterWave);
    sim.placeTower("ballista", { col: 1, row: 1 }); // 12 dmg every 2 ticks, hits same tick
    sim.startWave();

    // t1: the ballista one-shots the parent the moment it spawns — the death
    // and both child spawns land in the very first wave tick.
    const t1 = sim.tick();
    expect(t1.map((e) => e.type)).toEqual([
      "towerPlaced",
      "waveStarted",
      "enemySpawned",
      "towerFired",
      "projectileHit",
      "enemyDied",
      "enemySpawned",
      "enemySpawned",
    ]);
    expect(eventsOfType(t1, "waveCleared")).toEqual([]);

    const rest: SimEvent[] = [];
    for (let t = 1; t <= 20 && sim.state.status !== "won"; t++) rest.push(...sim.tick());
    expect(sim.state.status).toBe("won");
    const died = [...eventsOfType(t1, "enemyDied"), ...eventsOfType(rest, "enemyDied")];
    expect(died.map((d) => ({ typeId: d.typeId, bounty: d.bounty }))).toEqual([
      { typeId: "splitter", bounty: 8 },
      { typeId: "runt", bounty: 5 },
      { typeId: "runt", bounty: 5 },
    ]);
    expect(eventsOfType(rest, "waveCleared")).toHaveLength(1);
    expect(sim.state.gold).toBe(88); // 100 − 30 ballista + 8 + 5 + 5 bounty
    expect(sim.state.score).toBe(34); // bounties 18 + clear bonus 10 + 3 lives × 2
  });

  it("splits chain: a child with splitsInto splits again (grandchildren)", () => {
    const { sim } = setup({
      waves: [{ entries: [{ enemyTypeId: "bigsplitter", count: 1, spacingTicks: 1 }] }],
    });
    sim.placeTower("ballista", { col: 1, row: 1 });
    sim.startWave();

    const all: SimEvent[] = [];
    for (let t = 1; t <= 60 && sim.state.status !== "won"; t++) all.push(...sim.tick());
    expect(sim.state.status).toBe("won");
    expect(eventsOfType(all, "enemyLeaked")).toEqual([]);

    // 1 bigsplitter → 2 splitters → 4 runts: 7 spawns, 7 deaths.
    const spawnCounts = eventsOfType(all, "enemySpawned").reduce<Record<string, number>>(
      (acc, e) => ({ ...acc, [e.typeId]: (acc[e.typeId] ?? 0) + 1 }),
      {},
    );
    expect(spawnCounts).toEqual({ bigsplitter: 1, splitter: 2, runt: 4 });
    const died = eventsOfType(all, "enemyDied");
    expect(died).toHaveLength(7);
    const bountySum = died.reduce((sum, d) => sum + d.bounty, 0);
    expect(bountySum).toBe(48); // 12 + 2×8 + 4×5
    expect(sim.state.gold).toBe(100 - 30 + 48);
  });

  it("createSim throws when splitsInto references an unknown enemy type", () => {
    expect(() =>
      setup(
        {},
        {
          extraEnemies: [
            {
              id: "ghost",
              name: "Ghost",
              assetId: "enemy-ghost",
              hp: 5,
              speed: 7.5,
              bounty: 1,
              splitsInto: { enemyTypeId: "no-such-enemy", count: 2 },
            },
          ],
        },
      ),
    ).toThrow('Enemy "ghost" splitsInto unknown enemy type "no-such-enemy"');
  });
});

describe("income towers", () => {
  it("a damage-0 tower never targets or fires across a full wave", () => {
    const { sim } = setup(); // 1 wave, 1 runt
    const kvarn = sim.placeTower("kvarn", { col: 3, row: 1 }); // range 20 sees everything
    const archer = sim.placeTower("archer", { col: 1, row: 1 });
    if (!kvarn.ok || !archer.ok) throw new Error("placement failed");
    sim.startWave();

    const fired: number[] = [];
    for (let t = 0; t < 50 && sim.state.status !== "won"; t++) {
      fired.push(...eventsOfType(sim.tick(), "towerFired").map((e) => e.towerId));
    }
    expect(sim.state.status).toBe("won");
    expect(fired.length).toBeGreaterThan(0);
    expect(fired).not.toContain(kvarn.tower.id); // only the archer ever fired
    expect(fired.every((id) => id === archer.tower.id)).toBe(true);
  });

  it("pays incomePerWave per income tower on wave clear — gold only, never score", () => {
    const { sim } = setup({
      startGold: 200,
      waves: [
        { entries: [{ enemyTypeId: "runt", count: 1, spacingTicks: 1 }] },
        { entries: [{ enemyTypeId: "runt", count: 1, spacingTicks: 1 }] },
      ],
    });
    const k1 = sim.placeTower("kvarn", { col: 1, row: 0 });
    const k2 = sim.placeTower("kvarn", { col: 2, row: 0 });
    const archer = sim.placeTower("archer", { col: 1, row: 1 });
    if (!k1.ok || !k2.ok || !archer.ok) throw new Error("placement failed");
    sim.startWave();

    sim.tick(); // t1: waveStarted, spawn, archer fires
    const goldBefore = sim.state.gold;
    const scoreBefore = sim.state.score;
    const t2 = sim.tick(); // t2: kill clears wave 0
    // Income events come AFTER waveCleared, in the same tick, one per tower.
    expect(t2.map((e) => e.type)).toEqual([
      "projectileHit",
      "enemyDied",
      "waveCleared",
      "income",
      "income",
    ]);
    expect(eventsOfType(t2, "income")).toEqual([
      { type: "income", towerId: k1.tower.id, amount: 7 },
      { type: "income", towerId: k2.tower.id, amount: 7 },
    ]);
    expect(sim.state.gold).toBe(goldBefore + 5 + 14); // bounty + 2 × 7 income
    expect(sim.state.score).toBe(scoreBefore + 5 + 10); // bounty + clear bonus ONLY

    // Final wave: income also pays out alongside runWon (a cleared last wave
    // is still a cleared wave), ordered waveCleared → income → runWon.
    expect(sim.startWave()).toBe(true);
    let finalEvents: SimEvent[] = [];
    for (let t = 0; t < 100 && sim.state.status !== "won"; t++) {
      finalEvents = sim.tick();
    }
    expect(sim.state.status).toBe("won");
    const types = finalEvents.map((e) => e.type);
    expect(eventsOfType(finalEvents, "income")).toEqual([
      { type: "income", towerId: k1.tower.id, amount: 7 },
      { type: "income", towerId: k2.tower.id, amount: 7 },
    ]);
    expect(types.indexOf("waveCleared")).toBeLessThan(types.indexOf("income"));
    expect(types.lastIndexOf("income")).toBeLessThan(types.indexOf("runWon"));
    // score = bounties (5+5) + clear bonuses (10+20) + 3 lives × 2 = 46.
    // Income (4 × 7 = 28 gold) must not appear anywhere in the score.
    expect(sim.state.score).toBe(46);
  });
});

describe("upgrade and sell", () => {
  it("upgrades through max level, charging each level's cost", () => {
    const { sim } = setup({ startGold: 200 });
    const placed = sim.placeTower("archer", { col: 1, row: 1 });
    if (!placed.ok) throw new Error("placement failed");
    const id = placed.tower.id;
    expect(sim.state.gold).toBe(150);

    expect(sim.upgradeTower(id)).toBe(true); // level 2 costs 40
    expect(sim.state.gold).toBe(110);
    expect(placed.tower.level).toBe(2);

    expect(sim.upgradeTower(id)).toBe(true); // level 3 costs 60
    expect(sim.state.gold).toBe(50);
    expect(placed.tower.level).toBe(3);

    expect(sim.upgradeTower(id)).toBe(false); // already max level
    expect(sim.upgradeTower(999)).toBe(false); // unknown id
    expect(sim.state.gold).toBe(50);

    const events = sim.tick();
    expect(eventsOfType(events, "towerUpgraded")).toEqual([
      { type: "towerUpgraded", towerId: id, level: 2 },
      { type: "towerUpgraded", towerId: id, level: 3 },
    ]);
  });

  it("rejects upgrades the player cannot afford", () => {
    const { sim } = setup({ startGold: 60 });
    const placed = sim.placeTower("archer", { col: 1, row: 1 }); // gold 10 left
    if (!placed.ok) throw new Error("placement failed");
    expect(sim.upgradeTower(placed.tower.id)).toBe(false); // level 2 costs 40
    expect(placed.tower.level).toBe(1);
    expect(sim.state.gold).toBe(10);
  });

  it("sells for floor(refundRatio * total spent) and removes the tower", () => {
    const { sim } = setup({ startGold: 200 });
    const placed = sim.placeTower("archer", { col: 1, row: 1 });
    if (!placed.ok) throw new Error("placement failed");
    sim.upgradeTower(placed.tower.id);
    sim.upgradeTower(placed.tower.id); // total spent 50 + 40 + 60 = 150, gold 50 left

    expect(sim.sellTower(placed.tower.id)).toBe(true);
    expect(sim.state.gold).toBe(125); // 50 + floor(0.5 * 150)
    expect(sim.state.towers).toEqual([]);
    expect(sim.sellTower(placed.tower.id)).toBe(false); // already gone

    const events = sim.tick();
    expect(eventsOfType(events, "towerSold")).toEqual([
      { type: "towerSold", towerId: placed.tower.id, refund: 75 },
    ]);
  });

  it("floors fractional refunds", () => {
    const { sim } = setup();
    const placed = sim.placeTower("shed", { col: 1, row: 1 }); // cost 25
    if (!placed.ok) throw new Error("placement failed");
    const goldBefore = sim.state.gold;
    sim.sellTower(placed.tower.id);
    expect(sim.state.gold).toBe(goldBefore + 12); // floor(0.5 * 25) = 12
  });
});

describe("determinism", () => {
  it("produces identical states and event streams for the same seed and commands", () => {
    const run = () => {
      const { sim } = setup(
        {
          startGold: 300,
          startLives: 10,
          waves: [
            { entries: [{ enemyTypeId: "runt", count: 2, spacingTicks: 6 }] },
            {
              entries: [
                { enemyTypeId: "runt", count: 3, spacingTicks: 5, delayTicks: 2 },
                // Tight cluster (0.5 tiles apart) so the boulder's splash
                // resolves multi-kills inside the determinism script.
                { enemyTypeId: "runt", count: 3, spacingTicks: 2 },
              ],
            },
            {
              // Splitters (children spawn on kill) plus slow-resistant enemies
              // (partial + full resist) so both new mechanics run inside the
              // determinism script.
              entries: [
                { enemyTypeId: "splitter", count: 2, spacingTicks: 8 },
                { enemyTypeId: "halfskin", count: 1, spacingTicks: 4, delayTicks: 6 },
                { enemyTypeId: "stoneskin", count: 1, spacingTicks: 4, delayTicks: 2 },
              ],
            },
          ],
        },
        { seed: 1234 },
      );
      const events: SimEvent[] = [];
      const archer = sim.placeTower("archer", { col: 1, row: 1 });
      const sniper = sim.placeTower("sniper", { col: 3, row: 1 });
      const lantern = sim.placeTower("lantern", { col: 5, row: 1 });
      const kvarn = sim.placeTower("kvarn", { col: 5, row: 3 }); // income on each clear
      if (!archer.ok || !sniper.ok || !lantern.ok || !kvarn.ok) {
        throw new Error("placement failed");
      }
      sim.startWave();
      for (let t = 1; t <= 200; t++) {
        if (t === 10) sim.upgradeTower(archer.tower.id);
        if (t === 20) sim.sellTower(sniper.tower.id);
        if (t === 24) sim.placeTower("boulder", { col: 2, row: 3 }); // splash, mid-run
        if (sim.state.status === "building" && sim.state.waveIndex < sim.state.totalWaves) {
          sim.startWave();
        }
        events.push(...sim.tick());
      }
      return { state: sim.state, events };
    };

    const a = run();
    const b = run();
    expect(a.state).toStrictEqual(b.state);
    expect(a.events).toStrictEqual(b.events);
    expect(a.events.length).toBeGreaterThan(20); // the run actually did things
    expect(a.state.status).toBe("won"); // and resolved
  });
});
