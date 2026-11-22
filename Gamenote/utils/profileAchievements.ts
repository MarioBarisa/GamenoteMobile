type ProfileStats = {totalGames: number; finishedGames: number; totalPlaytime: number; bestGames: number};

export function hasPlatinum(stats: ProfileStats, accountSecured: boolean) {
    return accountSecured && stats.totalGames >= 50 && stats.finishedGames >= 25
        && stats.totalPlaytime >= 3000 && stats.bestGames >= 10;
}
