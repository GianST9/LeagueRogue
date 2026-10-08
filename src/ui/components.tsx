import type { ComponentChildren } from 'preact';
import { useState } from 'preact/hooks';
import { championIconUrl, itemIconUrl } from '../core/assets';
import { CLASS_COUNTERS, CONFIG } from '../core/config';
import { STRINGS } from '../core/strings';
import type { AbilityDef, Region, RunChampion } from '../core/types';
import { championDef } from '../data/bosses';
import { ITEMS } from '../data/items';
import { REGION_TIERS, REGIONS } from '../data/regions';
import { maxHpOf, xpToNext } from '../systems/leveling';
import { equipFromBag, modeConfig, moveChampion, unequip, type RunState } from '../systems/run';
import { regionStatuses, regionTiers } from '../systems/synergies';
import { useInspect } from './inspect';

export type Act = (fn: (s: RunState) => void) => void;

export function ChampIcon({ defId, size = 56, fainted, skinLine }: {
  defId: string; size?: number; fainted?: boolean; skinLine?: string;
}) {
  const def = championDef(defId);
  return (
    <span class={`champ-icon${fainted ? ' fainted' : ''}${skinLine ? ' skin-line' : ''}`} style={{ width: `${size}px`, height: `${size}px` }}>
      <img src={championIconUrl(def.ddragonId)} alt={def.name} width={size} height={size} loading="lazy" />
    </span>
  );
}

export function ItemIcon({ itemId, size = 28 }: { itemId: string; size?: number }) {
  const item = ITEMS[itemId];
  return <img class="item-icon" src={itemIconUrl(item.ddragonId)} alt={item.name} title={`${item.name}: ${item.description}`} width={size} height={size} />;
}

export function Bar({ value, max, shield = 0, kind }: { value: number; max: number; shield?: number; kind: 'hp' | 'xp' }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  const shieldPct = max > 0 ? Math.min(100 - pct, (shield / max) * 100) : 0;
  const low = kind === 'hp' && pct <= 30;
  return (
    <div class={`bar bar-${kind}${low ? ' low' : ''}`}>
      <div class="bar-fill" style={{ width: `${pct}%` }} />
      {shieldPct > 0 && <div class="bar-shield" style={{ left: `${pct}%`, width: `${shieldPct}%` }} />}
    </div>
  );
}

export function Tags({ defId }: { defId: string }) {
  const def = championDef(defId);
  return (
    <div class="tags">
      {def.classes.map((c) => <span key={c} class="tag">{c}</span>)}
      <span class="tag region" style={{ borderColor: REGIONS[def.region].color, color: REGIONS[def.region].color }}>
        {REGIONS[def.region].name}
      </span>
    </div>
  );
}

function AbilityLine({ ability, locked }: { ability: AbilityDef; locked?: number }) {
  return (
    <li class={locked ? 'locked' : ''}>
      <span class="key">{ability.key}</span>
      <span>
        <strong>{ability.name}</strong> <span class="muted">({STRINGS.cooldown(ability.cooldown)})</span>
        <br />
        <span class="muted">{ability.description}{locked ? ` (${STRINGS.unlocksAt(locked)})` : ''}</span>
      </span>
    </li>
  );
}

/** One-line class matchup summary: who this champion hits harder / softer. */
export function MatchupLine({ defId }: { defId: string }) {
  const chart = CLASS_COUNTERS[championDef(defId).classes[0]];
  return (
    <div class="matchup-line small">
      <span class="good">▲ Strong vs {chart.strong.join(', ')}</span>
      <span class="bad">▼ Weak vs {chart.weak.join(', ')}</span>
    </div>
  );
}

/** A champion card for choice screens; shows the kit. */
export function ChampionCard({ champ, onClick, footer, note }: {
  champ: RunChampion; onClick?: () => void; footer?: ComponentChildren; note?: ComponentChildren;
}) {
  const def = championDef(champ.defId);
  const ultLevel = CONFIG.leveling.ultimateRanks[0];
  const inspect = useInspect();
  return (
    <div class="card-wrap">
    <button class="card champion-card" onClick={onClick} disabled={!onClick}>
      <div class="card-head">
        <ChampIcon defId={champ.defId} size={64} skinLine={champ.skinLine} />
        <div>
          <div class="card-title">{champ.skinLine ? `${champ.skinLine} ` : ''}{def.name}</div>
          <div class="muted small">{def.title}</div>
          <div class="small">Level {champ.level}</div>
        </div>
      </div>
      <Tags defId={champ.defId} />
      <MatchupLine defId={champ.defId} />
      {note && <div class="card-note small">{note}</div>}
      <ul class="abilities">
        {def.abilities.map((a) => <AbilityLine key={a.key} ability={a} />)}
        <AbilityLine ability={def.ultimate} locked={champ.level < ultLevel ? ultLevel : undefined} />
      </ul>
      {champ.skinLine && <div class="small skin-note">✨ Skin-line variant: +{CONFIG.skinLine.statBonus * 100}% stats</div>}
      {footer}
    </button>
    <button class="inspect-btn" title={STRINGS.details} aria-label={`${STRINGS.details}: ${def.name}`}
      onClick={() => inspect({ defId: champ.defId, level: champ.level, itemIds: champ.itemIds, skinLine: champ.skinLine })}>i</button>
    </div>
  );
}

/** Region progress for a lineup: active bonuses first, then partial ones. */
export function RegionSummary({ defIds }: { defIds: string[] }) {
  const statuses = regionStatuses(defIds);
  if (statuses.length === 0) return null;
  const max = REGION_TIERS[REGION_TIERS.length - 1];
  return (
    <div class="region-summary">
      <h4>{STRINGS.regionBonuses}</h4>
      <ul>
        {statuses.map((s) => {
          const r = REGIONS[s.region];
          const next = REGION_TIERS[s.tier];
          const title = s.tier > 0
            ? r.describe(r.values[s.tier - 1])
            : `${next - s.count} more for: ${r.describe(r.values[0])}`;
          return (
            <li key={s.region} class={s.tier > 0 ? 'active' : ''} title={title}>
              <span class="region-dot" style={{ background: r.color }} />
              <span class="region-label">{r.name}</span>
              <span class="pips">{Array.from({ length: max }, (_, i) => <i key={i} class={i < s.count ? 'on' : ''} />)}</span>
              {s.tier > 0 && <span class="region-effect">{r.describe(r.values[s.tier - 1])}</span>}
            </li>
          );
        })}
      </ul>
      <p class="muted small">{STRINGS.regionHint}</p>
    </div>
  );
}

/** Active region tiers for a team's healthy champions, keyed by region. */
export function teamRegionTiers(team: RunChampion[]): Partial<Record<Region, number>> {
  return regionTiers(team.filter((c) => !c.fainted).map((c) => c.defId));
}

export function ItemCard({ itemId, onClick, footer, disabled }: {
  itemId: string; onClick?: () => void; footer?: ComponentChildren; disabled?: boolean;
}) {
  const item = ITEMS[itemId];
  return (
    <button class={`card item-card tier-${item.tier}`} onClick={onClick} disabled={!onClick || disabled}>
      <div class="card-head">
        <ItemIcon itemId={itemId} size={48} />
        <div>
          <div class="card-title">{item.name}</div>
          <div class="muted small">{TIER_LABEL[item.tier]}</div>
        </div>
      </div>
      <p class="small">{item.description}</p>
      {footer}
    </button>
  );
}

const TIER_LABEL = { basic: 'Basic', epic: 'Epic', legendary: 'Legendary' } as const;

/** Compact team list with reordering and item management. */
export function TeamPanel({ run, act, editable }: { run: RunState; act: Act; editable: boolean }) {
  const [itemMenu, setItemMenu] = useState<{ uid: string; slot: number } | null>(null);
  const inspect = useInspect();
  const tiers = teamRegionTiers(run.team);
  const mc = modeConfig(run);
  return (
    <aside class="panel team-panel">
      <div class="team-head">
        <h3>{STRINGS.team} <span class="muted small">({run.team.length}/{CONFIG.team.maxSize})</span></h3>
        {mc.shop && <span class="gold" title={STRINGS.goldHint}>💰 {run.gold}</span>}
      </div>
      {editable && <p class="muted small">{STRINGS.orderHint}</p>}
      <ol class="team-list">
        {run.team.map((c, i) => {
          const def = championDef(c.defId);
          const max = maxHpOf(c);
          const menuOpen = itemMenu?.uid === c.uid;
          return (
            <li key={c.uid} class={c.fainted ? 'fainted-row' : ''}>
              <button class="icon-button" title={`${STRINGS.details}: ${def.name}`}
                onClick={() => inspect({ defId: c.defId, level: c.level, itemIds: c.itemIds, skinLine: c.skinLine, hp: c.hp,
                  regionTier: tiers[def.region] })}>
                <ChampIcon defId={c.defId} size={44} fainted={c.fainted} skinLine={c.skinLine} />
              </button>
              <div class="team-info">
                <div class="row-title">
                  <span>{def.name}</span>
                  <span class="muted small">Lv {c.level}</span>
                </div>
                <Bar kind="hp" value={c.hp} max={max} />
                <Bar kind="xp" value={c.xp} max={xpToNext(c.level, mc.xpCurve)} />
                <div class="item-slots">
                  {Array.from({ length: mc.itemSlots }, (_, slot) => {
                    const id = c.itemIds[slot];
                    // Only the first empty slot is offered, so items stay packed to the left.
                    if (!id && slot > c.itemIds.length) return <span key={slot} class="item-slot locked-slot" />;
                    return editable ? (
                      <button key={slot} class={`item-slot${menuOpen && itemMenu?.slot === slot ? ' open' : ''}`}
                        title={id ? ITEMS[id].name : STRINGS.noItem}
                        onClick={() => setItemMenu(menuOpen && itemMenu?.slot === slot ? null : { uid: c.uid, slot })}>
                        {id ? <ItemIcon itemId={id} size={24} /> : <span class="empty-slot">+</span>}
                      </button>
                    ) : (
                      <span key={slot} class="item-slot">{id ? <ItemIcon itemId={id} size={24} /> : <span class="empty-slot" />}</span>
                    );
                  })}
                </div>
              </div>
              {editable && (
                <div class="order-buttons">
                  <button aria-label="Move up" disabled={i === 0} onClick={() => act((s) => moveChampion(s, c.uid, -1))}>▲</button>
                  <button aria-label="Move down" disabled={i === run.team.length - 1} onClick={() => act((s) => moveChampion(s, c.uid, 1))}>▼</button>
                </div>
              )}
              {menuOpen && itemMenu && (
                <div class="item-menu">
                  {run.bag.length === 0 && !c.itemIds[itemMenu.slot] && <span class="muted small">{STRINGS.bagEmpty}</span>}
                  {[...new Set(run.bag)].map((id) => (
                    <button key={id} onClick={() => { act((s) => equipFromBag(s, id, c.uid, itemMenu.slot)); setItemMenu(null); }}>
                      <ItemIcon itemId={id} size={22} /> {ITEMS[id].name}
                    </button>
                  ))}
                  {c.itemIds[itemMenu.slot] && (
                    <button onClick={() => { act((s) => unequip(s, c.uid, itemMenu.slot)); setItemMenu(null); }}>{STRINGS.unequip}</button>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ol>
      <RegionSummary defIds={run.team.filter((c) => !c.fainted).map((c) => c.defId)} />
      {run.bag.length > 0 && (
        <div class="bag">
          <h4>{STRINGS.bag}</h4>
          <div class="bag-items">{run.bag.map((id, i) => <ItemIcon key={`${id}-${i}`} itemId={id} />)}</div>
        </div>
      )}
    </aside>
  );
}
