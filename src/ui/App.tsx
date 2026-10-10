import { useEffect, useState } from 'preact/hooks';
import { randomSeed } from '../core/rng';
import { loadMeta, saveMeta } from '../core/save';
import { STRINGS } from '../core/strings';
import { BOSSES, championDef } from '../data/bosses';
import { conquestSetup, settleRun, type MetaState } from '../systems/meta';
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
            <Title onStart={(mode) => setRun(newRun(mode, randomSeed()))} onConquest={() => setScreen('worldMap')} />
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

function Title({ onStart, onConquest }: { onStart: (mode: Exclude<RunMode, 'conquest'>) => void; onConquest: () => void }) {
  return (
    <section class="title-screen">
      <h1>{STRINGS.title}</h1>
      <p class="tagline">{STRINGS.tagline}</p>
      <div class="boss-strip">
        {BOSSES.map((b) => <span key={b.id} title={championDef(b.aceId).name}><ChampIcon defId={b.aceId} size={44} /></span>)}
      </div>
      <div class="mode-buttons">
        <button class="mode conquest" onClick={onConquest}>
          <strong>🗺️ {STRINGS.conquestRun}</strong>
          <span>{STRINGS.conquestRunDesc}</span>
        </button>
        <button class="mode secondary" onClick={() => onStart('short')}>
          <strong>{STRINGS.shortRun}</strong>
          <span>{STRINGS.shortRunDesc}</span>
        </button>
        <button class="mode secondary" onClick={() => onStart('full')}>
          <strong>{STRINGS.fullRun}</strong>
          <span>{STRINGS.fullRunDesc}</span>
        </button>
        <button class="mode secondary armory" onClick={() => onStart('armory')}>
          <strong>🛒 {STRINGS.armoryRun}</strong>
          <span>{STRINGS.armoryRunDesc}</span>
        </button>
      </div>
      <ul class="how-to">
        {STRINGS.howToPlay.map((line) => <li key={line}>{line}</li>)}
      </ul>
    </section>
  );
}
