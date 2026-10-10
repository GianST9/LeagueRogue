import { useEffect, useMemo, useState } from 'preact/hooks';
import { CONFIG } from '../core/config';
import { STRINGS } from '../core/strings';
import type { Region, Side } from '../core/types';
import { BOSSES, championDef } from '../data/bosses';
import { REGIONS } from '../data/regions';
import { classMultiplier } from '../systems/damage';
import { finishBattle, type Phase, type RunState } from '../systems/run';
import { abilityLines, cooldownText } from './abilityText';
import { applyEvent, eventDelay, initialView, turnsUntilReady, type BattleView, type UnitView } from './battleView';
import { Bar, ChampIcon, ItemIcon, Tags, type Act } from './components';
import { useInspect } from './inspect';
import { computeStats } from '../systems/stats';

type BattlePhase = Extract<Phase, { kind: 'battle' }>;

const SPEEDS = [1, 2, 4] as const;
let savedSpeed: (typeof SPEEDS)[number] = 1;

export function BattleScreen({ run, phase, act }: { run: RunState; phase: BattlePhase; act: Act }) {
  const events = phase.result.events;
  const start = useMemo(() => {
    const player = phase.playerUids.map((uid) => run.team.find((c) => c.uid === uid)!);
    return initialView(player, phase.enemy);
  }, [phase]);

  const [index, setIndex] = useState(0);
  const [view, setView] = useState<BattleView>(start);
  const [speed, setSpeed] = useState(savedSpeed);
  const done = index >= events.length;

  useEffect(() => {
    if (done) return;
    const e = events[index];
    const timer = setTimeout(() => {
      setView((v) => applyEvent(v, e));
      setIndex((i) => i + 1);
    }, index === 0 ? 300 : eventDelay(events[index - 1]) / speed);
    return () => clearTimeout(timer);
  }, [index, speed, done]);

  const skip = () => {
    let v = view;
    for (let i = index; i < events.length; i++) v = applyEvent(v, events[i]);
    setView({ ...v, floats: [] });
    setIndex(events.length);
  };

  const changeSpeed = (s: (typeof SPEEDS)[number]) => {
    savedSpeed = s;
    setSpeed(s);
  };

  const bossName = phase.fight === 'boss'
    ? championDef(BOSSES.find((b) => b.id === run.bossOrder[run.mapIndex])!.aceId).name
    : null;
  const regions = phase.result.regions;
  const player = view.units.player[view.active.player];
  const enemy = view.units.enemy[view.active.enemy];

  return (
    <div class="screen battle-screen">
      <header class="battle-header">
        <h2>{bossName ? `${STRINGS.fight.boss}: ${bossName}` : STRINGS.fight[phase.fight]}</h2>
        <div class="battle-controls">
          <span class="muted small">{STRINGS.battleSpeed}</span>
          {SPEEDS.map((s) => (
            <button key={s} class={`chip${speed === s ? ' active' : ''}`} onClick={() => changeSpeed(s)}>{s}×</button>
          ))}
          <button class="chip" onClick={skip} disabled={done}>{STRINGS.skipBattle}</button>
        </div>
      </header>

      <div class="side-regions">
        <RegionChips tiers={regions.player} />
        <RegionChips tiers={regions.enemy} align="right" />
      </div>

      <div class="arena">
        <Fighter view={view} side="player" regionTiers={regions.player} />
        <div class="versus">
          <div>{view.turn > 0 ? `Turn ${view.turn}` : STRINGS.vs}</div>
          {view.overtime && <div class="overtime-badge" title="Both champions take escalating true damage every turn until one falls.">🔥 Overtime</div>}
          {player && enemy && <MatchupArrows player={player} enemy={enemy} />}
        </div>
        <Fighter view={view} side="enemy" regionTiers={regions.enemy} />
      </div>

      <ol class="battle-log" aria-live="polite">
        {view.log.map((line, i) => <li key={`${view.turn}-${i}-${line}`}>{line}</li>)}
      </ol>

      {done && (
        <div class={`result-banner ${view.winner === 'player' ? 'win' : 'loss'}`}>
          <h2>{view.winner === 'player' ? STRINGS.battleWonTitle : STRINGS.gameOverTitle}</h2>
          <button onClick={() => act((s) => finishBattle(s))}>{STRINGS.continue}</button>
        </div>
      )}
    </div>
  );
}

function RegionChips({ tiers, align }: { tiers: Partial<Record<Region, number>>; align?: 'right' }) {
  const active = Object.entries(tiers) as [Region, number][];
  return (
    <div class={`region-chips${align === 'right' ? ' right' : ''}`}>
      {active.length === 0 && <span class="muted small">No region bonus</span>}
      {active.map(([region, tier]) => {
        const r = REGIONS[region];
        return (
          <span key={region} class="region-chip" style={{ borderColor: r.color, color: r.color }} title={r.describe(r.values[tier - 1])}>
            {r.name} {'●'.repeat(tier)}
          </span>
        );
      })}
    </div>
  );
}

/** Class multipliers between the two active champions, in both directions. */
function MatchupArrows({ player, enemy }: { player: UnitView; enemy: UnitView }) {
  const p = championDef(player.defId);
  const e = championDef(enemy.defId);
  const out = classMultiplier(p, e);
  const inc = classMultiplier(e, p);
  const label = (m: number) => (Math.abs(m - 1) < 0.001 ? '×1' : `×${Math.round(m * 100) / 100}`);
  const cls = (m: number) => (m > 1.001 ? 'good' : m < 0.999 ? 'bad' : 'muted');
  return (
    <div class="matchup-arrows small" title="Class matchup damage multipliers">
      <div class={cls(out)}>You deal {label(out)}</div>
      <div class={cls(inc) === 'good' ? 'bad' : cls(inc) === 'bad' ? 'good' : 'muted'}>You take {label(inc)}</div>
    </div>
  );
}

function Fighter({ view, side, regionTiers }: { view: BattleView; side: Side; regionTiers: Partial<Record<Region, number>> }) {
  const inspect = useInspect();
  const units = view.units[side];
  const active: UnitView | undefined = units[view.active[side]];
  const cls = [
    'fighter', side,
    view.acting === side ? 'acting' : '',
    view.hit === side ? 'hit' : '',
    active?.fainted ? 'down' : '',
  ].join(' ');

  const open = (u: UnitView) => inspect({
    defId: u.defId, level: u.level, itemIds: u.itemIds, skinLine: u.skinLine, statBonus: u.statBonus, hp: u.hp,
    regionTier: regionTiers[championDef(u.defId).region],
  });

  return (
    <div class={`fighter-col ${side}`}>
      <div class={cls}>
        {active ? (
          <>
            <button class="fighter-portrait icon-button" onClick={() => open(active)} title="Details">
              <ChampIcon defId={active.defId} size={96} fainted={active.fainted} skinLine={active.skinLine} />
              {active.stunned && <span class="status-badge">💫</span>}
              {active.itemIds.length > 0 && (
                <span class="fighter-items">{active.itemIds.map((id, i) => <ItemIcon key={`${id}-${i}`} itemId={id} size={24} />)}</span>
              )}
              <div class="floats">
                {view.floats.filter((f) => f.side === side).map((f) => (
                  <span key={f.id} class={`float ${f.kind}`}>{f.text}</span>
                ))}
              </div>
            </button>
            <div class="fighter-name">{championDef(active.defId).name} <span class="muted small">Lv {active.level}</span></div>
            <Tags defId={active.defId} />
            <Bar kind="hp" value={active.hp} max={active.maxHp} shield={active.shield} />
            <div class="small muted hp-text">{Math.ceil(active.hp)} / {active.maxHp}{active.shield > 0 ? ` (+${active.shield})` : ''}</div>
            <AbilityChips unit={active} />
          </>
        ) : (
          <div class="fighter-portrait empty" />
        )}
      </div>
      <div class="bench">
        {units.map((u, i) => (
          <button key={u.uid} class={`bench-slot icon-button${i === view.active[side] ? ' current' : ''}`}
            title={championDef(u.defId).name} onClick={() => open(u)}>
            <ChampIcon defId={u.defId} size={32} fainted={u.fainted} />
          </button>
        ))}
      </div>
    </div>
  );
}

/** Q/W/E/R with the turns left before each can be used again. */
function AbilityChips({ unit }: { unit: UnitView }) {
  const def = championDef(unit.defId);
  const stats = computeStats(def, unit.level, unit.itemIds, unit.skinLine, unit.statBonus);
  const ultLocked = unit.level < CONFIG.leveling.ultimateRanks[0];
  return (
    <div class="ability-chips">
      {[...def.abilities, def.ultimate].map((a) => {
        const locked = a.key === 'R' && ultLocked;
        const wait = turnsUntilReady(unit, a.key);
        const state = locked ? 'locked' : wait > 0 ? 'cooling' : 'ready';
        const title = [
          `${a.key}: ${a.name}`,
          locked ? `Unlocks at level ${CONFIG.leveling.ultimateRanks[0]}` : wait > 0 ? `Ready in ${wait} turn${wait === 1 ? '' : 's'}` : 'Ready',
          cooldownText(a.cooldown),
          ...abilityLines(a, unit.level, stats),
        ].join('\n');
        return (
          <span key={a.key} class={`ability-chip ${state}${unit.lastCast === a.key ? ' last' : ''}`} title={title}>
            <span class="chip-key">{a.key}</span>
            {locked ? <span class="chip-cd">🔒</span> : wait > 0 ? <span class="chip-cd">{wait}</span> : null}
          </span>
        );
      })}
    </div>
  );
}
