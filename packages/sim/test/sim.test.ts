import { describe, expect, it } from "vitest";
import { NO_META, type SimEvent, type TargetingMode } from "../src/index";
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

  it("loses the run outright when a boss leaks, without spending a life", () => {
    const { sim } = setup(
      {
        startLives: 3,
        waves: [{ entries: [{ enemyTypeId: "bosstroll", count: 1, spacingTicks: 1 }] }],
      },
      {
        extraEnemies: [
          {
            id: "bosstroll",
            name: "Boss Troll",
            assetId: "enemy-bosstroll",
            hp: 1000,
            speed: 7.5, // 0.25 tiles/tick → leaks at tick 24, same as runt
            bounty: 50,
            boss: true,
          },
        ],
      },
    );
    sim.startWave();
    let events: SimEvent[] = [];
    for (let t = 1; t <= 23; t++) {
      events = sim.tick();
      expect(eventsOfType(events, "enemyLeaked")).toHaveLength(0);
    }
    events = sim.tick(); // tick 24: the boss reaches the stuga
    expect(sim.state.tick).toBe(24);
    // The leak fires but no life is spent — a leaked boss loses the run outright.
    const leaks = eventsOfType(events, "enemyLeaked");
    expect(leaks).toHaveLength(1);
    expect(leaks[0]!.livesLeft).toBe(3);
    expect(eventsOfType(events, "runLost")).toEqual([{ type: "runLost", score: 0 }]);
    expect(sim.state.status).toBe("lost");
    expect(sim.state.lives).toBe(3);

    // Frozen afterward, exactly like a lives-depleted loss.
    expect(sim.tick()).toEqual([]);
    expect(sim.state.tick).toBe(24);
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

describe("targeting modes", () => {
  // Four enemies, one tick apart, same speed: A is furthest along, D rear-most;
  // B has the most hp, C the least. So each mode picks a DISTINCT enemy.
  const ENEMIES = [
    { id: "t-a", name: "A", assetId: "enemy-runt", hp: 50, speed: 7.5, bounty: 1 },
    { id: "t-b", name: "B", assetId: "enemy-runt", hp: 500, speed: 7.5, bounty: 1 },
    { id: "t-c", name: "C", assetId: "enemy-runt", hp: 5, speed: 7.5, bounty: 1 },
    { id: "t-d", name: "D", assetId: "enemy-runt", hp: 80, speed: 7.5, bounty: 1 },
  ];
  const WAVE = {
    waves: [
      {
        entries: [
          { enemyTypeId: "t-a", count: 1, spacingTicks: 1, delayTicks: 0 },
          { enemyTypeId: "t-b", count: 1, spacingTicks: 1, delayTicks: 1 },
          { enemyTypeId: "t-c", count: 1, spacingTicks: 1, delayTicks: 1 },
          { enemyTypeId: "t-d", count: 1, spacingTicks: 1, delayTicks: 1 },
        ],
      },
    ],
  };

  /** Return the typeId of the enemy the sniper targets at t6 (all four present,
   * none yet killed by the 1-damage sniper). */
  function targetedTypeId(mode?: TargetingMode): string {
    const { sim } = setup(WAVE, { extraEnemies: ENEMIES });
    // Far corner: whole-map range still sees everyone, but the projectile stays
    // in flight past the fire tick so we can read its target.
    const placed = sim.placeTower("sniper", { col: 6, row: 4 }); // range 20
    if (!placed.ok) throw new Error("placement failed");
    if (mode) expect(sim.setTowerTargeting(placed.tower.id, mode)).toBe(true);
    sim.startWave();
    let targetId = -1;
    for (let t = 1; t <= 6; t++) {
      for (const f of eventsOfType(sim.tick(), "towerFired")) {
        targetId = sim.state.projectiles.find((p) => p.id === f.projectileId)!.targetEnemyId;
      }
    }
    return sim.state.enemies.find((e) => e.id === targetId)!.typeId;
  }

  it("first (the default) shoots the enemy furthest along the path", () => {
    expect(targetedTypeId()).toBe("t-a");
    expect(targetedTypeId("first")).toBe("t-a");
  });

  it("last shoots the rear-most enemy", () => {
    expect(targetedTypeId("last")).toBe("t-d");
  });

  it("strongest shoots the highest-hp enemy", () => {
    expect(targetedTypeId("strongest")).toBe("t-b");
  });

  it("weakest shoots the lowest-hp enemy", () => {
    expect(targetedTypeId("weakest")).toBe("t-c");
  });

  it("setTowerTargeting returns false for an unknown tower id", () => {
    const { sim } = setup();
    expect(sim.setTowerTargeting(9999, "last")).toBe(false);
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

describe("pulse towers", () => {
  it("hits ALL enemies in range simultaneously; one towerPulsed before the deaths; outsiders untouched", () => {
    const { sim } = setup({
      waves: [{ entries: [{ enemyTypeId: "wisp", count: 3, spacingTicks: 2 }] }],
    });
    sim.startWave();
    // Wisps spawn on ticks 1, 3, 5. After tick 9's movement: A x=2.75
    // (1.60 tiles from the storm center (1.5,1.5) — out of range 1.5),
    // B x=2.25 (1.25, in), C x=1.75 (1.03, in).
    const spawned: number[] = [];
    for (let t = 1; t <= 8; t++) {
      spawned.push(...eventsOfType(sim.tick(), "enemySpawned").map((e) => e.enemyId));
    }
    expect(spawned).toHaveLength(3);
    const [a, b, c] = spawned as [number, number, number];

    // Place mid-wave so the storm's first ready tick is tick 9.
    const storm = sim.placeTower("storm", { col: 1, row: 1 });
    if (!storm.ok) throw new Error("placement failed");
    const goldBefore = sim.state.gold;
    const scoreBefore = sim.state.score;

    const t9 = sim.tick();
    // ONE towerPulsed (damage 9 one-shots wisps), then the deaths in
    // enemy-array (spawn) order — B before C — each paying full bounty.
    expect(t9.map((e) => e.type)).toEqual([
      "towerPlaced",
      "towerPulsed",
      "enemyDied",
      "enemyDied",
    ]);
    expect(eventsOfType(t9, "towerPulsed")).toEqual([
      { type: "towerPulsed", towerId: storm.tower.id, range: 1.5, hitCount: 2 },
    ]);
    expect(eventsOfType(t9, "enemyDied").map((d) => d.enemyId)).toEqual([b, c]);
    expect(eventsOfType(t9, "enemyDied").map((d) => d.bounty)).toEqual([5, 5]);
    expect(sim.state.gold).toBe(goldBefore + 10);
    expect(sim.state.score).toBe(scoreBefore + 10);

    // The outsider A is completely untouched — even though the storm's level
    // carries splashRadius 5, pulse towers ignore splash entirely.
    expect(sim.state.enemies.map((e) => e.id)).toEqual([a]);
    expect(sim.state.enemies[0]!.hp).toBe(9);

    // Pulses are instant: no projectiles, no towerFired.
    expect(eventsOfType(t9, "towerFired")).toEqual([]);
    expect(sim.state.projectiles).toEqual([]);
  });

  it("does not pulse on empty range — stays ready and fires the exact tick an enemy enters", () => {
    const { sim } = setup(); // 1 runt
    const storm = sim.placeTower("storm", { col: 4, row: 1 });
    if (!storm.ok) throw new Error("placement failed");
    sim.startWave();

    // The runt enters the storm's range (1.5 from center (4.5,1.5)) on
    // tick 12: x=3.5 → d=√2 ≈ 1.41. On tick 11 (x=3.25) d ≈ 1.60 — still out.
    for (let t = 1; t <= 11; t++) {
      expect(eventsOfType(sim.tick(), "towerPulsed")).toEqual([]);
      expect(storm.tower.cooldown).toBe(0); // never wasted on empty air
    }
    expect(sim.state.enemies[0]!.hp).toBe(10);

    const t12 = sim.tick();
    expect(eventsOfType(t12, "towerPulsed")).toEqual([
      { type: "towerPulsed", towerId: storm.tower.id, range: 1.5, hitCount: 1 },
    ]);
    expect(storm.tower.cooldown).toBe(60);
    const runt = sim.state.enemies[0]!;
    expect(runt.hp).toBe(1);
    // The storm's slow payload is ignored: no enemySlowed, no slow state.
    expect(eventsOfType(t12, "enemySlowed")).toEqual([]);
    expect(runt).toMatchObject({ slowTicksLeft: 0, slowFactor: 1 });
  });

  it("respects cooldown between pulses — damage lands exactly cooldownTicks apart", () => {
    const { sim } = setup({
      waves: [{ entries: [{ enemyTypeId: "slug", count: 1, spacingTicks: 1 }] }],
    });
    sim.placeTower("storm", { col: 1, row: 1 });
    sim.startWave();

    // The slug (0.03125 tiles/tick) spawns in range and stays there past two
    // cooldown windows; by tick 121 it has crawled out, so exactly 2 pulses.
    const pulseTicks: number[] = [];
    const hpAtPulse: number[] = [];
    const all: SimEvent[] = [];
    for (let t = 1; t <= 130; t++) {
      const events = sim.tick();
      all.push(...events);
      if (eventsOfType(events, "towerPulsed").length > 0) {
        pulseTicks.push(sim.state.tick);
        hpAtPulse.push(sim.state.enemies[0]!.hp);
      }
    }
    expect(pulseTicks).toEqual([1, 61]); // exactly cooldownTicks (60) apart
    expect(hpAtPulse).toEqual([991, 982]); // 9 damage per pulse
    // The slow payload on the storm's level is ignored on every pulse.
    expect(eventsOfType(all, "enemySlowed")).toEqual([]);
    expect(sim.state.enemies[0]).toMatchObject({ slowTicksLeft: 0, slowFactor: 1 });
  });

  it("pulse kills pay bounty and trigger splitsInto children, spawned after the death", () => {
    const { sim } = setup({
      waves: [{ entries: [{ enemyTypeId: "wispmother", count: 1, spacingTicks: 1 }] }],
    });
    sim.placeTower("storm", { col: 1, row: 1 }); // 9 dmg one-shots hp 9
    sim.startWave();
    const goldBefore = sim.state.gold;

    const t1 = sim.tick();
    expect(t1.map((e) => e.type)).toEqual([
      "towerPlaced",
      "waveStarted",
      "enemySpawned",
      "towerPulsed",
      "enemyDied",
      "enemySpawned",
      "enemySpawned",
    ]);
    const died = eventsOfType(t1, "enemyDied")[0]!;
    expect(died).toMatchObject({ typeId: "wispmother", bounty: 8 });
    expect(sim.state.gold).toBe(goldBefore + 8);
    expect(sim.state.score).toBe(8);

    // Children continue the parent's journey from where it died.
    expect(sim.state.enemies.map((e) => e.typeId)).toEqual(["wisp", "wisp"]);
    for (const child of sim.state.enemies) {
      expect(child.pos).toEqual(died.at);
      expect(child.pathIndex).toBe(1);
    }
    // The wave is NOT cleared while children live.
    expect(eventsOfType(t1, "waveCleared")).toEqual([]);
    expect(sim.state.status).toBe("wave");
  });

  it("applies meta damageMult to pulse damage", () => {
    const { sim } = setup(
      { waves: [{ entries: [{ enemyTypeId: "tank", count: 1, spacingTicks: 1 }] }] },
      { meta: { ...NO_META, damageMult: 2 } },
    );
    sim.placeTower("storm", { col: 1, row: 1 }); // base damage 9 → 18
    sim.startWave();
    const t1 = sim.tick();
    expect(eventsOfType(t1, "towerPulsed")).toHaveLength(1);
    expect(sim.state.enemies[0]!.hp).toBe(1000 - 18);
  });

  it("applies meta rangeMult to pulse range and reports the effective range", () => {
    // Storm at (3,0) is 2 tiles above the path — beyond its base range 1.5.
    const run = (rangeMult?: number) => {
      const { sim } = setup({}, rangeMult ? { meta: { ...NO_META, rangeMult } } : {});
      sim.placeTower("storm", { col: 3, row: 0 });
      sim.startWave();
      const pulses: Array<Extract<SimEvent, { type: "towerPulsed" }>> = [];
      for (let t = 1; t <= 24; t++) pulses.push(...eventsOfType(sim.tick(), "towerPulsed"));
      return pulses;
    };
    expect(run()).toEqual([]); // out of range without meta
    const pulses = run(2);
    expect(pulses.length).toBeGreaterThan(0);
    expect(pulses[0]!.range).toBe(3); // event carries the effective 1.5 × 2
  });

  it("a damage-0 pulse tower never pulses; its income still pays on wave clear", () => {
    const { sim } = setup(); // 1 wave, 1 runt
    const mill = sim.placeTower("stormkvarn", { col: 3, row: 1 }); // range 20 sees all
    const archer = sim.placeTower("archer", { col: 1, row: 1 });
    if (!mill.ok || !archer.ok) throw new Error("placement failed");
    sim.startWave();

    const all: SimEvent[] = [];
    for (let t = 0; t < 50 && sim.state.status !== "won"; t++) all.push(...sim.tick());
    expect(sim.state.status).toBe("won");
    expect(eventsOfType(all, "towerPulsed")).toEqual([]);
    expect(eventsOfType(all, "income")).toEqual([
      { type: "income", towerId: mill.tower.id, amount: 7 },
    ]);
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

/** Place a single-level tower and immediately pick one of its mutations
 * (level 1 is max level for these fixtures, so mutating right away is legal). */
function placeMutated(
  sim: ReturnType<typeof setup>["sim"],
  typeId: string,
  tile: { col: number; row: number },
  mutationId: string,
): number {
  const placed = sim.placeTower(typeId, tile);
  if (!placed.ok) throw new Error(`placement failed: ${typeId}`);
  if (!sim.mutateTower(placed.tower.id, mutationId)) {
    throw new Error(`mutation failed: ${mutationId}`);
  }
  return placed.tower.id;
}

describe("mutateTower", () => {
  it("rejects unknown towers and mutations that don't belong to the tower's def", () => {
    const { sim } = setup({ startGold: 250 });
    const archer = sim.placeTower("archer", { col: 1, row: 1 });
    const sniper = sim.placeTower("sniper", { col: 3, row: 1 });
    if (!archer.ok || !sniper.ok) throw new Error("placement failed");
    sim.upgradeTower(archer.tower.id);
    sim.upgradeTower(archer.tower.id); // archer now max level (3)
    const goldBefore = sim.state.gold;

    expect(sim.mutateTower(999, "archer-frenzy")).toBe(false); // unknown tower
    expect(sim.mutateTower(archer.tower.id, "nope")).toBe(false); // unknown mutation
    expect(sim.mutateTower(archer.tower.id, "kvarn-gild")).toBe(false); // other tower's mutation
    // The sniper is at its max level (1) but its def offers no mutations.
    expect(sim.mutateTower(sniper.tower.id, "archer-frenzy")).toBe(false);

    expect(sim.state.gold).toBe(goldBefore); // nothing was charged
    expect(archer.tower.mutationId).toBeNull();
    expect(sniper.tower.mutationId).toBeNull();
  });

  it("rejects towers below max level", () => {
    const { sim } = setup({ startGold: 250 });
    const placed = sim.placeTower("archer", { col: 1, row: 1 });
    if (!placed.ok) throw new Error("placement failed");
    expect(sim.mutateTower(placed.tower.id, "archer-frenzy")).toBe(false); // level 1
    sim.upgradeTower(placed.tower.id);
    expect(sim.mutateTower(placed.tower.id, "archer-frenzy")).toBe(false); // level 2
    sim.upgradeTower(placed.tower.id);
    expect(sim.mutateTower(placed.tower.id, "archer-frenzy")).toBe(true); // level 3 = max
  });

  it("rejects when gold is insufficient, charging nothing", () => {
    const { sim } = setup({ startGold: 150 });
    const placed = sim.placeTower("archer", { col: 1, row: 1 });
    if (!placed.ok) throw new Error("placement failed");
    sim.upgradeTower(placed.tower.id);
    sim.upgradeTower(placed.tower.id); // 150 spent — gold now 0
    expect(sim.state.gold).toBe(0);
    expect(sim.mutateTower(placed.tower.id, "archer-frenzy")).toBe(false); // costs 50
    expect(sim.state.gold).toBe(0);
    expect(placed.tower.mutationId).toBeNull();
  });

  it("deducts gold, sets mutationId, and queues towerMutated like other command events", () => {
    const { sim } = setup({ startGold: 200 });
    const placed = sim.placeTower("archer", { col: 1, row: 1 });
    if (!placed.ok) throw new Error("placement failed");
    sim.upgradeTower(placed.tower.id);
    sim.upgradeTower(placed.tower.id); // gold now 50
    expect(sim.mutateTower(placed.tower.id, "archer-frenzy")).toBe(true);
    expect(sim.state.gold).toBe(0); // frenzy costs exactly 50
    expect(placed.tower.mutationId).toBe("archer-frenzy");

    // Once per tower: neither the same nor the sibling branch can be added.
    expect(sim.mutateTower(placed.tower.id, "archer-frenzy")).toBe(false);
    expect(sim.mutateTower(placed.tower.id, "archer-eagle")).toBe(false);
    expect(placed.tower.mutationId).toBe("archer-frenzy");

    const events = sim.tick();
    expect(events).toEqual([
      { type: "towerPlaced", towerId: placed.tower.id },
      { type: "towerUpgraded", towerId: placed.tower.id, level: 2 },
      { type: "towerUpgraded", towerId: placed.tower.id, level: 3 },
      { type: "towerMutated", towerId: placed.tower.id, mutationId: "archer-frenzy" },
    ]);
  });

  it("is rejected after the run ends", () => {
    const { sim } = setup(); // 1 wave, 1 runt; twinbow one-shots it
    const placed = sim.placeTower("twinbow", { col: 1, row: 1 });
    if (!placed.ok) throw new Error("placement failed");
    sim.startWave();
    sim.tick();
    expect(sim.state.status).toBe("won");
    const goldBefore = sim.state.gold;
    expect(sim.mutateTower(placed.tower.id, "twin-volley")).toBe(false);
    expect(sim.state.gold).toBe(goldBefore);
    expect(placed.tower.mutationId).toBeNull();
  });

  it("counts the mutation cost in the sell refund's total spent", () => {
    const { sim } = setup({ startGold: 250 });
    const placed = sim.placeTower("archer", { col: 1, row: 1 });
    if (!placed.ok) throw new Error("placement failed");
    sim.upgradeTower(placed.tower.id);
    sim.upgradeTower(placed.tower.id);
    sim.mutateTower(placed.tower.id, "archer-frenzy"); // total spent 150 + 50 = 200
    expect(sim.state.gold).toBe(50);

    expect(sim.sellTower(placed.tower.id)).toBe(true);
    expect(sim.state.gold).toBe(150); // 50 + floor(0.5 × 200)
    const events = sim.tick();
    expect(eventsOfType(events, "towerSold")).toEqual([
      { type: "towerSold", towerId: placed.tower.id, refund: 100 },
    ]);
  });

  it("createSim throws when a tower has duplicate mutation ids", () => {
    expect(() =>
      setup(
        {},
        {
          extraTowers: [
            {
              id: "dupmut",
              name: "Dup",
              assetId: "tower-dup",
              description: "duplicate mutation ids",
              levels: [
                { cost: 10, damage: 1, range: 1, cooldownTicks: 10, projectileSpeed: 10 },
              ],
              mutations: [
                { id: "same", name: "A", description: "a", cost: 5, effect: { damageMult: 2 } },
                { id: "same", name: "B", description: "b", cost: 5, effect: { rangeAdd: 1 } },
              ],
            },
          ],
        },
      ),
    ).toThrow('Tower "dupmut" has duplicate mutation id "same"');
  });
});

describe("mutation stat modifiers", () => {
  it("damageMult multiplies hit damage and cooldownMult shortens the fire interval", () => {
    const { sim } = setup({
      startGold: 200,
      waves: [{ entries: [{ enemyTypeId: "tank", count: 1, spacingTicks: 1 }] }],
    });
    const placed = sim.placeTower("archer", { col: 1, row: 1 });
    if (!placed.ok) throw new Error("placement failed");
    sim.upgradeTower(placed.tower.id);
    sim.upgradeTower(placed.tower.id); // level 3: damage 48, cooldown 6
    sim.mutateTower(placed.tower.id, "archer-frenzy"); // ×2 damage, ×0.5 cooldown
    sim.startWave();

    const fireTicks: number[] = [];
    const hitDamages: number[] = [];
    for (let t = 1; t <= 12; t++) {
      const events = sim.tick();
      if (eventsOfType(events, "towerFired").length > 0) fireTicks.push(sim.state.tick);
      hitDamages.push(...eventsOfType(events, "projectileHit").map((h) => h.damage));
    }
    expect(fireTicks).toEqual([1, 4, 7, 10]); // round(6 × 0.5) = 3 ticks apart
    expect(hitDamages.length).toBeGreaterThan(0);
    expect(hitDamages.every((d) => d === 96)).toBe(true); // 48 × 2
  });

  it("cooldownMult rounds and clamps to a minimum of 1 tick", () => {
    const { sim } = setup({
      waves: [{ entries: [{ enemyTypeId: "tank", count: 1, spacingTicks: 1 }] }],
    });
    // Ballista cooldown 2 × 0.1 = 0.2 → round 0 → clamped to 1: fires EVERY tick.
    placeMutated(sim, "ballista", { col: 1, row: 1 }, "ballista-rapid");
    sim.startWave();
    const fireTicks: number[] = [];
    for (let t = 1; t <= 6; t++) {
      if (eventsOfType(sim.tick(), "towerFired").length > 0) fireTicks.push(sim.state.tick);
    }
    expect(fireTicks).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it("rangeAdd lets a tower reach beyond its base range", () => {
    // The shed at (3,0) has center (3.5, 0.5) — 2 tiles from the path row,
    // beyond its base range 1 but within 1 + 1.5 = 2.5 once mutated.
    const firedCount = (mutate: boolean) => {
      const { sim } = setup();
      const placed = sim.placeTower("shed", { col: 3, row: 0 });
      if (!placed.ok) throw new Error("placement failed");
      if (mutate) expect(sim.mutateTower(placed.tower.id, "shed-scope")).toBe(true);
      sim.startWave();
      let count = 0;
      for (let t = 1; t <= 24; t++) count += eventsOfType(sim.tick(), "towerFired").length;
      return count;
    };
    expect(firedCount(false)).toBe(0);
    expect(firedCount(true)).toBeGreaterThan(0);
  });

  it("applies rangeAdd BEFORE meta rangeMult: (base + rangeAdd) × rangeMult", () => {
    // Shed at (6,0), center (6.5, 0.5); runt walks x = 0.5 + 0.25t along y 2.5.
    // Correct order: (1 + 1.5) × 2 = 5 → first in range at x = 2.0 → tick 6.
    // Wrong order (1 × 2 + 1.5 = 3.5) would first fire at tick 13, and
    // un-multiplied 2.5 at tick 18 — the first-fire tick pins the formula.
    const { sim } = setup({}, { meta: { ...NO_META, rangeMult: 2 } });
    placeMutated(sim, "shed", { col: 6, row: 0 }, "shed-scope");
    sim.startWave();
    let firstFire = 0;
    for (let t = 1; t <= 24 && firstFire === 0; t++) {
      if (eventsOfType(sim.tick(), "towerFired").length > 0) firstFire = sim.state.tick;
    }
    expect(firstFire).toBe(6);
  });
});

describe("multishot", () => {
  it("fires one projectile and one towerFired per target, never doubling a target", () => {
    const { sim } = setup({
      waves: [
        {
          entries: [
            { enemyTypeId: "runt", count: 1, spacingTicks: 1 },
            { enemyTypeId: "runt", count: 1, spacingTicks: 1 }, // same-tick spawn
          ],
        },
      ],
    });
    const bow = placeMutated(sim, "twinbow", { col: 1, row: 1 }, "twin-volley");

    sim.startWave();
    const t1 = sim.tick();
    const spawned = eventsOfType(t1, "enemySpawned").map((e) => e.enemyId);
    expect(spawned).toHaveLength(2);

    const fired = eventsOfType(t1, "towerFired");
    expect(fired).toHaveLength(2);
    expect(fired.every((f) => f.towerId === bow)).toBe(true);
    expect(new Set(fired.map((f) => f.projectileId)).size).toBe(2); // 2 distinct projectiles

    // Both hit in the same tick (speed 60) — two DISTINCT targets, both die.
    const hits = eventsOfType(t1, "projectileHit");
    expect(hits).toHaveLength(2);
    expect([...hits.map((h) => h.enemyId)].sort()).toEqual([...spawned].sort());
    expect(eventsOfType(t1, "enemyDied")).toHaveLength(2);
  });

  it("picks the N furthest-along targets and leaves the rest untouched", () => {
    const { sim } = setup({
      waves: [{ entries: [{ enemyTypeId: "runt", count: 3, spacingTicks: 2 }] }],
    });
    sim.startWave();
    const spawned: number[] = [];
    for (let t = 1; t <= 4; t++) {
      spawned.push(...eventsOfType(sim.tick(), "enemySpawned").map((e) => e.enemyId));
    }
    // Place mid-wave so the first shot lands on tick 5 with all three alive:
    // A x=1.75 (pathIndex 2), B x=1.25, C x=0.75 (both pathIndex 1, B closer
    // to its next waypoint) — the volley must pick A and B.
    placeMutated(sim, "twinbow", { col: 1, row: 1 }, "twin-volley");
    const t5 = sim.tick();
    spawned.push(...eventsOfType(t5, "enemySpawned").map((e) => e.enemyId));
    const [a, b, c] = spawned as [number, number, number];

    expect(eventsOfType(t5, "towerFired")).toHaveLength(2);
    expect(eventsOfType(t5, "enemyDied").map((d) => d.enemyId)).toEqual([a, b]);
    expect(sim.state.enemies.map((e) => e.id)).toEqual([c]);
    expect(sim.state.enemies[0]!.hp).toBe(10); // C completely unhurt
  });

  it("falls back to a single projectile when only one enemy is in range", () => {
    const { sim } = setup(); // 1 wave, 1 runt
    placeMutated(sim, "twinbow", { col: 1, row: 1 }, "twin-volley");
    sim.startWave();
    const t1 = sim.tick();
    expect(eventsOfType(t1, "towerFired")).toHaveLength(1);
    expect(eventsOfType(t1, "projectileHit")).toHaveLength(1);
    expect(eventsOfType(t1, "enemyDied")).toHaveLength(1);
  });
});

describe("burn", () => {
  const tankWave = {
    waves: [{ entries: [{ enemyTypeId: "tank", count: 1, spacingTicks: 1 }] }],
  };

  it("deals exactly dps × TICK_SECONDS per tick for durationTicks, then stops and zeroes state", () => {
    const { sim } = setup(tankWave);
    placeMutated(sim, "pyre", { col: 1, row: 1 }, "pyre-ember"); // 30 dps = 1/tick, 12 ticks
    sim.startWave();
    sim.tick(); // t1: spawn, fire, hit (1 damage), burn applied
    const tank = sim.state.enemies[0]!;
    expect(tank.hp).toBe(999);
    expect(tank).toMatchObject({ burnDps: 30, burnTicksLeft: 12 });

    for (let i = 1; i <= 12; i++) {
      sim.tick();
      expect(tank.hp).toBe(999 - i); // exact: 30 × (1/30) = 1 per tick
    }
    expect(tank).toMatchObject({ burnDps: 0, burnTicksLeft: 0 }); // expiry zeroes both
    sim.tick();
    sim.tick();
    expect(tank.hp).toBe(987); // expired — no further damage
  });

  it("re-application refreshes the duration without stacking", () => {
    const { sim } = setup(tankWave);
    placeMutated(sim, "pyre", { col: 1, row: 1 }, "pyre-ember");
    sim.startWave();
    for (let t = 1; t <= 4; t++) sim.tick(); // t1 hit (999), burn t2-t4 → 996
    const tank = sim.state.enemies[0]!;
    expect(tank.hp).toBe(996);

    // A second pyre's hit on tick 5 refreshes the burn to 12 fresh ticks.
    placeMutated(sim, "pyre", { col: 2, row: 1 }, "pyre-ember");
    sim.tick(); // t5: burn (995) + second hit (994), burn reset to 12
    expect(tank.hp).toBe(994);
    expect(tank.burnTicksLeft).toBe(12);

    for (let t = 6; t <= 17; t++) sim.tick(); // 12 more burn ticks
    // 2 hits + 16 total burn ticks (t2-t5 and t6-t17): stacking would deal more.
    expect(tank.hp).toBe(982);
    sim.tick();
    expect(tank.hp).toBe(982); // expired again
  });

  it("burn kills pay BASE bounty (no bountyMult) and trigger splits via the normal death path", () => {
    const { sim } = setup({
      waves: [{ entries: [{ enemyTypeId: "splitter", count: 1, spacingTicks: 1 }] }],
    });
    // pyre-ember carries bountyMult 2 ON PURPOSE: it must not apply to the
    // burn kill — only hit-time kills are credited to the tower.
    placeMutated(sim, "pyre", { col: 1, row: 1 }, "pyre-ember");
    sim.startWave();
    sim.tick(); // t1: hit → hp 9, ignited
    expect(sim.state.enemies[0]!.hp).toBe(9);
    const goldBefore = sim.state.gold;
    const scoreBefore = sim.state.score;

    for (let t = 2; t <= 9; t++) sim.tick(); // burn → hp 1
    expect(sim.state.enemies[0]!.hp).toBe(1);
    const t10 = sim.tick(); // 9th burn tick kills
    expect(eventsOfType(t10, "enemyDied")).toEqual([
      expect.objectContaining({ typeId: "splitter", bounty: 8 }), // base, NOT ×2
    ]);
    expect(sim.state.gold).toBe(goldBefore + 8);
    expect(sim.state.score).toBe(scoreBefore + 8);
    // splitsInto children spawn through the same death path.
    expect(eventsOfType(t10, "enemySpawned").map((e) => e.typeId)).toEqual(["runt", "runt"]);
    expect(sim.state.enemies.map((e) => e.typeId)).toEqual(["runt", "runt"]);
  });
});

describe("executeBelow", () => {
  it("kills a surviving non-boss below the threshold through the normal death path", () => {
    const { sim } = setup({
      waves: [{ entries: [{ enemyTypeId: "splitter", count: 1, spacingTicks: 1 }] }],
    });
    placeMutated(sim, "reaper", { col: 1, row: 1 }, "reaper-scythe"); // 6 dmg, execute < 0.5
    const goldBefore = sim.state.gold;
    sim.startWave();
    // t1: hit → hp 4 of 10 → 0.4 < 0.5 → executed the same tick, with full
    // death semantics: bounty paid and splitsInto children spawned.
    const t1 = sim.tick();
    expect(eventsOfType(t1, "projectileHit")).toEqual([
      expect.objectContaining({ damage: 6 }),
    ]);
    expect(eventsOfType(t1, "enemyDied")).toEqual([
      expect.objectContaining({ typeId: "splitter", bounty: 8 }),
    ]);
    expect(eventsOfType(t1, "enemySpawned").map((e) => e.typeId)).toEqual([
      "splitter",
      "runt",
      "runt",
    ]);
    expect(sim.state.gold).toBe(goldBefore + 8);
  });

  it("does not execute at exactly the threshold (strictly below only)", () => {
    const { sim } = setup(
      { waves: [{ entries: [{ enemyTypeId: "even", count: 1, spacingTicks: 1 }] }] },
      {
        extraEnemies: [
          { id: "even", name: "Even", assetId: "enemy-even", hp: 12, speed: 3.75, bounty: 5 },
        ],
      },
    );
    placeMutated(sim, "reaper", { col: 1, row: 1 }, "reaper-scythe");
    sim.startWave();
    const t1 = sim.tick(); // hit → hp 6 of 12 = exactly 0.5 → survives
    expect(eventsOfType(t1, "projectileHit")).toHaveLength(1);
    expect(eventsOfType(t1, "enemyDied")).toEqual([]);
    expect(sim.state.enemies[0]!.hp).toBe(6);
  });

  it("never executes a boss, no matter how low it gets", () => {
    const { sim } = setup(
      { waves: [{ entries: [{ enemyTypeId: "trollking", count: 1, spacingTicks: 1 }] }] },
      {
        extraEnemies: [
          {
            id: "trollking",
            name: "Troll King",
            assetId: "enemy-trollking",
            hp: 10,
            speed: 3.75,
            bounty: 50,
            boss: true,
          },
        ],
      },
    );
    placeMutated(sim, "reaper", { col: 1, row: 1 }, "reaper-scythe");
    sim.startWave();
    const t1 = sim.tick(); // hit → hp 4 of 10 → 0.4 < 0.5 BUT boss
    expect(eventsOfType(t1, "projectileHit")).toHaveLength(1);
    expect(eventsOfType(t1, "enemyDied")).toEqual([]);
    expect(sim.state.enemies[0]!.hp).toBe(4);
  });
});

describe("bountyMult", () => {
  it("projectile and splash kills pay round(bounty × mult) gold while score adds base bounty", () => {
    const { sim } = setup({
      waves: [{ entries: [{ enemyTypeId: "runt", count: 3, spacingTicks: 2 }] }],
    });
    sim.startWave();
    for (let t = 1; t <= 4; t++) sim.tick();
    // Same geometry as the splash suite: the tick-5 shot kills A (primary)
    // and B (splash), C stays out of the radius.
    placeMutated(sim, "boulder", { col: 1, row: 1 }, "boulder-tax"); // bountyMult 1.5
    const goldBefore = sim.state.gold;
    const scoreBefore = sim.state.score;

    const t5 = sim.tick();
    const died = eventsOfType(t5, "enemyDied");
    expect(died).toHaveLength(2);
    // The event reports the gold actually paid: round(5 × 1.5) = 8 each.
    expect(died.map((d) => d.bounty)).toEqual([8, 8]);
    expect(sim.state.gold).toBe(goldBefore + 16);
    expect(sim.state.score).toBe(scoreBefore + 10); // score: base 5 + 5
  });

  it("pulse kills from a mutated pulse tower pay multiplied gold, base score", () => {
    const { sim } = setup({
      waves: [{ entries: [{ enemyTypeId: "wisp", count: 3, spacingTicks: 2 }] }],
    });
    sim.startWave();
    for (let t = 1; t <= 8; t++) sim.tick();
    // Same geometry as the pulse suite: the tick-9 pulse kills B and C.
    placeMutated(sim, "storm", { col: 1, row: 1 }, "storm-tax"); // bountyMult 1.5
    const goldBefore = sim.state.gold;
    const scoreBefore = sim.state.score;

    const t9 = sim.tick();
    const died = eventsOfType(t9, "enemyDied");
    expect(died).toHaveLength(2);
    expect(died.map((d) => d.bounty)).toEqual([8, 8]); // round(5 × 1.5)
    expect(sim.state.gold).toBe(goldBefore + 16);
    expect(sim.state.score).toBe(scoreBefore + 10);
  });
});

describe("towerAura", () => {
  const tankWave = {
    waves: [{ entries: [{ enemyTypeId: "tank", count: 1, spacingTicks: 1 }] }],
  };

  /** Run `ticks` ticks and return each tower's projectileHit damages. */
  function hitDamagesByTower(
    sim: ReturnType<typeof setup>["sim"],
    ticks: number,
  ): Map<number, number[]> {
    const projToTower = new Map<number, number>();
    const result = new Map<number, number[]>();
    for (let t = 1; t <= ticks; t++) {
      const events = sim.tick();
      for (const f of eventsOfType(events, "towerFired")) {
        projToTower.set(f.projectileId, f.towerId);
      }
      for (const h of eventsOfType(events, "projectileHit")) {
        const towerId = projToTower.get(h.projectileId)!;
        result.set(towerId, [...(result.get(towerId) ?? []), h.damage]);
      }
    }
    return result;
  }

  it("buffs a tower within radius by exactly damageMult, and never buffs itself", () => {
    const { sim } = setup(tankWave);
    const rune = placeMutated(sim, "runeguard", { col: 2, row: 1 }, "rune-aura"); // ×1.5, radius 2
    const archer = sim.placeTower("archer", { col: 1, row: 1 }); // 1 tile away
    if (!archer.ok) throw new Error("placement failed");
    sim.startWave();

    const hits = hitDamagesByTower(sim, 12);
    expect(hits.get(archer.tower.id)!.every((d) => d === 18)).toBe(true); // 12 × 1.5
    expect(hits.get(rune)).toEqual([10]); // the aura tower's own damage is unbuffed
  });

  it("does not buff towers outside the radius", () => {
    const { sim } = setup(tankWave);
    placeMutated(sim, "runeguard", { col: 5, row: 1 }, "rune-aura"); // 4 tiles from the archer
    const archer = sim.placeTower("archer", { col: 1, row: 1 });
    if (!archer.ok) throw new Error("placement failed");
    sim.startWave();

    const hits = hitDamagesByTower(sim, 12);
    expect(hits.get(archer.tower.id)!.every((d) => d === 12)).toBe(true); // base damage
  });

  it("overlapping auras multiply", () => {
    const { sim } = setup({ ...tankWave, startGold: 200 });
    const rune1 = placeMutated(sim, "runeguard", { col: 0, row: 1 }, "rune-aura");
    const rune2 = placeMutated(sim, "runeguard", { col: 2, row: 1 }, "rune-aura");
    const archer = sim.placeTower("archer", { col: 1, row: 1 }); // inside both radii
    if (!archer.ok) throw new Error("placement failed");
    sim.startWave();

    const hits = hitDamagesByTower(sim, 12);
    expect(hits.get(archer.tower.id)!.every((d) => d === 27)).toBe(true); // 12 × 1.5 × 1.5
    // The aura towers sit exactly 2 tiles apart (radius inclusive): each is
    // buffed by the OTHER but never by itself → 10 × 1.5.
    expect(hits.get(rune1)).toEqual([15]);
    expect(hits.get(rune2)).toEqual([15]);
  });

  it("auraDamageMult query reports a tower's received buff (for the inspector UI)", () => {
    const { sim } = setup({ ...tankWave, startGold: 200 });
    const rune1 = placeMutated(sim, "runeguard", { col: 0, row: 1 }, "rune-aura");
    const rune2 = placeMutated(sim, "runeguard", { col: 2, row: 1 }, "rune-aura");
    const archer = sim.placeTower("archer", { col: 1, row: 1 }); // inside both radii
    if (!archer.ok) throw new Error("placement failed");
    const far = sim.placeTower("archer", { col: 6, row: 4 }); // outside any aura
    if (!far.ok) throw new Error("placement failed");

    expect(sim.auraDamageMult(archer.tower.id)).toBeCloseTo(2.25, 10); // 1.5 × 1.5
    expect(sim.auraDamageMult(rune1)).toBeCloseTo(1.5, 10); // buffed by rune2, never itself
    expect(sim.auraDamageMult(far.tower.id)).toBe(1); // no aura in range
    expect(sim.auraDamageMult(99999)).toBe(1); // unknown id
  });
});

describe("auraSlow", () => {
  it("slows while in range with ONE enemySlowed on entry, and recovers within 2 ticks of leaving", () => {
    const { sim } = setup(); // 1 runt
    placeMutated(sim, "coldwell", { col: 1, row: 1 }, "kall-aura"); // factor 0.8, range 1.5
    sim.startWave();

    const t1 = sim.tick(); // runt moves to x 0.75 — inside the aura
    expect(eventsOfType(t1, "enemySlowed")).toEqual([
      { type: "enemySlowed", enemyId: sim.state.enemies[0]!.id, durationTicks: 2 },
    ]);
    const runt = sim.state.enemies[0]!;
    expect(runt.slowFactor).toBe(0.8);

    // Slowed to 0.8 × 0.25 = 0.2 tiles/tick while in range (x ≤ 2.618…,
    // last in-range application on tick 10 at x 2.55), plus the 2 leftover
    // ticks after leaving: ticks 2-12 all move 0.2 — and NO further
    // enemySlowed events fire while the aura keeps re-applying.
    for (let t = 2; t <= 12; t++) {
      const before = runt.pos.x;
      expect(eventsOfType(sim.tick(), "enemySlowed")).toEqual([]);
      expect(runt.pos.x - before).toBeCloseTo(0.2, 12);
    }
    // Recovered: full speed again on tick 13.
    const before = runt.pos.x;
    sim.tick();
    expect(runt.pos.x - before).toBeCloseTo(0.25, 12);
    expect(runt.slowFactor).toBe(1);
  });

  it("never overwrites a stronger projectile slow; takes over once it expires", () => {
    const { sim } = setup({
      waves: [{ entries: [{ enemyTypeId: "tank", count: 1, spacingTicks: 1 }] }],
    });
    placeMutated(sim, "coldwell", { col: 1, row: 1 }, "kall-aura"); // weak 0.8 aura
    sim.placeTower("lantern", { col: 5, row: 1 }); // strong 0.5 × 12 projectile slow
    sim.startWave();

    // Tick until the lantern's slow lands (duration 12 distinguishes it from
    // the aura's duration-2 applications).
    let landed = false;
    for (let t = 1; t <= 10 && !landed; t++) {
      landed = eventsOfType(sim.tick(), "enemySlowed").some((e) => e.durationTicks === 12);
    }
    expect(landed).toBe(true);
    const tank = sim.state.enemies[0]!;
    expect(tank.slowFactor).toBe(0.5);
    expect(tank.slowTicksLeft).toBe(12);

    // The aura re-applies every tick but must NOT weaken the active 0.5 slow:
    // all 12 duration ticks move at 0.5 × 0.125 = 0.0625.
    for (let i = 0; i < 12; i++) {
      const before = tank.pos.x;
      sim.tick();
      expect(tank.pos.x - before).toBeCloseTo(0.0625, 12);
      if (i < 11) expect(tank.slowFactor).toBe(0.5);
    }
    // Projectile slow expired — the aura takes over the same tick (0.8).
    expect(tank.slowFactor).toBe(0.8);
    const before = tank.pos.x;
    sim.tick();
    expect(tank.pos.x - before).toBeCloseTo(0.1, 12); // 0.8 × 0.125
  });

  it("respects slowResist: immune enemies get no slow state and no event", () => {
    const { sim } = setup({
      waves: [{ entries: [{ enemyTypeId: "stoneskin", count: 1, spacingTicks: 1 }] }],
    });
    placeMutated(sim, "coldwell", { col: 1, row: 1 }, "kall-aura");
    sim.startWave();
    sim.tick();
    const enemy = sim.state.enemies[0]!;
    for (let t = 2; t <= 8; t++) {
      const before = enemy.pos.x;
      expect(eventsOfType(sim.tick(), "enemySlowed")).toEqual([]);
      expect(enemy.pos.x - before).toBe(0.25); // full speed throughout
    }
    expect(enemy).toMatchObject({ slowTicksLeft: 0, slowFactor: 1 });
  });

  it("partial slowResist weakens the aura factor", () => {
    const { sim } = setup({
      waves: [{ entries: [{ enemyTypeId: "halfskin", count: 1, spacingTicks: 1 }] }],
    });
    placeMutated(sim, "coldwell", { col: 1, row: 1 }, "kall-aura"); // 0.8 → 0.9 vs resist 0.5
    sim.startWave();
    const t1 = sim.tick();
    expect(eventsOfType(t1, "enemySlowed")).toHaveLength(1);
    const enemy = sim.state.enemies[0]!;
    expect(enemy.slowFactor).toBeCloseTo(0.9, 12); // 0.8 + (1 − 0.8) × 0.5
    const before = enemy.pos.x;
    sim.tick();
    expect(enemy.pos.x - before).toBeCloseTo(0.225, 12); // 0.9 × 0.25
  });
});

describe("incomeMult", () => {
  it("pays round(incomePerWave × mult) on wave clear, leaving score untouched", () => {
    const { sim } = setup(); // 1 wave, 1 runt
    const gilded = placeMutated(sim, "kvarn", { col: 1, row: 0 }, "kvarn-gild"); // ×1.5
    const plain = sim.placeTower("kvarn", { col: 2, row: 0 });
    const archer = sim.placeTower("archer", { col: 1, row: 1 });
    if (!plain.ok || !archer.ok) throw new Error("placement failed");
    sim.startWave();

    const all: SimEvent[] = [];
    for (let t = 0; t < 50 && sim.state.status !== "won"; t++) all.push(...sim.tick());
    expect(sim.state.status).toBe("won");
    expect(eventsOfType(all, "income")).toEqual([
      { type: "income", towerId: gilded, amount: 11 }, // round(7 × 1.5) = round(10.5)
      { type: "income", towerId: plain.tower.id, amount: 7 },
    ]);
    // score = bounty 5 + clear bonus 10 + 3 lives × 2 — income never scores.
    expect(sim.state.score).toBe(21);
  });
});

describe("determinism", () => {
  it("produces identical states and event streams for the same seed and commands", () => {
    const run = () => {
      const { sim } = setup(
        {
          startGold: 500,
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
      // Pulse tower covering the spawn tile: pulses every wave's opening
      // spawns, so the pulse mechanic runs inside the determinism script.
      const storm = sim.placeTower("storm", { col: 0, row: 1 });
      if (!archer.ok || !sniper.ok || !lantern.ok || !kvarn.ok || !storm.ok) {
        throw new Error("placement failed");
      }
      sim.startWave();
      // Mutated towers join mid-run so every mutation keyword exercises the
      // determinism script: multishot (twinbow), burn + bountyMult (pyre),
      // towerAura (runeguard, buffing archer and boulder), auraSlow
      // (coldwell) and incomeMult (kvarn).
      let twinbow = 0;
      let pyre = 0;
      for (let t = 1; t <= 200; t++) {
        if (t === 3) {
          const r = sim.placeTower("twinbow", { col: 2, row: 1 });
          if (r.ok) twinbow = r.tower.id;
        }
        if (t === 5) sim.mutateTower(twinbow, "twin-volley");
        if (t === 7) {
          const r = sim.placeTower("pyre", { col: 4, row: 1 });
          if (r.ok) pyre = r.tower.id;
        }
        if (t === 9) sim.mutateTower(pyre, "pyre-ember");
        if (t === 10) sim.upgradeTower(archer.tower.id);
        if (t === 12) sim.placeTower("runeguard", { col: 1, row: 3 });
        if (t === 14) {
          const rune = sim.state.towers.find((tw) => tw.typeId === "runeguard")!;
          sim.mutateTower(rune.id, "rune-aura");
        }
        if (t === 16) sim.placeTower("coldwell", { col: 3, row: 3 });
        if (t === 18) {
          const well = sim.state.towers.find((tw) => tw.typeId === "coldwell")!;
          sim.mutateTower(well.id, "kall-aura");
        }
        if (t === 20) sim.sellTower(sniper.tower.id);
        if (t === 22) sim.mutateTower(kvarn.tower.id, "kvarn-gild");
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
    expect(eventsOfType(a.events, "towerPulsed").length).toBeGreaterThan(0); // incl. pulses
    expect(eventsOfType(a.events, "towerMutated")).toHaveLength(5); // every mutation landed
    expect(a.state.status).toBe("won"); // and resolved
  });
});
