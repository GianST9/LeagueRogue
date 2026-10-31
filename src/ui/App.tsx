import { useEffect, useState } from 'preact/hooks';
import { randomSeed } from '../core/rng';
import { loadMeta, saveMeta } from '../core/save';
import { STRINGS } from '../core/strings';
import { BOSSES, championDef } from '../data/bosses';
import { conquestSetup, isModeUnlocked, recordModeClear, settleRun, type MetaState } from '../systems/meta';
import { abandonRun, newRun, type RunMode, type RunState } from '../systems/run';
import { BattleScreen } from './BattleScreen';
import { InfoScreen, ItemScreen, LevelUpScreen, RecruitScreen, ShopScreen, StarterScreen } from './ChoiceScreens';
import { ChampIcon, type Act } from './components';
import { GuideModal, InspectContext, InspectModal, type InspectTarget } from './inspect';
import { MapScreen } from './MapScreen';
import { RuneShopScreen, WorldMapScreen, type MetaAct } from './MetaScreens';

type MenuScreen = 'title' | 'worldMap' | 'runeShop';

export function App() {
  const [run, setRun] = useState<RunState | null>(null);
  const [meta, setMeta] = useState<MetaState>(loadMeta);
  const [screen, setScreen] = useState<MenuScreen>('title');
  const [inspecting, setInspecting] = useState<InspectTarget | null>(null);
  const [guideOpen, setGuideOpen] = useState(false);

  const actMeta: MetaAct = (fn) => {
    const next = structuredClone(meta);
    fn(next);
    saveMeta(next);
    setMeta(next);
  };

  // Bank a finished Conquest run's essence as soon as it ends, so closing the tab can't lose it.
  useEffect(() => {
    if (!run?.conquest || run.conquest.settled) return;
    if (run.phase.kind !== 'victory' && run.phase.kind !== 'gameOver') return;
    const nextRun = structuredClone(run);
    actMeta((m) => settleRun(m, nextRun));
    setRun(nextRun);
  }, [run]);

  // Winning a classic run opens the next mode on the title screen.
  useEffect(() => {
    if (!run || run.conquest || run.phase.kind !== 'victory' || meta.modesCleared.includes(run.mode)) return;
    actMeta((m) => recordModeClear(m, run.mode));
  }, [run]);

  const leaveRun = () => {
    setScreen(run?.conquest ? 'worldMap' : 'title');
    setRun(null);
  };

  const onLogo = () => {
    if (!run) return setScreen('title');
    const ended = run.phase.kind === 'victory' || run.phase.kind === 'gameOver';
    if (ended) return leaveRun();
    if (!confirm(run.conquest ? STRINGS.abandonConfirm : 'Abandon this run?')) return;
    if (!run.conquest) return leaveRun();
    // Conquest: count it as a defeat; the effect above banks the essence and the end screen leads back to the world map.
    const next = structuredClone(run);
    abandonRun(next);
    setRun(next);
  };

  // Run actions mutate a clone, so every step is a fresh state object for Preact.
  const act: Act = (fn) =>
    setRun((prev) => {
      if (!prev) return prev;
      const next = structuredClone(prev);
      fn(next);
      return next;
    });

  return (
    <InspectContext.Provider value={setInspecting}>
      <main class="shell">
        <header class="top-bar">
          <button class="logo" onClick={onLogo} disabled={!run && screen === 'title'}>
            {STRINGS.title}
          </button>
          <div class="top-actions">
            {run && <span class="muted small">Seed {run.seed}</span>}
            <button class="chip" onClick={() => setGuideOpen(true)}>📖 {STRINGS.guide}</button>
          </div>
        </header>
        {run ? <RunView run={run} act={act} onNewRun={leaveRun} />
          : screen === 'worldMap' ? (
            <WorldMapScreen meta={meta} onShop={() => setScreen('runeShop')} onBack={() => setScreen('title')}
              onStart={(regionId) => setRun(newRun('conquest', randomSeed(), conquestSetup(meta, regionId)))} />
          ) : screen === 'runeShop' ? (
            <RuneShopScreen meta={meta} actMeta={actMeta} onBack={() => setScreen('worldMap')} />
          ) : (
            <Title meta={meta} onStart={(mode) => setRun(newRun(mode, randomSeed()))} onConquest={() => setScreen('worldMap')} />
          )}
        <footer class="legal">{STRINGS.legalDisclaimer}</footer>
      </main>
      {inspecting && <InspectModal target={inspecting} onClose={() => setInspecting(null)} />}
      {guideOpen && <GuideModal onClose={() => setGuideOpen(false)} />}
    </InspectContext.Provider>
  );
}

function RunView({ run, act, onNewRun }: { run: RunState; act: Act; onNewRun: () => void }) {
  const p = run.phase;
  switch (p.kind) {
    case 'starter': return <StarterScreen run={run} phase={p} act={act} />;
    case 'map': return <MapScreen run={run} act={act} />;
    // Keyed by seed so a new battle always starts a fresh replay.
    case 'battle': return <BattleScreen key={p.seed} run={run} phase={p} act={act} />;
    case 'recruit': return <RecruitScreen run={run} phase={p} act={act} />;
    case 'item': return <ItemScreen run={run} phase={p} act={act} />;
    case 'levelup': return <LevelUpScreen run={run} phase={p} act={act} />;
    case 'shop': return <ShopScreen run={run} phase={p} act={act} />;
    default: return <InfoScreen run={run} act={act} onNewRun={onNewRun} />;
  }
}

interface ModeBox {
  mode: RunMode;
  name: string;
  desc: string;
  lockHint: string;
}

const MODE_TIERS: ModeBox[][] = [
  [
    { mode: 'short', name: STRINGS.shortRun, desc: STRINGS.shortRunDesc, lockHint: '' },
    { mode: 'full', name: STRINGS.fullRun, desc: STRINGS.fullRunDesc, lockHint: '' },
  ],
  [{ mode: 'armory', name: `🛒 ${STRINGS.armoryRun}`, desc: STRINGS.armoryRunDesc, lockHint: STRINGS.armoryLocked }],
  [{ mode: 'conquest', name: `🗺️ ${STRINGS.conquestRun}`, desc: STRINGS.conquestRunDesc, lockHint: STRINGS.conquestLocked }],
];

function Title({ meta, onStart, onConquest }: {
  meta: MetaState; onStart: (mode: Exclude<RunMode, 'conquest'>) => void; onConquest: () => void;
}) {
  return (
    <section class="title-screen">
      <h1>{STRINGS.title}</h1>
      <p class="tagline">{STRINGS.tagline}</p>
      <div class="boss-strip">
        {BOSSES.map((b) => <span key={b.id} title={championDef(b.aceId).name}><ChampIcon defId={b.aceId} size={44} /></span>)}
      </div>
      <div class="mode-ladder">
        {MODE_TIERS.map((tier, i) => (
          <div key={i} class="mode-tier">
            {tier.map(({ mode, name, desc, lockHint }) => {
              const locked = !isModeUnlocked(meta, mode);
              const cleared = meta.modesCleared.includes(mode);
              return (
                <button key={mode} class={`mode ${mode}${locked ? ' locked' : ''}`} disabled={locked}
                  onClick={() => (mode === 'conquest' ? onConquest() : onStart(mode))}>
                  <strong>{locked ? '🔒 ' : ''}{name}{cleared ? ' ✓' : ''}</strong>
                  <span>{desc}</span>
                  {locked && <em class="mode-lock-hint">{lockHint}</em>}
                </button>
              );
            })}
          </div>
        ))}
      </div>
      <ul class="how-to">
        {STRINGS.howToPlay.map((line) => <li key={line}>{line}</li>)}
      </ul>
    </section>
  );
}
