export const enum PlayerStat {
    ATTACK,
    DEFENCE,
    STRENGTH,
    HITPOINTS,
    RANGED,
    PRAYER,
    MAGIC,
    COOKING,
    WOODCUTTING,
    FLETCHING,
    FISHING,
    FIREMAKING,
    CRAFTING,
    SMITHING,
    MINING,
    HERBLORE,
    AGILITY,
    THIEVING,
    SLAYER,
    FARMING,
    RUNECRAFT,
    CONSTRUCTION
}

export const PlayerStatMap: Map<string, number> = new Map([
    ['ATTACK', PlayerStat.ATTACK],
    ['DEFENCE', PlayerStat.DEFENCE],
    ['STRENGTH', PlayerStat.STRENGTH],
    ['HITPOINTS', PlayerStat.HITPOINTS],
    ['RANGED', PlayerStat.RANGED],
    ['PRAYER', PlayerStat.PRAYER],
    ['MAGIC', PlayerStat.MAGIC],
    ['COOKING', PlayerStat.COOKING],
    ['WOODCUTTING', PlayerStat.WOODCUTTING],
    ['FLETCHING', PlayerStat.FLETCHING],
    ['FISHING', PlayerStat.FISHING],
    ['FIREMAKING', PlayerStat.FIREMAKING],
    ['CRAFTING', PlayerStat.CRAFTING],
    ['SMITHING', PlayerStat.SMITHING],
    ['MINING', PlayerStat.MINING],
    ['HERBLORE', PlayerStat.HERBLORE],
    ['AGILITY', PlayerStat.AGILITY],
    ['THIEVING', PlayerStat.THIEVING],
    ['SLAYER', PlayerStat.SLAYER],
    ['FARMING', PlayerStat.FARMING],
    ['RUNECRAFT', PlayerStat.RUNECRAFT],
    ['CONSTRUCTION', PlayerStat.CONSTRUCTION],
]);

export const PlayerStatNameMap: Map<number, string> = new Map(
    Array.from(PlayerStatMap.entries()).map(([key, value]) => [value, key])
);

// Slayer and Farming were false upstream (not implemented in base 377). Both are live in this build, and
// the client's Stats.field1505 already counts them in the stat tab's total, so the server-side total
// level (hiscores, the total-level adventure log) now agrees with what the player sees.
// Construction added 2026-09-10 as stat 21 - the first of the client's four spare slots.
export const PlayerStatEnabled = [true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true];

export const PlayerStatFree = [true, true, true, true, true, true, true, true, true, false, true, true, true, true, true, false, false, false, false, false, true, false];

// Number of player stats. Everything that sizes a per-stat array, or walks the stats in a save file,
// reads this instead of a hardcoded 21. Must stay <= 25: the 377 client allocates exactly 25 stat
// slots (Stats.field1503) and indexes skillLevel/skillExperience by the id we send.
export const PLAYER_STAT_COUNT = PlayerStat.CONSTRUCTION + 1;
