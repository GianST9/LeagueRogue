// Turns ability specs into readable lines with the actual numbers at a given level.

import { CONFIG } from '../core/config';
import type { AbilityDef, DamageSpec, HealSpec, Stats } from '../core/types';
import { abilityLevelFactor, ultimateRank } from '../systems/stats';

const pct = (v: number) => `${Math.round(v * 100)}%`;
const STAT_LABEL: Record<string, string> = { hp: 'max HP', ad: 'AD', ap: 'AP', armor: 'armor', mr: 'MR', speed: 'speed', crit: 'crit chance' };

export function cooldownText(cooldown: number): string {
  if (cooldown === 0) return 'Usable every turn';
  return `Cooldown ${cooldown}: waits ${cooldown} turn${cooldown === 1 ? '' : 's'} after use`;
}

/** Multiplier on flat numbers for this ability at this level (ultimates also scale by rank). */
export function abilityScale(ability: AbilityDef, level: number): number {
  const rank = ultimateRank(level);
  const rankScale = ability.key === 'R' && rank > 0 ? CONFIG.abilities.ultimateRankScale[rank - 1] : 1;
  return abilityLevelFactor(level) * rankScale;
}

function damageLine(d: DamageSpec, scale: number, stats: Stats): string {
  const parts = d.base ? [`${Math.round(d.base * scale)}`] : [];
  if (d.adRatio) parts.push(`${pct(d.adRatio)} AD`);
  if (d.apRatio) parts.push(`${pct(d.apRatio)} AP`);
  if (d.armorRatio) parts.push(`${pct(d.armorRatio)} armor`);
  const own = d.base * scale + (d.adRatio ?? 0) * stats.ad + (d.apRatio ?? 0) * stats.ap + (d.armorRatio ?? 0) * stats.armor;
  let text = `${parts.join(' + ')} (≈${Math.round(own)})`;
  if (d.targetMaxHpRatio) text += ` + ${pct(d.targetMaxHpRatio)} of the target's max HP`;
  if (d.targetMissingHpRatio) text += ` + ${pct(d.targetMissingHpRatio)} of the target's missing HP`;
  const hits = d.hits && d.hits > 1 ? `, ${d.hits} hits` : '';
  const type = d.type === 'true' ? 'true' : d.type;
  return `Deals ${text} ${type} damage${hits}${d.canCrit ? ' (can crit)' : ''}.`;
}

function healValue(h: HealSpec, scale: number, stats: Stats): string {
  const parts = h.base ? [`${Math.round(h.base * scale)}`] : [];
  if (h.adRatio) parts.push(`${pct(h.adRatio)} AD`);
  if (h.apRatio) parts.push(`${pct(h.apRatio)} AP`);
  if (h.maxHpRatio) parts.push(`${pct(h.maxHpRatio)} max HP`);
  const total = h.base * scale + (h.adRatio ?? 0) * stats.ad + (h.apRatio ?? 0) * stats.ap + (h.maxHpRatio ?? 0) * stats.hp;
  return `${parts.join(' + ')} (≈${Math.round(total)})`;
}

/** Effect lines for an ability at the given level and stats. */
export function abilityLines(ability: AbilityDef, level: number, stats: Stats): string[] {
  const scale = abilityScale(ability, level);
  const lines: string[] = [];
  if (ability.damage) lines.push(damageLine(ability.damage, scale, stats));
  if (ability.lifesteal) lines.push(`Heals for ${pct(ability.lifesteal)} of the damage dealt.`);
  if (ability.heal) lines.push(`Heals ${healValue(ability.heal, scale, stats)} HP.`);
  if (ability.shield) lines.push(`Gains a ${healValue(ability.shield, scale, stats)} shield.`);
  if (ability.stun) lines.push(`Stuns the target for ${ability.stun} turn${ability.stun === 1 ? '' : 's'}.`);
  if (ability.selfBuff) {
    const b = ability.selfBuff;
    lines.push(`${b.pct > 0 ? '+' : '−'}${pct(Math.abs(b.pct))} ${STAT_LABEL[b.stat]} for ${b.turns} turns.`);
  }
  if (ability.targetDebuff) {
    const b = ability.targetDebuff;
    lines.push(`Target gets ${b.pct > 0 ? '+' : '−'}${pct(Math.abs(b.pct))} ${STAT_LABEL[b.stat]} for ${b.turns} turns.`);
  }
  if (ability.dot) {
    const d = ability.dot;
    const parts: string[] = [];
    if (d.base) parts.push(`${Math.round(d.base * scale)}`);
    if (d.apRatio) parts.push(`${pct(d.apRatio)} AP`);
    if (d.maxHpRatio) parts.push(`${pct(d.maxHpRatio)} of the target's max HP`);
    lines.push(`Poisons for ${parts.join(' + ')} ${d.type} damage per turn, ${d.turns} turns.`);
  }
  if (ability.castBelowHp !== undefined && ability.castBelowHp < 1) {
    lines.push(`Only used at or below ${pct(ability.castBelowHp)} HP.`);
  }
  return lines;
}
