import { NODE_INFO, STRINGS } from '../core/strings';
import { championDef } from '../data/bosses';
import { regionLook } from '../data/conquest';
import { REGIONS } from '../data/regions';
import { findNode } from '../systems/map';
import { availableNodes, currentBoss, currentRegion, enterNode, modeConfig, type RunState } from '../systems/run';
import { ChampIcon, TeamPanel, type Act } from './components';

const WIDTH = 520;
const LAYER_GAP = 88;
const PAD = 44;

export function MapScreen({ run, act }: { run: RunState; act: Act }) {
  const layers = run.map.layers;
  const height = PAD * 2 + LAYER_GAP * (layers.length - 1);
  // Layer 0 at the bottom, boss at the top.
  const pos = (layer: number, index: number) => ({
    x: ((index + 0.5) / layers[layer].length) * WIDTH,
    y: height - PAD - layer * LAYER_GAP,
  });
  const available = new Set(availableNodes(run).map((n) => n.id));
  const visited = new Set(run.visited);
  const boss = currentBoss(run);
  const bossDef = championDef(boss.aceId);

  return (
    <div class="screen map-screen">
      <section class="panel map-panel">
        <header class="map-header">
          <div>
            {currentRegion(run) && (
              <div class="muted small">
                {STRINGS.conquestHeader(regionLook(currentRegion(run)!.id).name)}
              </div>
            )}
            <h2>{STRINGS.mapHeader(run.mapIndex + 1, run.totalMaps)}</h2>
          </div>
          <div class="boss-preview">
            <span class="muted small">{STRINGS.bossAhead}</span>
            <ChampIcon defId={boss.aceId} size={36} />
            <strong>{bossDef.name}</strong>
            <span class="region-chip" style={{ borderColor: REGIONS[boss.region].color, color: REGIONS[boss.region].color }}
              title={`The boss team uses the ${REGIONS[boss.region].name} region bonus.`}>
              {REGIONS[boss.region].name}
            </span>
          </div>
        </header>
        <svg class="map" viewBox={`0 0 ${WIDTH} ${height}`} role="img" aria-label="Run map">
          {layers.flatMap((layer) =>
            layer.flatMap((node) =>
              node.next.map((nextId) => {
                const to = findNode(run.map, nextId);
                const a = pos(node.layer, node.index);
                const b = pos(to.layer, to.index);
                const walked = visited.has(node.id) && visited.has(nextId);
                const open = run.position === node.id && available.has(nextId);
                return (
                  <line key={`${node.id}>${nextId}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                    class={`edge${walked ? ' walked' : ''}${open ? ' open' : ''}`} />
                );
              }),
            ),
          )}
          {layers.flatMap((layer) =>
            layer.map((node) => {
              const { x, y } = pos(node.layer, node.index);
              const info = NODE_INFO[node.kind];
              const isAvailable = available.has(node.id);
              const r = node.kind === 'boss' ? 30 : 22;
              const cls = `node node-${node.kind}${isAvailable ? ' available' : ''}${visited.has(node.id) ? ' visited' : ''}`;
              return (
                <g key={node.id} class={cls} transform={`translate(${x} ${y})`}
                  onClick={isAvailable ? () => act((s) => enterNode(s, node.id)) : undefined}
                  role={isAvailable ? 'button' : undefined} tabIndex={isAvailable ? 0 : undefined}
                  onKeyDown={isAvailable ? (e) => { if (e.key === 'Enter' || e.key === ' ') act((s) => enterNode(s, node.id)); } : undefined}>
                  <title>{`${info.label}: ${node.kind === 'boss' ? bossDef.name : info.hint}`}</title>
                  <circle r={r} />
                  <text text-anchor="middle" dominant-baseline="central" font-size={node.kind === 'boss' ? 26 : 20}>{info.icon}</text>
                </g>
              );
            }),
          )}
        </svg>
        <div class="legend">
          {(['camp', 'rival', 'recruit', 'item', 'levelup', 'fountain', 'boss'] as const)
            .filter((k) => k !== 'item' || modeConfig(run).itemNodes)
            .map((k) => (
            <span key={k} title={NODE_INFO[k].hint}>{NODE_INFO[k].icon} {NODE_INFO[k].label}</span>
          ))}
        </div>
      </section>
      <TeamPanel run={run} act={act} editable />
    </div>
  );
}
