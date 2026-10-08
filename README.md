# LeagueRogue

A browser roguelike in the style of [pokelike](https://pokelike.xyz), with League of Legends champions and items.
The design and roadmap are in [PLAN.md](PLAN.md).

## Run it

```bash
npm install
npm run dev       # start the dev server, then open the printed localhost URL and play
npm test          # unit tests
npm run balance   # 1v1 win-rate table per champion, plus bot win rates for short/full runs
npm run build     # production build in dist/
```

## Layout

- `src/core`: types, seeded RNG, tunable config, UI strings
- `src/data`: champions, items, classes, regions
- `src/systems`: game rules with no UI (stats, damage, battle, leveling, map, run)
- `src/ui`: Preact components
- `tests`: Vitest specs

## Legal

LeagueRogue isn't endorsed by Riot Games and doesn't reflect the views or opinions of Riot Games or anyone officially involved in producing or managing Riot Games properties. Riot Games, and all associated properties are trademarks or registered trademarks of Riot Games, Inc.

This is a free, non-commercial fan project.
