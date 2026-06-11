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
          startGold: 200,
          waves: [
            { entries: [{ enemyTypeId: "runt", count: 2, spacingTicks: 6 }] },
            { entries: [{ enemyTypeId: "runt", count: 3, spacingTicks: 5, delayTicks: 2 }] },
          ],
        },
        { seed: 1234 },
      );
      const events: SimEvent[] = [];
      const archer = sim.placeTower("archer", { col: 1, row: 1 });
      const sniper = sim.placeTower("sniper", { col: 3, row: 1 });
      if (!archer.ok || !sniper.ok) throw new Error("placement failed");
      sim.startWave();
      for (let t = 1; t <= 200; t++) {
        if (t === 10) sim.upgradeTower(archer.tower.id);
        if (t === 20) sim.sellTower(sniper.tower.id);
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
