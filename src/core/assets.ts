import { CONFIG } from './config';

const CDN = `https://ddragon.leagueoflegends.com/cdn/${CONFIG.ddragonVersion}`;

export const championIconUrl = (ddragonId: string) => `${CDN}/img/champion/${ddragonId}.png`;
export const itemIconUrl = (ddragonId: string) => `${CDN}/img/item/${ddragonId}.png`;
