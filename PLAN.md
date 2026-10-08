# LeagueRogue — Implementation Plan (Draft 3)

A browser roguelike with the same game loop as [pokelike.xyz](https://pokelike.xyz), but with League of Legends champions instead of Pokémon and LoL items instead of Pokémon items.

> Draft 3 includes your answers to Q14–Q17 and the **playable demo** (M2–M4, see §5). The decision log is in §6. New questions for after you've played the demo are in §7. As before, write your answer on the `> **Answer:**` line, or leave it empty to accept the default.

---

## 1. What pokelike does (reference)

| System | How pokelike does it |
|---|---|
| **Run structure** | 8 maps, one gym leader each, then Elite Four + Champion. Losing your whole team = Game Over. |
| **Map** | Branching layers (`start → 3 → 4 → 3 → 4 → 3 → 2 → boss`). Picking a node locks you out of the others on that layer. |
| **Node types** | Battle, Catch (1 of 3), Item, Trainer (harder), Pokémon Center, Legendary, Move Tutor, Trade, Evolution item, Level Up, Mystery "?", Shiny, Boss. |
| **Team** | Up to 6, ordered by drag and drop. When the team is full, a new catch replaces someone. |
| **Battles** | Automatic, sequential 1v1 (front unit vs. front unit). The player's decisions come before the fight. |
| **Leveling** | Each win levels the whole team. Enemies scale to your team's average level and the map depth. |
| **Fainting** | A fainted unit is benched until the next Center or gym. In Nuzlocke it's gone for good. |
| **Items** | One held item per unit. Run-wide passive items. A bag of consumables. |
| **Type traits** | Having several units of the same type unlocks tiered team bonuses. |
| **Meta** | Pokédex, shinies, achievements, Hall of Fame, unlockable modes. |

---

## 2. Theme mapping (decided)

| Pokémon | LeagueRogue |
|---|---|
| Pokémon | **Champion** |
| Type effectiveness | **Class counters** (Fighter, Tank, Mage, Assassin, Marksman, Support), see §4.3 |
| Type traits | **Region synergies** (2/4/6), see §4.6 |
| Moves | Simplified kit: **1–2 abilities + ultimate** |
| Evolution | **None.** Champions level 1→18. The **ultimate unlocks at 6** and ranks up at **11 and 16**. |
| Shiny | **Skin-line variant** (~1%): cosmetic, plus a small stat buff (+5%) |
| TM / Move Tutor | **Tome node**: upgrade one ability (M6) |
| Held item | **Completed LoL item**, one per champion (components may come later) |
| Passive items | **Runes** (run-wide) |
| Consumables | Potions, Elixirs, Oracle Lens, Teleport |
| Pokémon Center | **Fountain** |
| Wild / Trainer battle | **Jungle camp** / **Rival summoner** |
| Catch node | **Recruit node**: pick 1 of 3 |
| Legendary node | **Epic node**: rare champion |
| Gym leaders | **Region bosses**: lore rulers and villains |
| Elite Four + Champion | **Rift Gauntlet** → final "Worlds Finals" 5-champion team |
| Nuzlocke | **Ironman** mode (later) |

---

## 3. Tech stack (decided)

**Vite + TypeScript + Preact**, with Vitest for tests.

Why not Godot or Python, even though they're your strongest tools:
- This is a card-and-menu game in the browser, like pokelike. DOM/CSS handles that better than a game engine.
- Godot's web exports are large and load slowly.
- Python doesn't run in the browser well.
- Data Dragon icons load straight from Riot's CDN.
- The game deploys as a free static site.

All game rules live in **plain TypeScript with no UI code** (`src/systems`). It reads close to Python, and the whole game can be simulated in tests.

```
src/
  core/      rng.ts, types.ts, config.ts (all tunable numbers), strings.ts (UI text, English)
  data/      champions.ts, classes.ts, regions.ts, items.ts, bosses.ts
  systems/   stats.ts, damage.ts, battle.ts, leveling.ts, synergies.ts, map.ts, run.ts
  ui/        Preact screens and components
tests/       Vitest specs (battle determinism, damage, map generation, …)
```

- **Seeded RNG** everywhere in the game logic, so runs are reproducible (needed later for Daily mode).
- **Save:** the current run and meta-progression are stored separately in `localStorage` (M7).
- **Art:** Data Dragon champion and item icons, loaded from `ddragon.leagueoflegends.com` with a pinned patch version.
- **Legal:** the Riot "Legal Jibber Jabber" disclaimer goes on the title screen and in the README. No ads and no payments. We'd only revisit monetization if Riot gave explicit permission, and nothing in the code depends on it.

---

## 4. Core systems

### 4.1 Run & map
- A **full run** is **8 maps**, each ending in a region boss, then the **Rift Gauntlet** (M5): 4 bosses and the final team, back to back, with no Fountain in between. The demo also has a **short run**: 3 maps with faster XP.
- The 8 bosses are drawn in a random order each run (pokelike does the same with gym leaders).
- Map layers `[3,4,3,4,3,2]` → boss. Edges only connect overlapping nodes in neighbouring layers, so paths never cross. Node weights shift from "recruit and camps" early to "rivals and items" late.
- **Fixed points** (from your playtest): the first layer is always **1 fight + 1 recruit + 1 random node** (never a Fountain; the very first fight of a run is a camp). The layer before the boss is **1 Fountain + 1 non-healing node**.

### 4.2 Champions
- **First 30 champions are hand-made**, close to their LoL kit but simplified: 1–2 abilities plus an ultimate. Later champions get kits auto-generated from their class and region tags.
- Stats follow LoL's model: a base value plus growth per level, from level 1 to 18. The numbers are tuned for this game, not copied from LoL.
- Each ability has a **cooldown in turns**. Every turn a champion casts its best ability that's off cooldown, and otherwise basic attacks.

**Launch roster (30 = 10 regions × 3).** Classes in the code use Riot's own tags (e.g. Darius is Fighter/Tank). The table below is shorthand:

| Region | Champions |
|---|---|
| Demacia | Garen (Fighter/Tank), Lux (Mage/Support), Lucian (Marksman) |
| Noxus | Darius (Fighter), Katarina (Assassin), Swain (Mage) |
| Ionia | Yasuo (Fighter), Ahri (Mage/Assassin), Shen (Tank) |
| Freljord | Ashe (Marksman), Braum (Support/Tank), Sejuani (Tank) |
| Piltover | Caitlyn (Marksman), Jayce (Fighter), Ezreal (Marksman/Mage) |
| Zaun | Jinx (Marksman), Ekko (Assassin), Singed (Tank) |
| Shadow Isles | Thresh (Support), Hecarim (Fighter), Karthus (Mage) |
| Shurima | Nasus (Fighter), Sivir (Marksman), Rammus (Tank) |
| Void | Kha'Zix (Assassin), Cho'Gath (Tank), Kai'Sa (Marksman) |
| Bilgewater | Miss Fortune (Marksman), Pyke (Assassin/Support), Nautilus (Tank) |

Targon, Ixtal and Bandle City arrive when the roster grows.

### 4.3 Battle
- **Sequential 1v1**, like pokelike. Your front champion fights their front champion, and the next one steps in on a KO. Each turn the faster champion acts first.
- Damage = `power × scalingStat × classMultiplier × (100 / (100 + armor or MR))` × crit × a **±15% damage roll** (like Pokémon's). Without the roll, a tiny stat edge won every fight.
- **Class counters** (attacker's primary class → defender's classes, multiplied together; all values are in `config.ts`). Tuned down from ×1.3 / ×0.75 to **×1.2 / ×0.85**, because the bigger values decided fights on their own:

| Attacker | Strong vs (×1.2) | Weak vs (×0.85) |
|---|---|---|
| Assassin | Mage, Marksman | Tank |
| Fighter | Tank, Assassin | Mage |
| Tank | Assassin, Marksman | Fighter |
| Mage | Fighter, Support | Assassin |
| Marksman | Tank, Fighter | Assassin |
| Support | Assassin, Mage | Tank |

### 4.4 Leveling (level cap 18)
- Levels come from XP: **100 XP per level**. Each won fight gives XP to the whole team: camp +40, rival +70, boss +120. Full runs use ×0.75 XP and short runs ×2.5, so both reach about level 18 at the final boss.
- Level Up node: +2 levels to one of three champions.
- New recruits join at the team's average level.
- Enemy level = `max(team average rounded down, curve floor) + node bonus`. Camps get −2, rivals −1, boss members ±0, and only the **final** boss's ace gets +1. The curve floor (1 → 16 over the run, minus 3 slack) only matters if you skip a lot of fights.
- The first boss's ace has no item; from the second boss on, each ace holds its signature item.
- Enemy team sizes grow with progress: camps 1–2, rivals 2–4, bosses 2 → 5 (ace last).

### 4.5 Items
- Held (one per champion): 15 completed items to start, growing to ~30. Item stats scale from **50% at level 1 to 100% at level 18**; flat stats dominated early fights otherwise. Defensive items were toned down after simulation (Warmog's won 96% of 1v1s).
- Items you don't equip go to the bag. You can swap items between champions on the map.
- Runes (M6). Consumables bag, max 10 (M6).

### 4.6 Region bonuses (2 / 3) ✅
- Field **2 or 3 different champions** of a region (among those who can still fight) to activate tier 1 or 2. The launch roster has exactly 3 per region, so 2/3 replaced the planned 2/4/6. The bonus applies to **that region's champions**.
- **Bosses use them too**: their teams are themed, so from the third boss on they usually have tier 2. This made bosses much harder, so the region values were cut by about a third after simulation.

| Region | Tier 1 (2) / Tier 2 (3) |
|---|---|
| Demacia | Enter each fight with a shield: 12% / 20% max HP |
| Noxus | +15% / +30% damage to targets below 50% HP |
| Ionia | 10% / 18% chance to dodge an enemy action |
| Freljord | Every action chills the target: −15% / −30% speed for 2 turns |
| Piltover | +20% / +35% speed, first action each fight +20% / +35% damage |
| Zaun | Every action poisons: 2% / 3.5% of target max HP per turn, 3 turns |
| Shadow Isles | Heal 15% / 30% max HP after a KO |
| Shurima | Once per fight, revive at 20% / 35% HP |
| Void | Hits deal +8% / +15% of their damage as true damage |
| Bilgewater | +10% / +20% crit chance, every ability can crit |

### 4.7 Fainting
Classic mode, as in pokelike: after a **won** fight, surviving champions heal to full. A KO'd champion is benched until the next Fountain or boss win. Losing a battle ends the run. Ironman mode comes later.

### 4.8 Meta (M7)
Codex, Hall of Legends, achievements, skin-line collection.

---

### 4.9 Armory run (third mode) ✅
Same game as the Full run (8 bosses, same map, battles, regions), with these changes:
- **Slower leveling at high levels:** XP to the next level = 40 × 1.15^(level − 1). 1→2 takes 40 XP, 10→11 about 140, 17→18 about 375. (Short/Full keep a flat 100 per level.) Level-up nodes give +1 level instead of +2.
- **No item nodes.** Fights pay gold instead: camp 18, rival 35, boss 90.
- **Shop after every region** (except the last): 6 offers, buy any number, reroll for 10 gold, sell bag items for half price. Gold carries over. Offers shift from basic/epic items toward legendaries as the run goes on.
- **3 item slots per champion.** Effects stack, except one-off effects (revive, grievous wounds, Sterak's shield, execute), which use the strongest copy. Penetration, crit reduction, slow and lifesteal are capped.
- **44 items** (was 15): 9 basic, 14 epic, 21 legendary. The 14 new legendaries add new effects: grievous wounds (Morellonomicon, Mortal Reminder, Executioner's), on-action slows (Rylai's, Frozen Heart), ability burn (Liandry's), low-HP shield (Sterak's), on-hit true damage (Kraken Slayer), crit reduction (Randuin's). Costs are LoL gold ÷ 25. Classic item nodes still only offer the original 15.
- **Enemies scale with you:** rivals and bosses carry up to 3 shop items, more and better ones later in the run.
- Bot benchmark: about 13% of Armory runs won (Full: 10%).

## 5. Milestones

| # | Milestone | Status |
|---|---|---|
| **M0** | Scaffold: Vite + TS + Preact + Vitest, seeded RNG, config, 30-champion data | ✅ done |
| **M1** | Headless battle sim + tests, first balance pass (`npm run balance`) | ✅ done |
| **M2** | Battle UI (HP bars, floating numbers, animations, log, speed 1×/2×/4×, skip) | ✅ done |
| **M3** | Map + nodes (Recruit, Camp, Rival, Fountain, Item, Level Up), team order, item equip/bag | ✅ done |
| **M4** | **Playable demo:** starter pick, short (3 bosses) or full (8 bosses) run, game over / victory. **First playtest.** | ✅ done |
| M5 | Rift Gauntlet finale after the 8th boss | |
| M6 | Region bonuses ✅. Still to do: runes, consumables, Tome, Epic, Trade, "?" events, Shop | partly done |
| — | **Playtest round 1:** map fixed points, Inspect window (stats, ability numbers, cooldowns, matchups), Guide (rules, class chart, regions), cooldown + matchup + region display in battle | ✅ done |
| M7 | Save/resume, meta-progression, skin-line variants | |
| M8 | Full roster (auto-generated kits), balance via mass simulation, mobile polish | |
| M9 | Ironman, Endless, Daily | |

---

## 6. Decision log (Draft 1 answers)

| Q | Decision |
|---|---|
| Q1 Scope | M0–M4 first, 30 champions |
| Q2 Roster | 30 hand-made, LoL-like simplified kits (1–2 abilities + ult). The rest auto-generated from tags later. |
| Q3 Evolution | No evolution. Levels 1–18, ultimate at 6/11/16. Items and runes are the upgrade path. Skin-line variants work as "shinies": slight stat buff plus cosmetic. |
| Q4 Battle | Sequential 1v1 |
| Q5 Types | Class counters + region synergies |
| Q6 Items | Completed items only, one per champion. Components maybe later. |
| Q7 Bosses | Lore rulers/villains per region. Final = Rift Gauntlet → "Worlds Finals" team. |
| Q8 Art | Data Dragon icons |
| Q9 Stack | Vite + TS + Preact (reasons in §3) |
| Q10 Legal | Free, public, disclaimer, no monetization unless Riot permits it |
| Q11 Platform | Responsive, desktop first |
| Q12 Modes | Classic only until M7 |
| Q13 Language | English, all UI strings in `src/core/strings.ts` |
| Q14 Pokelike likes/dislikes | No preference given |
| Q15 Starter | Pick 1 of 3 random common champions |
| Q16 Roster | As listed |
| Q17 Bosses | As listed. Demacia uses **Jarvan IV** (keeps Garen recruitable). Boss-only champions: Jarvan IV, Lissandra, Zed, Viktor, Azir, Viego, Gangplank (`src/data/bosses.ts`). |
| Demo | Built: node map + pokelike-style battles, 30-champion roster, no meta-progression |
| Playtest 1 | Map fixed points; region bonuses (tiers at 2/3, bosses included); inspect stats; show class matchups; explain cooldowns |

---

## 7. New open questions (after you play the demo)

**Q18. Difficulty.** With region bonuses in (for bosses too) and one Fountain before each boss, a simple bot that chases region bonuses but never reorders its team or matches items wins about **45% of short runs** and **8% of full runs** (`npm run balance`). Is the demo too hard, too easy, or about right?
*[Default: keep it, retune after a few of your runs]*
> **Answer:**

**Q19. Click count.** Every fight ends with a result banner, then a "Victory! +XP" screen. Merge them into one screen?
*[Default: merge them]*
> **Answer:**

**Q20. Next milestone.** Which next: the Rift Gauntlet finale (M5), region synergies + runes (M6, the biggest strategy layer), or save/resume (M7)?
*[Default: M6, since synergies give team-building its depth]*
> **Answer:**

---

*Sources: [pokelike.xyz](https://pokelike.xyz), [pokelike.org guide](https://pokelike.org/), [tcg-actu.fr guide](https://tcg-actu.fr/pokelike-jeu-pokemon-roguelike-guide/), and the in-game text found in pokelike's client bundle.*
