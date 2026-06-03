export const PROGRESS_MODES = [
  { key: 'completion_standard',     label: 'Completion %',       kind: 'percent', requiresTotal: true,  defaultUnit: '%',        badgeSource: 'standard' },
  { key: 'completion_nintendo',     label: 'Nintendo %',         kind: 'percent', requiresTotal: true,  defaultUnit: '%',        badgeSource: 'nintendo' },
  { key: 'achievements_steam',      label: 'Steam Achievements', kind: 'ratio',   requiresTotal: true,  defaultUnit: 'achv',     badgeSource: 'steam'    },
  { key: 'achievements_xbox',       label: 'Xbox Achievements',  kind: 'ratio',   requiresTotal: true,  defaultUnit: 'achv',     badgeSource: 'xbox'     },
  { key: 'achievements_gamecentre', label: 'Game Centre Achv.',  kind: 'ratio',   requiresTotal: true,  defaultUnit: 'achv',     badgeSource: 'apple'    },
  { key: 'trophies_psn',            label: 'PSN Trophies',       kind: 'count',   requiresTotal: true, defaultUnit: 'trophies', badgeSource: 'psn'      },
  { key: 'leaderboard_rank',        label: 'Leaderboard Rank',   kind: 'rank',    requiresTotal: true, defaultUnit: '#',        badgeSource: 'rank'     },
  { key: 'pokedex',                 label: 'Pokédex',            kind: 'ratio',   requiresTotal: true,  defaultUnit: 'caught',   badgeSource: 'nintendo' },
] as const;

export type ProgressModeKey = typeof PROGRESS_MODES[number]['key'];
export type ProgressModeKind = typeof PROGRESS_MODES[number]['kind'];

export const PROGRESS_MODE_MAP = Object.fromEntries(
  PROGRESS_MODES.map(m => [m.key, m])
) as Record<ProgressModeKey, typeof PROGRESS_MODES[number]>;

export function progressLabel(  //HELPER FUNKCIJA ZA PROGRESS
  mode_key?: string,
  value?: number,
  total?: number
): string | null {
  if (!mode_key) return null;
  const mode = PROGRESS_MODE_MAP[mode_key as ProgressModeKey];
  if (!mode) return null;
  switch (mode.kind) {
    case 'count':   return value != null && total != null ? `${value}/${total} ( ${Math.round((value / total) * 100)}% )` : `${value ?? 0} ${mode.defaultUnit}`;
    case 'rank':    return value != null ? `#${value}` : null;
    case 'ratio':   return value != null && total != null ? `${value}/${total} ( ${Math.round((value / total) * 100)}% )` : null;
    case 'percent': {
      if (total && total > 0 && value != null)
        return `${value}/${total} ( ${Math.round((value / total) * 100)}% )`;
      return null;
    }
  }
}

export function isProgressModeKey(key: string): key is ProgressModeKey {
  return key in PROGRESS_MODE_MAP;
}

export function achievementPercent(value?: number, total?: number): number {
  if (!value || !total || total <= 0) return 0
  const v = Math.min(value, total)
  return Math.round((v / total) * 100)
}

//BOJE PROGRESS BARA PREMA POSTOTKU PROLAZNOSTI
export function progressColor(value?: number, total?: number): string {
  const pct = achievementPercent(value, total)
  if (pct >= 100) return '#0d36f9'
  if (pct >= 98) return '#f90d74'
  if (pct >= 95) return '#12f90d'
  if (pct >= 90) return '#22C55E'
  if (pct >= 70) return '#84CC16'
  if (pct >= 45) return '#FACC15'
  if (pct >= 20) return '#F97316'
  return '#EF4444'
}