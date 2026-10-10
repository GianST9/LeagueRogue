// Info windows: champion inspection and the game guide.

import type { ComponentChildren } from 'preact';
import { createContext } from 'preact';
import { useContext, useEffect } from 'preact/hooks';
import { CLASS_COUNTERS, CONFIG } from '../core/config';
import { STRINGS } from '../core/strings';
import type { AbilityDef, ClassName, Region, StatBonus, StatKey, Stats } from '../core/types';
import { championDef } from '../data/bosses';
import { CHAMPION_IDS, CHAMPIONS } from '../data/champions';
import { ITEMS } from '../data/items';
import { REGION_TIERS, REGIONS } from '../data/regions';
import { xpToNext } from '../systems/leveling';
import { computeStats, ultimateRank } from '../systems/stats';
import { abilityLines, cooldownText } from './abilityText';
import { bonusText, ChampIcon, ItemIcon, Tags } from './components';

export interface InspectTarget {
  defId: string;
  level: number;
  itemIds?: string[];
  skinLine?: string;
  /** Rune bonus (player) or region difficulty bonus (enemy). */
  statBonus?: StatBonus;
  hp?: number;
  /** Active region tier for this champion's lineup, if known. */
  regionTier?: number;
}

export const InspectContext = createContext<(t: InspectTarget) => void>(() => {});
export const useInspect = () => useContext(InspectContext);

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ComponentChildren }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div class="modal-backdrop" onClick={onClose}>
      <div class="modal" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <button class="modal-close" aria-label="Close" onClick={onClose}>✕</button>
        {children}
      </div>
    </div>
  );
}

// ── champion inspection ─────────────────────────────────────────────

const STAT_ROWS: { key: StatKey; label: string; format: (v: number) => string; note?: (v: number) => string }[] = [
  { key: 'hp', label: 'Health', format: (v) => `${Math.round(v)}` },
  { key: 'ad', label: 'Attack damage', format: (v) => `${Math.round(v)}` },
  { key: 'ap', label: 'Ability power', format: (v) => `${Math.round(v)}` },
  { key: 'armor', label: 'Armor', format: (v) => `${Math.round(v)}`, note: (v) => `takes ${Math.round((v / (100 + v)) * 100)}% less physical damage` },
  { key: 'mr', label: 'Magic resist', format: (v) => `${Math.round(v)}`, note: (v) => `takes ${Math.round((v / (100 + v)) * 100)}% less magic damage` },
  { key: 'speed', label: 'Speed', format: (v) => `${Math.round(v)}`, note: () => 'the faster champion acts first each turn' },
  { key: 'crit', label: 'Crit chance', format: (v) => `${Math.round(v * 100)}%`, note: () => `crits deal ×${CONFIG.battle.critMultiplier}` },
];

export function InspectModal({ target, onClose }: { target: InspectTarget; onClose: () => void }) {
  const def = championDef(target.defId);
  const stats = computeStats(def, target.level, target.itemIds, target.skinLine, target.statBonus);
  const base = computeStats(def, target.level, [], target.skinLine, target.statBonus);
  const rank = ultimateRank(target.level);
  const items = (target.itemIds ?? []).map((id) => ITEMS[id]);
  const region = REGIONS[def.region];

  return (
    <Modal title={def.name} onClose={onClose}>
      <div class="inspect-head">
        <ChampIcon defId={target.defId} size={80} skinLine={target.skinLine} />
        <div>
          <h2>{target.skinLine ? `${target.skinLine} ` : ''}{def.name}</h2>
          <div class="muted">{def.title} · Level {target.level}</div>
          <Tags defId={target.defId} />
        </div>
      </div>

      <div class="inspect-grid">
        <section>
          <h3>Stats</h3>
          <table class="stat-table">
            <tbody>
              {STAT_ROWS.map((row) => {
                const bonus = stats[row.key] - base[row.key];
                return (
                  <tr key={row.key}>
                    <th>{row.label}</th>
                    <td>
                      {row.key === 'hp' && target.hp !== undefined ? `${Math.round(target.hp)} / ` : ''}
                      {row.format(stats[row.key])}
                      {Math.abs(bonus) > 0.001 && <span class="item-bonus"> (+{row.format(bonus)} items)</span>}
                    </td>
                    <td class="muted small">{row.note?.(stats[row.key])}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {target.statBonus && <p class="small rune-note">✦ {STRINGS.bonusStats}: {bonusText(target.statBonus)} (included above)</p>}
          {items.map((item, i) => (
            <p key={`${item.id}-${i}`} class="small"><ItemIcon itemId={item.id} size={22} /> <strong>{item.name}</strong>: {item.description}</p>
          ))}
          <h3>Matchups</h3>
          <Matchups classes={def.classes} />
          <h3>Region: <span style={{ color: region.color }}>{region.name}</span></h3>
          <RegionTiers region={def.region} activeTier={target.regionTier} />
        </section>

        <section>
          <h3>Abilities</h3>
          <p class="muted small">
            Each turn this champion uses its ultimate if ready, otherwise the first ready ability below, otherwise a basic attack.
          </p>
          <AbilityBlock ability={{ key: 'Q', name: 'Basic attack', description: '', cooldown: 0, damage: { base: 0, adRatio: 1, type: 'physical', canCrit: true } }}
            level={target.level} stats={stats} basic />
          {def.abilities.map((a) => <AbilityBlock key={a.key} ability={a} level={target.level} stats={stats} />)}
          <AbilityBlock ability={def.ultimate} level={target.level} stats={stats} ultRank={rank} />
        </section>
      </div>
    </Modal>
  );
}

function AbilityBlock({ ability, level, stats, ultRank, basic }: {
  ability: AbilityDef; level: number; stats: Stats; ultRank?: number; basic?: boolean;
}) {
  const locked = ability.key === 'R' && ultRank === 0;
  const [unlock, ...ranks] = CONFIG.leveling.ultimateRanks;
  return (
    <div class={`ability-block${locked ? ' locked' : ''}`}>
      <div class="ability-title">
        <span class="key">{basic ? 'AA' : ability.key}</span>
        <strong>{ability.name}</strong>
        <span class="muted small">{basic ? 'when nothing else is ready' : cooldownText(ability.cooldown)}</span>
      </div>
      {ability.description && <div class="muted small">{ability.description}</div>}
      <ul>{abilityLines(ability, level, stats).map((l) => <li key={l}>{l}</li>)}</ul>
      {ability.key === 'R' && (
        <div class="small ult-ranks">
          {locked
            ? `🔒 Unlocks at level ${unlock}.`
            : `Rank ${ultRank} of ${CONFIG.leveling.ultimateRanks.length}. Ranks up at levels ${ranks.join(' and ')}.`}
        </div>
      )}
    </div>
  );
}

/** Who this champion deals extra/reduced damage to, and the net multiplier each attacker class has against it. */
export function Matchups({ classes }: { classes: ClassName[] }) {
  const attack = CLASS_COUNTERS[classes[0]];
  const { strongMultiplier: up, weakMultiplier: down } = CONFIG.battle;
  // Net multiplier per attacking class (a dual-class defender can be hit by both modifiers).
  const incoming = new Map<string, ClassName[]>();
  for (const c of CLASSES) {
    let m = 1;
    for (const d of classes) {
      if (CLASS_COUNTERS[c].strong.includes(d)) m *= up;
      if (CLASS_COUNTERS[c].weak.includes(d)) m *= down;
    }
    if (Math.abs(m - 1) < 0.001) continue;
    const key = (Math.round(m * 100) / 100).toString();
    incoming.set(key, [...(incoming.get(key) ?? []), c]);
  }
  const sorted = [...incoming.entries()].sort((a, b) => Number(b[0]) - Number(a[0]));
  return (
    <ul class="matchups small">
      <li><span class="good">Deals ×{up}</span> to {attack.strong.join(', ')}</li>
      <li><span class="bad">Deals ×{down}</span> to {attack.weak.join(', ')}</li>
      {sorted.map(([m, from]) => (
        <li key={m}><span class={Number(m) > 1 ? 'bad' : 'good'}>Takes ×{m}</span> from {from.join(', ')}</li>
      ))}
    </ul>
  );
}

export function RegionTiers({ region, activeTier }: { region: Region; activeTier?: number }) {
  const r = REGIONS[region];
  return (
    <ul class="region-tiers small">
      {REGION_TIERS.map((count, i) => (
        <li key={count} class={activeTier === i + 1 ? 'active' : ''}>
          <strong>{count} champions:</strong> {r.describe(r.values[i])}
        </li>
      ))}
    </ul>
  );
}

// ── guide ────────────────────────────────────────────────────────────

const CLASSES: ClassName[] = ['Fighter', 'Tank', 'Mage', 'Assassin', 'Marksman', 'Support'];

export function GuideModal({ onClose }: { onClose: () => void }) {
  const { strongMultiplier: up, weakMultiplier: down } = CONFIG.battle;
  return (
    <Modal title="Guide" onClose={onClose}>
      <h2>Guide</h2>

      <section class="guide-section">
        <h3>How battles work</h3>
        <ul class="guide-list">
          <li>Your champions fight one at a time, in team order. The front one fights the enemy's front one until someone is knocked out, then the next steps in.</li>
          <li>Each turn, the faster champion acts first.</li>
          <li>On its action, a champion uses its <strong>ultimate (R)</strong> if it's unlocked and ready, otherwise its first ready ability (<strong>Q</strong>, then <strong>W/E</strong>), otherwise a <strong>basic attack</strong>.</li>
          <li><strong>Cooldowns:</strong> after using an ability, a champion waits that many of its own turns before it can use it again. Cooldown 0 = every turn. Cooldowns keep ticking while stunned, and every fight starts with everything ready.</li>
          <li>Some abilities (mostly shields and heals) only fire below an HP threshold.</li>
          <li>The ultimate unlocks at level {CONFIG.leveling.ultimateRanks[0]} and gets stronger at levels {CONFIG.leveling.ultimateRanks.slice(1).join(' and ')}.</li>
          <li><strong>Overtime:</strong> if the same two champions fight for {CONFIG.battle.overtime.startTurn} turns, both start burning for true damage at the end of each turn ({Math.round(CONFIG.battle.overtime.basePct * 100)}% of max HP, +{Math.round(CONFIG.battle.overtime.growthPct * 100)}% every turn) until one falls. The champion with less HP left burns first. It resets when the next champion steps in.</li>
          <li>Damage rolls ±{Math.round(CONFIG.battle.damageVariance * 100)}%. Armor and magic resist reduce damage by resist / (100 + resist).</li>
          <li>Win: everyone still standing heals to full and the whole team gets XP. Knocked-out champions sit out until a Fountain or a boss win. Lose a battle and the run ends.</li>
        </ul>
      </section>

      <section class="guide-section">
        <h3>🛒 Armory run</h3>
        <ul class="guide-list">
          <li>No item nodes. Fights pay gold (camp {CONFIG.armory.goldReward.camp}, rival {CONFIG.armory.goldReward.rival}, boss {CONFIG.armory.goldReward.boss}).</li>
          <li>After every region boss, a shop offers {CONFIG.armory.shopOffers} items. Buy as many as you can afford, reroll for {CONFIG.armory.rerollCost} gold, or sell spares for half price. Gold carries over.</li>
          <li>Each champion holds up to {CONFIG.run.modes.armory.itemSlots} items. Item effects stack, except one-off effects (revive, grievous wounds), which use the strongest copy.</li>
          <li>Leveling slows down as you climb: level 1→2 takes {xpToNext(1, 'steep')} XP, level 17→18 takes {xpToNext(17, 'steep')}. Level-up nodes give +{CONFIG.run.modes.armory.levelUpNodeLevels} level.</li>
          <li>Shops sell more legendaries the further you get, and enemies carry more items too.</li>
        </ul>
      </section>

      <section class="guide-section">
        <h3>🗺️ Conquest</h3>
        <ul class="guide-list">
          <li>Pick a region on the world map. A Conquest run is {CONFIG.run.modes.conquest.maps} maps with short-run rules; the region's ruler guards the last one.</li>
          <li>Start with any champion you own. Recruits only come from champions you've unlocked.</li>
          <li>Fights pay Blue Essence (camp {CONFIG.conquest.essenceReward.camp}, rival {CONFIG.conquest.essenceReward.rival}, boss {CONFIG.conquest.essenceReward.boss}, more in harder regions). You keep it even if you lose. Conquering a region pays a bonus, and a bigger one the first time.</li>
          <li>Spend essence in the rune shop: unlock champions, or rank up their runes (up to rank {CONFIG.conquest.maxRuneRank}). Runes raise a champion's stats from the start of every Conquest run.</li>
          <li>Each conquest opens harder regions, where every enemy gets bonus HP, damage and resists. The recommended rune power tells you roughly how many rune ranks per champion even the odds.</li>
        </ul>
      </section>

      <section class="guide-section">
        <h3>Class matchups</h3>
        <p class="muted small">
          Rows attack, columns defend. The attacker's <em>first</em> class counts; a defender with two classes can be hit by both modifiers.
        </p>
        <div class="table-scroll">
          <table class="class-chart">
            <thead>
              <tr><th>Attacker ↓ / Defender →</th>{CLASSES.map((c) => <th key={c}>{c}</th>)}</tr>
            </thead>
            <tbody>
              {CLASSES.map((att) => (
                <tr key={att}>
                  <th>{att}</th>
                  {CLASSES.map((d) => {
                    const strong = CLASS_COUNTERS[att].strong.includes(d);
                    const weak = CLASS_COUNTERS[att].weak.includes(d);
                    return <td key={d} class={strong ? 'good' : weak ? 'bad' : ''}>{strong ? `×${up}` : weak ? `×${down}` : '—'}</td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section class="guide-section">
        <h3>Region bonuses</h3>
        <p class="muted small">
          Field {REGION_TIERS.join(' or ')} different champions from the same region (among those who can still fight) to activate a bonus.
          It applies to that region's champions. Bosses get them too.
        </p>
        <div class="region-guide">
          {(Object.keys(REGIONS) as Region[]).map((region) => (
            <div key={region} class="region-card">
              <div class="region-name" style={{ color: REGIONS[region].color }}>{REGIONS[region].name}</div>
              <div class="region-champs">
                {CHAMPION_IDS.filter((id) => CHAMPIONS[id].region === region).map((id) => (
                  <span key={id} title={CHAMPIONS[id].name}><ChampIcon defId={id} size={28} /></span>
                ))}
              </div>
              <RegionTiers region={region} />
            </div>
          ))}
        </div>
      </section>
    </Modal>
  );
}
