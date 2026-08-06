// API ključ za RAWG Games Database
// POSTAVITI -> RAWG_API_KEY u .env.local datoteci
import { RAWG_API_KEY } from '@/constants/env'

const BASE_URL = 'https://api.gamenote.eu/api/'

export async function searchGames(query: string, page = 1) {
  try {
    const response = await fetch(
      `${BASE_URL}/games?key=${RAWG_API_KEY}&search=${query}&page=${page}&page_size=20`
    )

    if (!response.ok) {
      console.error('Greška pri dohvaćanju igara')
      return { results: [] }
    }

    return await response.json()
  } catch (err) {
    console.error(err)
    return { results: [] }
  }
}

export async function getGameDetails(id: string) {
  try {
    const response = await fetch(
      `${BASE_URL}/games/${id}?key=${RAWG_API_KEY}`
    )

    if (!response.ok) {
      console.error('Greška pri dohvaćanju detalja igre')
      return null
    }

    return await response.json()
  } catch (err) {
    console.error(err)
    return null
  }
}

export async function getGameScreenshots(id: string) {
  try {
    const response = await fetch(
      `${BASE_URL}/games/${id}/screenshots?key=${RAWG_API_KEY}`
    )

    if (!response.ok) {
      console.error('Greška pri dohvaćanju slika igre')
      return []
    }

    const data = await response.json()
    return data.results
  } catch (err) {
    console.error(err)
    return []
  }
}

export async function getGameAchievements(id: string) {
  // RAWG API /achievements endpoint ima ograničenu dostupnost.
  // Umjesto toga, TREBA dohvatiti broj achievementa iz game detailsa.
  // Trebam provjeriti dostupne fields u game objektu koji daje RAWG.
  try {
    const gameDetails = await getGameDetails(id)

    if (!gameDetails) {
      return { count: 0, results: [] }
    }

    // RAWG ima različita polja za achievements/trophies ovisno o dostupnosti:
    // - achievements_count: broj achievementa ako su dostupni
    // - trophies_count (ako postoji)
    // - parent_achievements (ako igra ima achievements)

    let achievementCount = 0

    if (gameDetails.achievements_count && gameDetails.achievements_count > 0) {
      achievementCount = gameDetails.achievements_count
    }

    if (achievementCount === 0 && gameDetails.parent_achievements && gameDetails.parent_achievements.length > 0) {
      achievementCount = gameDetails.parent_achievements.length
    }

    console.log(`Game: ${gameDetails.name}, Achievements count: ${achievementCount}`)

    return {
      count: achievementCount,
      results: gameDetails.parent_achievements || []
    }
  } catch (err) {
    console.error('Error fetching achievements:', err)
    return { count: 0, results: [] }
  }
}

export async function getPopularGames() {
  try {
    const today = new Date()
    const oneYearAgo = new Date()
    oneYearAgo.setFullYear(today.getFullYear() - 1)

    const startDate = oneYearAgo.toISOString().split('T')[0] // YYYY-MM-DD format
    const endDate = today.toISOString().split('T')[0] // YYYY-MM-DD format

    const response = await fetch(
      `${BASE_URL}/games?key=${RAWG_API_KEY}&dates=${startDate},${endDate}&metacritic=75,100&ordering=-metacritic&page_size=10`
    )

    if (!response.ok) {
      console.error('Greška pri dohvaćanju popularnih igara')
      return []
    }

    const data = await response.json()
    return data.results
  } catch (err) {
    console.error(err)
    return []
  }
}

export async function getRecentGames() {
  try {
    const response = await fetch(
      `${BASE_URL}/games?key=${RAWG_API_KEY}&ordering=-released&page_size=10`
    )

    if (!response.ok) {
      console.error('Greška pri dohvaćanju nedavnih igara')
      return []
    }

    const data = await response.json()
    return data.results
  } catch (err) {
    console.error(err)
    return []
  }
}

export async function getThisYearGames() {
  try {
    const today = new Date()
    const currentYear = today.getFullYear()
    const startOfYear = `${currentYear}-01-01`
    const todayFormatted = today.toISOString().split('T')[0] // YYYY-MM-DD format

    const response = await fetch(
      `${BASE_URL}/games?key=${RAWG_API_KEY}&dates=${startOfYear},${todayFormatted}&ordering=-added&page_size=10`
    )

    if (!response.ok) {
      console.error('Greška pri dohvaćanju igara ove godine')
      return []
    }

    const data = await response.json()
    return data.results
  } catch (err) {
    console.error(err)
    return []
  }
}

export async function getGameSeries(gameId: string) {
  try {
    const response = await fetch(`${BASE_URL}/games/${gameId}/game-series?key=${RAWG_API_KEY}`)

    if (!response.ok) {
      console.error('Greška pri dohvaćanju serijala igara')
      return { results: [] }
    }

    return await response.json()
  } catch (err) {
    console.error('Game series API error:', err)
    return { results: [] }
  }
}
