import { useState } from 'preact/hooks';
import { CONFIG } from '../core/config';
import { STRINGS } from '../core/strings';
import type { RunChampion } from '../core/types';
import { BOSSES, championDef } from '../data/bosses';
import { ITEMS } from '../data/items';
import {
  buyItem, chooseItem, chooseLevelUp, chooseRecruit, chooseStarter, continueRun, modeConfig, rerollCost, rerollShop,
  sellItem, sellPrice, type Phase, type RunState,
} from '../systems/run';
import { ultimateRank } from '../systems/stats';
import { tierFor } from '../systems/synergies';
import { REGIONS } from '../data/regions';
import { ChampIcon, ChampionCard, ItemCard, ItemIcon, TeamPanel, type Act } from './components';

type PhaseOf<K extends Phase['kind']> = Extract<Phase, { kind: K }>;

export function StarterScreen({ phase, act }: { phase: PhaseOf<'starter'>; act: Act }) {
  return (
    <div class="screen choice-screen">
      <h2>{STRINGS.chooseStarter}</h2>
      <div class="cards">
        {phase.options.map((c, i) => <ChampionCard key={c.uid} champ={c} onClick={() => act((s) => chooseStarter(s, i))} />)}
      </div>
    </div>
  );
}

export function RecruitScreen({ run, phase, act }: { run: RunState; phase: PhaseOf<'recruit'>; act: Act }) {
  const [picked, setPicked] = useState<number | null>(null);
  const full = run.team.length >= CONFIG.team.maxSize;

  if (picked !== null) {
    return (
      <div class="screen choice-screen">
        <h2>{STRINGS.recruitFull}</h2>
        <div class="cards compact">
          {run.team.map((c) => (
            <SmallChampButton key={c.uid} champ={c} onClick={() => act((s) => chooseRecruit(s, picked, c.uid))} />
          ))}
        </div>
        <button class="secondary" onClick={() => setPicked(null)}>{STRINGS.back}</button>
      </div>
    );
  }

  return (
    <div class="screen choice-screen with-team">
      <div>
        <h2>{STRINGS.recruitTitle}</h2>
        <div class="cards">
          {phase.options.map((c, i) => (
            <ChampionCard key={c.uid} champ={c} note={<RegionNote team={run.team} recruit={c} />}
              onClick={() => (full ? setPicked(i) : act((s) => chooseRecruit(s, i)))} />
          ))}
        </div>
        <button class="secondary" onClick={() => act((s) => chooseRecruit(s, null))}>{STRINGS.skip}</button>
      </div>
      <TeamPanel run={run} act={act} editable={false} />
    </div>
  );
}

export function ItemScreen({ run, phase, act }: { run: RunState; phase: PhaseOf<'item'>; act: Act }) {
  const [picked, setPicked] = useState<string | null>(null);

  if (picked) {
    return (
      <div class="screen choice-screen">
        <h2><ItemIcon itemId={picked} size={32} /> {ITEMS[picked].name}: {STRINGS.itemGiveTo}</h2>
        <div class="cards compact">
          {run.team.map((c) => (
            <SmallChampButton key={c.uid} champ={c} onClick={() => act((s) => chooseItem(s, picked, c.uid))} />
          ))}
        </div>
        <div class="button-row">
          <button class="secondary" onClick={() => act((s) => chooseItem(s, picked))}>{STRINGS.keepInBag}</button>
          <button class="secondary" onClick={() => setPicked(null)}>{STRINGS.back}</button>
        </div>
      </div>
    );
  }

  return (
    <div class="screen choice-screen with-team">
      <div>
        <h2>{STRINGS.itemTitle}</h2>
        <div class="cards">
          {phase.options.map((id) => <ItemCard key={id} itemId={id} onClick={() => setPicked(id)} />)}
        </div>
        <button class="secondary" onClick={() => act((s) => chooseItem(s, null))}>{STRINGS.skip}</button>
      </div>
      <TeamPanel run={run} act={act} editable={false} />
    </div>
  );
}

export function LevelUpScreen({ run, phase, act }: { run: RunState; phase: PhaseOf<'levelup'>; act: Act }) {
  const options = phase.options.map((uid) => run.team.find((c) => c.uid === uid)!);
  return (
    <div class="screen choice-screen">
      <h2>{STRINGS.levelUpTitle(modeConfig(run).levelUpNodeLevels)}</h2>
      <div class="cards compact">
        {options.map((c) => <SmallChampButton key={c.uid} champ={c} onClick={() => act((s) => chooseLevelUp(s, c.uid))} />)}
      </div>
      <button class="secondary" onClick={() => act((s) => chooseLevelUp(s, null))}>{STRINGS.skip}</button>
    </div>
  );
}

/** How this recruit changes its region's count, and whether that activates a bonus. */
function RegionNote({ team, recruit }: { team: RunChampion[]; recruit: RunChampion }) {
  const region = championDef(recruit.defId).region;
  const r = REGIONS[region];
  const same = new Set(team.filter((c) => championDef(c.defId).region === region).map((c) => c.defId));
  const before = same.size;
  const after = before + 1;
  const tierBefore = tierFor(before);
  const tierAfter = tierFor(after);
  return (
    <span style={{ color: r.color }}>
      {r.name} {before} → {after}
      {tierAfter > tierBefore ? `: ${r.describe(r.values[tierAfter - 1])}` : ''}
    </span>
  );
}

function SmallChampButton({ champ, onClick }: { champ: RunChampion; onClick: () => void }) {
  const def = championDef(champ.defId);
  return (
    <button class="card small-champ" onClick={onClick}>
      <ChampIcon defId={champ.defId} size={56} fainted={champ.fainted} skinLine={champ.skinLine} />
      <div>
        <div class="card-title">{def.name}</div>
        <div class="small muted">Level {champ.level}</div>
        {champ.itemIds.map((id, i) => <div key={`${id}-${i}`} class="small"><ItemIcon itemId={id} size={18} /> {ITEMS[id].name}</div>)}
      </div>
    </button>
  );
}

// ── shop (Armory mode) ───────────────────────────────────────────────

export function ShopScreen({ run, phase, act }: { run: RunState; phase: PhaseOf<'shop'>; act: Act }) {
  return (
    <div class="screen shop-screen with-team">
      <div>
        <header class="shop-header">
          <h2>🛒 {STRINGS.shopTitle}</h2>
          <span class="gold big">💰 {run.gold}</span>
        </header>
        <p class="muted small">{STRINGS.shopIntro}</p>
        <div class="cards shop-cards">
          {phase.offers.map((id, i) =>
            id ? (
              <ItemCard key={`${id}-${i}`} itemId={id} disabled={run.gold < ITEMS[id].cost}
                onClick={() => act((s) => buyItem(s, i))}
                footer={<div class={`price${run.gold < ITEMS[id].cost ? ' too-expensive' : ''}`}>{STRINGS.buy(ITEMS[id].cost)}</div>} />
            ) : (
              <div key={`sold-${i}`} class="card sold-card muted">{STRINGS.sold}</div>
            ),
          )}
        </div>
        <div class="button-row">
          <button class="secondary" disabled={run.gold < rerollCost()} onClick={() => act((s) => rerollShop(s))}>
            🎲 {STRINGS.reroll(rerollCost())}
          </button>
          <button onClick={() => act((s) => continueRun(s))}>{STRINGS.leaveShop}</button>
        </div>
        {run.bag.length > 0 && (
          <section class="sell-panel">
            <h3>{STRINGS.bag}</h3>
            <p class="muted small">{STRINGS.sellHint}</p>
            <div class="sell-list">
              {run.bag.map((id, i) => (
                <button key={`${id}-${i}`} class="secondary sell-button" onClick={() => act((s) => sellItem(s, i))}>
                  <ItemIcon itemId={id} size={22} /> {ITEMS[id].name} · {STRINGS.sell(sellPrice(id))}
                </button>
              ))}
            </div>
          </section>
        )}
      </div>
      <TeamPanel run={run} act={act} editable />
    </div>
  );
}

// ── info screens ─────────────────────────────────────────────────────

export function InfoScreen({ run, act, onNewRun }: { run: RunState; act: Act; onNewRun: () => void }) {
  const p = run.phase;
  const nameOf = (uid: string) => championDef(run.team.find((c) => c.uid === uid)!.defId).name;
  const gainLines = (gains: { uid: string; from: number; to: number }[]) => (
    <ul class="gains">
      {gains.map((g) => {
        const rankUp = ultimateRank(g.to) > ultimateRank(g.from);
        return (
          <li key={g.uid}>
            {STRINGS.levelGain(nameOf(g.uid), g.from, g.to)}
            {rankUp && <strong class="ult-note"> {ultimateRank(g.from) === 0 ? STRINGS.ultUnlocked : STRINGS.ultRankUp}</strong>}
          </li>
        );
      })}
    </ul>
  );

  let title = '';
  let body: preact.ComponentChildren = null;
  let ending = false;
  switch (p.kind) {
    case 'fountain':
      title = `⛲ ${STRINGS.fountainTitle}`;
      body = <p>{STRINGS.fountainText}</p>;
      break;
    case 'battleWon':
      title = STRINGS.battleWonTitle;
      body = <><p>{STRINGS.xpGained(p.xp)}{p.gold > 0 && <> · <span class="gold">{STRINGS.goldGained(p.gold)}</span></>}</p>{gainLines(p.gains)}</>;
      break;
    case 'mapComplete': {
      const boss = BOSSES.find((b) => b.id === p.bossId)!;
      title = STRINGS.mapCompleteTitle(championDef(boss.aceId).name);
      body = <><p>{STRINGS.xpGained(p.xp)}{p.gold > 0 && <> · <span class="gold">{STRINGS.goldGained(p.gold)}</span></>}</p>{gainLines(p.gains)}<p>{STRINGS.mapCompleteText}</p></>;
      break;
    }
    case 'gameOver':
      ending = true;
      title = STRINGS.gameOverTitle;
      body = <p>{STRINGS.gameOverText(run.mapIndex, run.battlesWon)}</p>;
      break;
    case 'victory':
      ending = true;
      title = `🏆 ${STRINGS.victoryTitle}`;
      body = <p>{STRINGS.victoryText}</p>;
      break;
  }

  return (
    <div class="screen info-screen with-team">
      <section class="panel info-panel">
        <h2>{title}</h2>
        {body}
        {ending
          ? <button onClick={onNewRun}>{STRINGS.mainMenu}</button>
          : <button onClick={() => act((s) => continueRun(s))}>{STRINGS.continue}</button>}
      </section>
      <TeamPanel run={run} act={act} editable={!ending} />
    </div>
  );
}
