// Conquest screens outside a run: the world map of regions and the rune shop.

import { useState } from 'preact/hooks';
import { CONFIG } from '../core/config';
import { STRINGS } from '../core/strings';
import type { StatKey } from '../core/types';
import { BOSSES, championDef } from '../data/bosses';
import { CHAMPION_IDS } from '../data/champions';
import { CONQUEST_REGIONS, RUNES, type ConquestRegion } from '../data/conquest';
import { REGIONS } from '../data/regions';
import {
  isUnlocked, maxRunePower, regionStatus, runeBonus, runePower, runeRank, runeUpgradeCost, unlockChampion, unlockCost,
  upgradeRune, type MetaState,
} from '../systems/meta';
import { bonusText, ChampIcon, Tags } from './components';
import { useInspect } from './inspect';

export type MetaAct = (fn: (m: MetaState) => void) => void;

const STAT_NAMES: Record<StatKey, string> = { hp: 'HP', ad: 'AD', ap: 'AP', armor: 'armor', mr: 'MR', speed: 'speed', crit: 'crit' };

function EssenceBadge({ meta }: { meta: MetaState }) {
  return <span class="essence big" title={STRINGS.essenceHint}>💎 {meta.essence}</span>;
}

/** Average rune power of the six strongest owned champions: a full team's worth. */
export function bestSixPower(meta: MetaState): number {
  const powers = meta.champions.map((id) => runePower(meta, id)).sort((a, b) => b - a).slice(0, CONFIG.team.maxSize);
  return powers.length ? Math.round((powers.reduce((s, p) => s + p, 0) / powers.length) * 10) / 10 : 0;
}

// ── world map ──────────────────────────────────────────────────────

export function WorldMapScreen({ meta, onStart, onShop, onBack }: {
  meta: MetaState; onStart: (regionId: string) => void; onShop: () => void; onBack: () => void;
}) {
  const tiers = [...new Set(CONQUEST_REGIONS.map((r) => r.tier))];
  const power = bestSixPower(meta);
  return (
    <div class="screen meta-screen">
      <header class="meta-header">
        <div>
          <h2>🗺️ {STRINGS.worldMapTitle}</h2>
          <p class="muted small">{STRINGS.worldMapIntro}</p>
        </div>
        <div class="meta-actions">
          <EssenceBadge meta={meta} />
          <button onClick={onShop}>✦ {STRINGS.runeShop}</button>
          <button class="secondary" onClick={onBack}>{STRINGS.back}</button>
        </div>
      </header>
      <p class="small" title={STRINGS.powerHint}>
        {STRINGS.collection(meta.champions.length, CHAMPION_IDS.length)} · {STRINGS.yourPower(power)} / {maxRunePower()}
      </p>
      {tiers.map((tier) => (
        <section key={tier} class="tier-row">
          <h3 class="muted">{STRINGS.tier(tier)}</h3>
          <div class="region-cards">
            {CONQUEST_REGIONS.filter((r) => r.tier === tier).map((r) => (
              <RegionCard key={r.id} region={r} meta={meta} power={power} onStart={() => onStart(r.id)} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function RegionCard({ region, meta, power, onStart }: {
  region: ConquestRegion; meta: MetaState; power: number; onStart: () => void;
}) {
  const boss = BOSSES.find((b) => b.id === region.id)!;
  const look = REGIONS[boss.region];
  const status = regionStatus(meta, region.id);
  const locked = status === 'locked';
  const ready = power >= region.recommendedPower;
  return (
    <div class={`card region-card-conquest status-${status}`} style={{ borderColor: locked ? undefined : look.color }}>
      <div class="card-head">
        <ChampIcon defId={boss.aceId} size={56} fainted={locked} />
        <div>
          <div class="card-title" style={{ color: locked ? undefined : look.color }}>{look.name}</div>
          <div class="small muted">{championDef(boss.aceId).name}</div>
          <div class={`small status-label ${status}`}>
            {status === 'conquered' ? `🏆 ${STRINGS.regionConquered}` : status === 'open' ? STRINGS.regionOpen : `🔒 ${STRINGS.regionLocked}`}
          </div>
        </div>
      </div>
      <p class="small">{region.blurb}</p>
      <div class="small muted">{STRINGS.enemyStrength(Math.round(region.enemyBonus * 100))}</div>
      {region.recommendedPower > 0 && (
        <div class={`small ${ready ? 'good' : 'bad'}`} title={STRINGS.powerHint}>{STRINGS.recommendedPower(region.recommendedPower)}</div>
      )}
      <div class="small muted">💎 ×{region.essenceMultiplier}</div>
      {locked
        ? <p class="small muted">{STRINGS.lockedHint}</p>
        : <button onClick={onStart}>{status === 'conquered' ? STRINGS.reconquer : STRINGS.conquer}</button>}
    </div>
  );
}

// ── rune shop ──────────────────────────────────────────────────────

export function RuneShopScreen({ meta, actMeta, onBack }: { meta: MetaState; actMeta: MetaAct; onBack: () => void }) {
  const [tab, setTab] = useState<'runes' | 'champions'>('runes');
  const [selected, setSelected] = useState(meta.champions[0]);
  return (
    <div class="screen meta-screen">
      <header class="meta-header">
        <h2>✦ {STRINGS.runeShop}</h2>
        <div class="meta-actions">
          <EssenceBadge meta={meta} />
          <button class="secondary" onClick={onBack}>{STRINGS.worldMap}</button>
        </div>
      </header>
      <div class="tabs" role="tablist">
        <button role="tab" aria-selected={tab === 'runes'} class={tab === 'runes' ? 'chip active' : 'chip'} onClick={() => setTab('runes')}>
          {STRINGS.runesTab}
        </button>
        <button role="tab" aria-selected={tab === 'champions'} class={tab === 'champions' ? 'chip active' : 'chip'} onClick={() => setTab('champions')}>
          {STRINGS.championsTab}
        </button>
      </div>
      {tab === 'runes'
        ? <RunesTab meta={meta} actMeta={actMeta} selected={selected} onSelect={setSelected} />
        : <ChampionsTab meta={meta} actMeta={actMeta} />}
    </div>
  );
}

function RunesTab({ meta, actMeta, selected, onSelect }: {
  meta: MetaState; actMeta: MetaAct; selected: string; onSelect: (id: string) => void;
}) {
  const inspect = useInspect();
  const def = championDef(selected);
  const max = CONFIG.conquest.maxRuneRank;
  return (
    <div class="rune-layout">
      <p class="muted small rune-intro">{STRINGS.runeShopIntro}</p>
      <ul class="rune-champ-list panel">
        {meta.champions.map((id) => (
          <li key={id}>
            <button class={`rune-champ${id === selected ? ' active' : ''}`} onClick={() => onSelect(id)}>
              <ChampIcon defId={id} size={36} />
              <span>{championDef(id).name}</span>
              <span class="muted small">{runePower(meta, id)}</span>
            </button>
          </li>
        ))}
      </ul>
      <section class="panel rune-page">
        <div class="card-head">
          <button class="icon-button" title={STRINGS.details}
            onClick={() => inspect({ defId: selected, level: CONFIG.run.startLevel, statBonus: runeBonus(meta, selected) })}>
            <ChampIcon defId={selected} size={64} />
          </button>
          <div>
            <div class="card-title">{def.name}</div>
            <Tags defId={selected} />
            <div class="small">{STRINGS.runePowerLabel(runePower(meta, selected), maxRunePower())}</div>
            <div class="small rune-note">{bonusText(runeBonus(meta, selected)) || '—'}</div>
          </div>
        </div>
        <ul class="rune-list">
          {RUNES.map((rune) => {
            const rank = runeRank(meta, selected, rune.id);
            const cost = runeUpgradeCost(meta, selected, rune.id);
            return (
              <li key={rune.id} class="rune-row">
                <span class="rune-icon" aria-hidden="true">{rune.icon}</span>
                <div class="rune-info">
                  <strong>{rune.name}</strong>
                  <div class="muted small">{STRINGS.runeEffect(rune.stats.map((s) => STAT_NAMES[s]).join(' & '), Math.round(rune.perRank * 100))}</div>
                  <div class="pips rune-pips" aria-label={STRINGS.runeRankLabel(rank, max)}>
                    {Array.from({ length: max }, (_, i) => <i key={i} class={i < rank ? 'on' : ''} />)}
                  </div>
                </div>
                {cost === null
                  ? <span class="muted small">{STRINGS.maxRank}</span>
                  : <button disabled={meta.essence < cost} onClick={() => actMeta((m) => upgradeRune(m, selected, rune.id))}>
                      {STRINGS.upgrade(cost)}
                    </button>}
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

function ChampionsTab({ meta, actMeta }: { meta: MetaState; actMeta: MetaAct }) {
  const inspect = useInspect();
  // Locked first, cheapest first, so the next purchase is easy to find.
  const ids = [...CHAMPION_IDS].sort((a, b) =>
    Number(isUnlocked(meta, a)) - Number(isUnlocked(meta, b)) || unlockCost(a) - unlockCost(b));
  return (
    <>
      <p class="muted small">{STRINGS.unlockIntro}</p>
      <div class="unlock-grid">
        {ids.map((id) => {
          const owned = isUnlocked(meta, id);
          const cost = unlockCost(id);
          const def = championDef(id);
          return (
            <div key={id} class={`card unlock-card${owned ? ' owned' : ''}`}>
              <button class="icon-button" title={STRINGS.details} onClick={() => inspect({ defId: id, level: CONFIG.run.startLevel })}>
                <ChampIcon defId={id} size={56} />
              </button>
              <div class="card-title">{def.name}</div>
              <Tags defId={id} />
              {owned
                ? <span class="muted small">✓ {STRINGS.owned}</span>
                : <button disabled={meta.essence < cost} onClick={() => actMeta((m) => unlockChampion(m, id))}>{STRINGS.unlock(cost)}</button>}
            </div>
          );
        })}
      </div>
    </>
  );
}
