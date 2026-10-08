import { useState } from 'preact/hooks';
import { randomSeed } from '../core/rng';
import { STRINGS } from '../core/strings';
import { BOSSES, championDef } from '../data/bosses';
import { newRun, type RunMode, type RunState } from '../systems/run';
import { BattleScreen } from './BattleScreen';
import { InfoScreen, ItemScreen, LevelUpScreen, RecruitScreen, ShopScreen, StarterScreen } from './ChoiceScreens';
import { ChampIcon, type Act } from './components';
import { GuideModal, InspectContext, InspectModal, type InspectTarget } from './inspect';
import { MapScreen } from './MapScreen';

export function App() {
  const [run, setRun] = useState<RunState | null>(null);
  const [inspecting, setInspecting] = useState<InspectTarget | null>(null);
  const [guideOpen, setGuideOpen] = useState(false);

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
          <button class="logo" onClick={() => run && confirm('Abandon this run?') && setRun(null)} disabled={!run}>
            {STRINGS.title}
          </button>
          <div class="top-actions">
            {run && <span class="muted small">Seed {run.seed}</span>}
            <button class="chip" onClick={() => setGuideOpen(true)}>📖 {STRINGS.guide}</button>
          </div>
        </header>
        {run ? <RunView run={run} act={act} onNewRun={() => setRun(null)} /> : <Title onStart={(mode) => setRun(newRun(mode, randomSeed()))} />}
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
    case 'starter': return <StarterScreen phase={p} act={act} />;
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

function Title({ onStart }: { onStart: (mode: RunMode) => void }) {
  return (
    <section class="title-screen">
      <h1>{STRINGS.title}</h1>
      <p class="tagline">{STRINGS.tagline}</p>
      <div class="boss-strip">
        {BOSSES.map((b) => <span key={b.id} title={championDef(b.aceId).name}><ChampIcon defId={b.aceId} size={44} /></span>)}
      </div>
      <div class="mode-buttons">
        <button class="mode" onClick={() => onStart('short')}>
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
