import * as SecureStore from "expo-secure-store";

const CREDENTIALS_KEY = "gamenote.igdb.credentials";
const keychain = {keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY};
const GAMES_FIELDS = [
    "id", "name", "summary", "cover.image_id", "first_release_date", "aggregated_rating", "rating",
    "genres.name", "involved_companies.publisher", "involved_companies.company.name", "platforms.name",
    "websites.category", "websites.url", "age_ratings.organization.name", "age_ratings.rating_category.rating",
    "screenshots.id", "screenshots.image_id", "artworks.image_id",
].join(",");
const SERIES_FIELDS = ["id", "name", "cover.image_id", "first_release_date"];
const PLATFORMS: Record<string, string> = {"PC (Microsoft Windows)": "PC", "Xbox Series X|S": "Xbox Series X/S"};

type Credentials = {clientId: string; clientSecret: string};
type Token = {value: string; expiresAt: number};
type Named = {name: string};
type Artwork = {id: number; image_id?: string};
type IgdbGame = {
    id: number;
    name: string;
    summary?: string;
    cover?: Artwork;
    first_release_date?: number;
    aggregated_rating?: number;
    rating?: number;
    genres?: Named[];
    involved_companies?: {publisher: boolean; company?: Named}[];
    platforms?: Named[];
    websites?: {category: number; url: string}[];
    age_ratings?: {organization?: {name: string}; rating_category?: {rating: string}}[];
    screenshots?: Artwork[];
    artworks?: Artwork[];
    franchises?: {games?: IgdbGame[]}[];
    collections?: {games?: IgdbGame[]}[];
};

type TokenRequest = {clientId: string; promise: Promise<Token>};
let credentialsPromise: Promise<Credentials | null> | undefined;
let tokenRequest: TokenRequest | undefined;
let requestStart = Promise.resolve();
let nextRequestAt = 0;

export class IgdbCredentialsMissing extends Error {}

function getCredentials() {
    credentialsPromise ??= SecureStore.getItemAsync(CREDENTIALS_KEY, keychain).then(raw => {
        if (!raw) return null;
        const data: Credentials = JSON.parse(raw);
        return data.clientId && data.clientSecret ? data : null;
    }).catch(() => {
        credentialsPromise = undefined;
        throw new Error("igdbCredentials");
    });
    return credentialsPromise;
}

export async function hasIgdbCredentials() {
    return Boolean(await getCredentials());
}

async function requestToken({clientId, clientSecret}: Credentials): Promise<Token> {
    const response = await fetch("https://id.twitch.tv/oauth2/token", {
        method: "POST",
        headers: {"Content-Type": "application/x-www-form-urlencoded"},
        body: new URLSearchParams({client_id: clientId, client_secret: clientSecret, grant_type: "client_credentials"}).toString(),
    });
    if (!response.ok) throw new Error("igdbCredentials");
    const {access_token, expires_in} = await response.json();
    if (typeof access_token !== "string" || typeof expires_in !== "number" || expires_in <= 0) throw new Error("igdbToken");
    return {value: access_token, expiresAt: Date.now() + expires_in * 1000};
}

export async function saveIgdbCredentials(clientId: string, clientSecret: string) {
    const credentials = {clientId: clientId.trim(), clientSecret: clientSecret.trim()};
    if (!credentials.clientId || !credentials.clientSecret) throw new IgdbCredentialsMissing();
    await SecureStore.setItemAsync(CREDENTIALS_KEY, JSON.stringify(credentials), keychain);
    credentialsPromise = Promise.resolve(credentials);
    tokenRequest = undefined;
}

async function getToken(credentials: Credentials) {
    const pending = tokenRequest;
    if (pending?.clientId === credentials.clientId) {
        const token = await pending.promise;
        if (token.expiresAt > Date.now() + 10000) return token;
    }
    const request = {clientId: credentials.clientId, promise: requestToken(credentials)};
    tokenRequest = request;
    try {
        return await request.promise;
    } catch (error) {
        if (tokenRequest === request) tokenRequest = undefined;
        throw error;
    }
}

async function waitForRequestSlot() {
    const scheduled = requestStart.then(async () => {
        const delay = nextRequestAt - Date.now();
        if (delay > 0) await new Promise(resolve => setTimeout(resolve, delay));
        nextRequestAt = Date.now() + 350;
    });
    requestStart = scheduled;
    await scheduled;
}

async function postGames(body: string, signal?: AbortSignal, retry = true): Promise<IgdbGame[]> {
    if (signal?.aborted) throw new Error("igdbCancelled");
    const credentials = await getCredentials();
    if (!credentials) throw new IgdbCredentialsMissing();
    const token = await getToken(credentials);
    await waitForRequestSlot();
    if (signal?.aborted) throw new Error("igdbCancelled");
    const response = await fetch("https://api.igdb.com/v4/games", {
        method: "POST",
        headers: {"Client-ID": credentials.clientId, Authorization: `Bearer ${token.value}`, "Content-Type": "text/plain", Accept: "application/json"},
        body,
        signal,
    });
    if (response.status === 401 && retry) {
        if ((await tokenRequest?.promise)?.value === token.value) tokenRequest = undefined;
        return postGames(body, signal, false);
    }
    if (!response.ok) throw new Error("igdbSearch");
    return response.json();
}

function image(id: string | undefined, size: "cover_big" | "screenshot_big") {
    return id && /^[a-z\d]+$/i.test(id) ? `https://images.igdb.com/igdb/image/upload/t_${size}/${id}.jpg` : null;
}

function releaseDate(seconds?: number) {
    if (!seconds) return null;
    const date = new Date(seconds * 1000);
    return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
}

function toResult(game: IgdbGame) {
    const score = game.aggregated_rating ?? game.rating;
    const esrb = game.age_ratings?.find(rating => rating.organization?.name?.toUpperCase() === "ESRB")
        ?.rating_category?.rating;
    return {
        id: `igdb-${game.id}`,
        name: game.name,
        background_image: image(game.cover?.image_id, "cover_big"),
        background_image_additional: image((game.artworks?.[0] ?? game.screenshots?.[0])?.image_id, "screenshot_big"),
        released: releaseDate(game.first_release_date),
        igdb_rating: score == null ? null : Math.round(score),
        description_raw: game.summary?.trim() ?? "",
        website: (game.websites?.find(website => website.category === 1) ?? game.websites?.[0])?.url ?? "",
        esrb_rating: esrb ? {name: esrb} : null,
        genres: game.genres ?? [],
        publishers: game.involved_companies?.flatMap(entry => entry.publisher && entry.company ? [entry.company] : []) ?? [],
        platforms: game.platforms?.map(({name}) => ({platform: {name: PLATFORMS[name] ?? name}})) ?? [],
        short_screenshots: (game.screenshots ?? []).slice(0, 12).flatMap(shot => {
            const uri = image(shot.image_id, "screenshot_big");
            return uri ? [{id: shot.id, image: uri}] : [];
        }),
    };
}

export async function searchIgdbGames(query: string, signal?: AbortSignal) {
    const text = query.trim().slice(0, 100).replace(/[\u0000-\u001f\u007f]/g, " ");
    if (!text) return {results: []};
    const games = await postGames(`search ${JSON.stringify(text)}; fields ${GAMES_FIELDS}; limit 20;`, signal);
    return {results: games.map(toResult)};
}

export async function getIgdbGame(id: string, signal?: AbortSignal) {
    const igdbId = /^igdb-(\d+)$/.exec(id)?.[1];
    if (!igdbId) return null;
    const [game] = await postGames(`fields ${GAMES_FIELDS}; where id = ${igdbId}; limit 1;`, signal);
    return game ? toResult(game) : null;
}

export async function getIgdbSeries(id: string, signal?: AbortSignal) {
    const igdbId = /^igdb-(\d+)$/.exec(id)?.[1];
    if (!igdbId) return [];
    const fields = ["franchises", "collections"].flatMap(group => SERIES_FIELDS.map(field => `${group}.games.${field}`));
    const [game] = await postGames(`fields ${fields.join(",")}; where id = ${igdbId}; limit 1;`, signal);
    const series = new Map<number, IgdbGame>();
    for (const group of [...(game?.franchises ?? []), ...(game?.collections ?? [])]) {
        for (const entry of group.games ?? []) if (entry.id !== Number(igdbId)) series.set(entry.id, entry);
    }
    return [...series.values()].map(entry => ({
        id: entry.id,
        name: entry.name,
        released: releaseDate(entry.first_release_date),
        background_image: image(entry.cover?.image_id, "cover_big") ?? "",
    }));
}
