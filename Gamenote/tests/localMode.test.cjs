const assert = require("node:assert/strict");
const {createHash, randomUUID} = require("node:crypto");
const {readFileSync} = require("node:fs");
const {join} = require("node:path");
const {test} = require("node:test");
const ts = require("typescript");

function load(path, imports) {
    const source = readFileSync(join(__dirname, "..", path), "utf8");
    const {outputText} = ts.transpileModule(source, {compilerOptions: {module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX}});
    const module = {exports: {}};
    new Function("require", "module", "exports", outputText)(name => {
        assert.ok(name in imports, `Unexpected import: ${name}`);
        return imports[name];
    }, module, module.exports);
    return module.exports;
}

const expo = {uuid: {v4: randomUUID, v5: text => createHash("sha1").update(text).digest("hex"), namespace: {url: "url"}}};
const game = (title, metadata = {}) => ({title, game_id: "igdb-71", metacriticScore: 0, releaseDate: "", webPage: "", about: "", ...metadata});

function fixture() {
    let saved;
    let failNextWrite = false;
    const fileSystem = {
        documentDirectory: "file:///local/Documents/",
        getInfoAsync: async () => saved ? {exists: true, size: Buffer.byteLength(saved)} : {exists: false},
        readAsStringAsync: async () => saved,
        writeAsStringAsync: async (uri, text) => {
            assert.equal(uri, "file:///local/Documents/gamenote-local.json");
            if (failNextWrite) {
                failNextWrite = false;
                throw new Error("disk");
            }
            saved = text;
        },
    };
    const reopen = () => load("services/localData.ts", {
        expo,
        "expo-file-system/legacy": fileSystem,
        "@/constants/platformIcons": {PLATFORM_ICON_KEYS: {PC: "pc", Other: "other"}},
    });
    return {data: reopen(), reopen, failNext: () => { failNextWrite = true; }, saved: () => JSON.parse(saved)};
}

function mirrorFixture(data, readPage) {
    const supabase = {from: table => ({select: () => ({eq: (column, user) => {
        assert.equal(column, "user_id");
        assert.equal(user, "my-account");
        return {order: key => {
            assert.equal(key, "id");
            return {limit: size => ({
                then: (resolve, reject) => readPage(table, "", size).then(resolve, reject),
                gt: (key, cursor) => {
                    assert.equal(key, "id");
                    return readPage(table, cursor, size);
                },
            })};
        }};
    }})})};
    return load("services/localMirror.ts", {
        expo,
        "@/services/localData": data,
        "@/services/supabase": {supabase},
        "@/services/userGameRows": load("services/userGameRows.ts", {}),
    });
}

test("Offline library survives reopening and updates games by local record ID", async () => {
    const {data, reopen, saved} = fixture();
    await data.setLocalProfile({name: " Iva ", profileUrl: "https://images.example/avatar.png"});
    await data.setLocalPlatforms(platforms => [...platforms, "Steam Deck"], {name: "Steam Deck", value: "#20985C"});
    const group = await data.createLocalGroup({name: "Backlog", rating: null, type: "Collection"});
    const [first, second] = await Promise.all([
        data.addLocalGame(game("First", {image_url: "https://images.example/cover.jpg", screenshot_urls: ["data:image/png;base64,fail"]}), [group.id]),
        data.addLocalGame(game("Second")),
    ]);
    assert.notEqual(first.db_id, second.db_id);
    const restarted = reopen();
    assert.equal((await restarted.getLocalProfile()).name, "Iva");
    assert.ok((await restarted.getLocalPlatforms()).includes("Steam Deck"));
    assert.equal(saved().platformColors["Steam Deck"], "#20985C");
    assert.deepEqual(saved().games[0].screenshot_urls, []);
    assert.ok((await restarted.listLocalGroupGames(group.id)).some(link => link.game_id === first.db_id));
    await restarted.updateLocalGame(second.db_id, {rating: 5}, {add: [group.id], remove: []});
    await restarted.updateLocalGroup(group.id, {name: "Favorites"});
    assert.deepEqual((await restarted.listLocalGames()).map(entry => entry.rating), [undefined, 5]);
    await restarted.deleteLocalGame(first.db_id);
    assert.equal((await restarted.listLocalGameGroups(first.db_id)).length, 0);
    assert.equal((await restarted.getLocalGroup(group.id)).name, "Favorites");
    await restarted.deleteLocalGroup(group.id);
    assert.equal(saved().game_groups.length, 0);
    assert.equal(saved().games.length, 1);
    assert.equal(data.localImageUrl("https://api.gamenote.eu/cover"), undefined);
    assert.equal(data.localImageUrl("https://images.igdb.com/cover.jpg"), "https://images.igdb.com/cover.jpg");
});

test("A failed write or group link keeps the previous full local document", async () => {
    const {data, saved, failNext} = fixture();
    const original = await data.loadLocalData();
    failNext();
    await assert.rejects(data.addLocalGame(game("Failure")), /disk/);
    await assert.rejects(data.addLocalGame(game("Missing group"), ["missing"]), /localGroupLink/);
    assert.deepEqual(saved(), original);
    assert.equal(data.getLocalState().document, original);
    assert.ok((await data.addLocalGame(game("Offline manual entry", {game_id: ""}))).game_id.startsWith("local-"));
    assert.equal(saved().games.length, 1);
});

test("Cloud mirror copies the profile once and applies cloud edits and deletions only to mirrored records", async () => {
    const {data, saved, reopen, failNext} = fixture();
    const independent = await data.addLocalGame(game("Only local"));
    await data.setLocalPlatforms(platforms => [...platforms, "Steam Deck"], {name: "Steam Deck", value: "#20985C"});
    const cloudProfile = {name: "Cloud name", profileUrl: "https://images.example/cloud.png"};
    const editedProfile = {name: "Local name", profileUrl: "https://images.example/local.png"};
    const rows = {
        games: [{id: "remote-game", title: "Cloud game", game_api_id: "72"}],
        groups: [{id: "remote-group", name: "Cloud group", type: "collection", rating: null, created_at: "2025-05-04"}],
        game_groups: [{id: "remote-link", game_id: "remote-game", group_id: "remote-group"}],
    };
    let pendingRead = Promise.resolve();
    const mirror = mirrorFixture(data, async table => {
        await pendingRead;
        return {data: rows[table], error: null};
    });
    await mirror.syncLocalMirror("my-account", () => true, cloudProfile);
    assert.deepEqual(saved().profile, cloudProfile);
    const gameId = saved().games[1].db_id;
    const groupId = saved().groups[0].id;
    assert.notEqual(gameId, "remote-game");
    assert.equal(saved().game_groups[0].game_id, gameId);
    assert.equal(saved().game_groups[0].group_id, groupId);
    await data.updateLocalGame(gameId, {notes: "Local draft"});
    await data.setLocalProfile(editedProfile);
    await mirror.syncLocalMirror("my-account", () => true);
    assert.equal(saved().games[1].notes, "Local draft");
    rows.games[0].title = "Updated cloud game";
    rows.groups[0].name = "Updated cloud group";
    rows.games.push({id: "new-remote-game", title: "New cloud game", game_api_id: "73"});
    await mirror.syncLocalMirror("my-account", () => true);
    assert.equal(saved().games[1].title, "Updated cloud game");
    assert.equal(saved().games[1].db_id, gameId);
    assert.equal(saved().games[2].title, "New cloud game");
    assert.equal(saved().groups[0].name, "Updated cloud group");
    rows.games = [];
    rows.groups = [];
    rows.game_groups = [];
    await mirror.syncLocalMirror("my-account", () => false);
    assert.equal(saved().games.length, 3);
    await mirror.syncLocalMirror("my-account", () => true);
    assert.deepEqual(saved().games.map(entry => entry.db_id), [independent.db_id]);
    assert.equal(saved().groups.length, 0);
    assert.equal(saved().game_groups.length, 0);
    await mirror.disableLocalMirror("my-account");
    assert.equal(saved().mirrors["my-account"].enabled, false);
    await mirror.syncLocalMirror("my-account", () => true, cloudProfile);
    assert.deepEqual(saved().profile, editedProfile);
    await data.createLocalGroup({name: "Only local", rating: null, type: "collection"}, [independent.db_id]);

    failNext();
    await assert.rejects(data.deleteLocalProfile(), /disk/);
    assert.deepEqual(saved().profile, editedProfile);
    assert.equal(saved().games.length, 1);
    assert.equal(saved().game_groups.length, 1);

    rows.games = [{id: "late-cloud-game", title: "Late cloud game", game_api_id: "91"}];
    let finishRead;
    pendingRead = new Promise(resolve => { finishRead = resolve; });
    const inFlight = mirror.syncLocalMirror("my-account", () => true, cloudProfile);
    await data.deleteLocalProfile();
    finishRead();
    await inFlight;
    const restarted = reopen();
    assert.deepEqual(await restarted.loadLocalData(), {
        schemaVersion: 1,
        profile: {name: "", profileUrl: ""},
        platforms: ["PC", "Other"],
        games: [],
        groups: [],
        game_groups: [],
    });
});

test("A deletion on the first cloud page preserves the local edits and links of the first game on page two", async () => {
    const {data, saved} = fixture();
    let games = Array.from({length: 501}, (_, index) => ({
        id: String(index).padStart(3, "0"), title: `Game ${index}`, game_api_id: String(index),
    }));
    let deleteDuringRead = false;
    const mirror = mirrorFixture(data, async (table, cursor, size) => {
        if (table !== "games") return {data: [], error: null};
        const page = games.filter(game => game.id > cursor).slice(0, size);
        if (!cursor && deleteDuringRead) games = games.slice(1);
        return {data: page, error: null};
    });
    await mirror.syncLocalMirror("my-account", () => true, {name: "", profileUrl: ""});
    const lastGame = saved().games.find(game => game.game_id === "500");
    const group = await data.createLocalGroup({name: "Local group", rating: null, type: "collection"}, [lastGame.db_id]);
    await data.updateLocalGame(lastGame.db_id, {notes: "Local notes"});
    deleteDuringRead = true;
    await mirror.syncLocalMirror("my-account", () => true);
    assert.equal(saved().games.find(game => game.db_id === lastGame.db_id)?.notes, "Local notes");
    assert.ok(saved().game_groups.some(link => link.game_id === lastGame.db_id && link.group_id === group.id));
});

test("The iOS alert requires explicit confirmation before deleting the local profile", async () => {
    const element = (type, props) => ({type, props});
    const ModalButton = Symbol("ModalButton");
    let buttons;
    let deletions = 0;
    const {default: LocalModeSettings} = load("app/settings/local-mode.tsx", {
        react: {useState: value => [value, () => {}]},
        "react/jsx-runtime": {jsx: element, jsxs: element},
        "react-native": {Alert: {alert: (_title, _message, actions) => { buttons = actions; }}, StyleSheet: {create: value => value}},
        "expo-image": {},
        "expo-symbols": {},
        "react-i18next": {useTranslation: () => ({t: key => key, i18n: {language: "en"}})},
        "@/components/AccountModal": {ModalButton},
        "@/components/IgdbCredentialsForm": {},
        "@/components/PlatformIcon": {},
        "@/components/SelectMenu": {},
        "@/context/localMode": {useLocalMode: () => ({
            document: {profile: {}, games: [], platforms: []}, storageSize: 0,
            eraseLocalProfile: async () => { deletions++; },
        })},
        "@/context/theme": {useTheme: () => ({themeColors: {}})},
        "@/services/localData": {LOCAL_PLATFORMS: []},
    });
    function findDelete(node) {
        if (node?.type === ModalButton && node.props.label === "screens.localMode.deleteProfile") return node;
        return [node?.props?.children].flat().map(child => child && findDelete(child)).find(Boolean);
    }
    findDelete(LocalModeSettings()).props.onPress();
    assert.equal(deletions, 0);
    assert.equal(buttons[0].style, "cancel");
    buttons[0].onPress?.();
    assert.equal(deletions, 0);
    assert.equal(buttons[1].style, "destructive");
    await buttons[1].onPress();
    assert.equal(deletions, 1);
});

test("IGDB uses SecureStore and reuses the Twitch token for direct catalog requests", async context => {
    let keychain = null;
    const saved = [];
    const api = load("services/igdbApi.ts", {"expo-secure-store": {
        AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY: 4,
        getItemAsync: async () => keychain,
        setItemAsync: async (key, value, options) => { keychain = value; saved.push({key, options}); },
    }});
    const requests = [];
    context.mock.method(globalThis, "fetch", async (url, init) => {
        requests.push({url, init});
        if (url === "https://id.twitch.tv/oauth2/token") return Response.json({access_token: "fake-token", expires_in: 3600});
        return Response.json([{
            id: 71, name: "Catalog Game", cover: {image_id: "ab12"}, aggregated_rating: 85.5,
            age_ratings: [
                {organization: {id: 1, name: "PEGI"}, rating_category: {id: 3, rating: "18"}},
                {organization: {id: 24, name: "ESRB"}, rating_category: {id: 103, rating: "Everyone 10+"}},
            ],
        }]);
    });
    await assert.rejects(api.searchIgdbGames("test"), api.IgdbCredentialsMissing);
    assert.equal(requests.length, 0);
    await api.saveIgdbCredentials(" test-id ", " test-secret ");
    assert.equal(saved[0].options.keychainAccessible, 4);
    assert.equal(await api.hasIgdbCredentials(), true);
    const response = await api.searchIgdbGames('A "game"');
    await api.searchIgdbGames("Another");
    assert.equal(response.results[0].id, "igdb-71");
    assert.equal(response.results[0].igdb_rating, 86);
    assert.ok(!("metacritic" in response.results[0]));
    assert.equal(response.results[0].esrb_rating.name, "Everyone 10+");
    assert.equal(response.results[0].background_image, "https://images.igdb.com/igdb/image/upload/t_cover_big/ab12.jpg");
    assert.equal(requests.length, 3);
    assert.equal(requests[0].url, "https://id.twitch.tv/oauth2/token");
    assert.equal(new URLSearchParams(requests[0].init.body).get("client_secret"), "test-secret");
    for (const request of requests.slice(1)) {
        assert.equal(request.url, "https://api.igdb.com/v4/games");
        assert.equal(request.init.headers.Authorization, "Bearer fake-token");
        assert.match(request.init.body, /age_ratings\.organization\.name/);
        assert.match(request.init.body, /age_ratings\.rating_category\.rating/);
        assert.ok(!request.init.body.includes("test-secret"));
    }
    assert.ok(requests[1].init.body.startsWith('search "A \\"game\\"";'));
});

function findElement(node, matches) {
    if (!node || typeof node !== "object") return undefined;
    if (matches(node)) return node;
    return [node.props?.children].flat().map(child => findElement(child, matches)).find(Boolean);
}

test("A referenced IGDB game can only be added after its details load successfully", async () => {
    const mount = (type, props) => ({type, props});
    const hooks = [];
    let index = 0;
    const requests = [];
    const pushed = [];
    const {default: Details} = load("app/(tabs)/search/rawg-details.tsx", {
        react: {
            useState: initial => {
                const hook = hooks[index++] ??= {value: initial};
                return [hook.value, update => { hook.value = typeof update === "function" ? update(hook.value) : update; }];
            },
            useEffect: (effect, deps) => {
                const slot = index++;
                if (hooks[slot]?.deps.every((value, i) => value === deps[i])) return;
                hooks[slot]?.cleanup?.();
                hooks[slot] = {deps, cleanup: effect()};
            },
        },
        "react/jsx-runtime": {jsx: mount, jsxs: mount, Fragment: "fragment"},
        "react-native": {Pressable: "pressable", StyleSheet: {create: value => value}, useWindowDimensions: () => ({width: 400})},
        "expo-router": {
            Stack: {Screen: "screen"}, useRouter: () => ({push: value => pushed.push(value)}),
            useSegments: () => ["(tabs)", "search"],
            useLocalSearchParams: () => ({game: JSON.stringify({id: "igdb-72", name: "Sequel"})}),
        },
        "expo-image": {},
        "expo-symbols": {},
        "react-i18next": {useTranslation: () => ({t: key => key})},
        "@/context/localMode": {useGamePresentation: () => ({isLocal: true, imageUrl: value => value})},
        "@/context/theme": {useTheme: () => ({themeColors: {}})},
        "@/components/ImageGallery": {},
        "@/services/gamesApi": {},
        "@/services/igdbApi": {
            getIgdbGame: () => new Promise((resolve, reject) => requests.push({resolve, reject})),
            getIgdbSeries: async () => [],
        },
        "@/hooks/useUserGames": {useUserGames: () => ({games: []})},
    });
    const render = () => { index = 0; return Details(); };
    const button = (tree, label) => findElement(tree, node => node.type === "pressable"
        && findElement(node, child => child.props?.children === label));

    const initial = render();
    assert.equal(button(initial, "addGame.title"), undefined);
    requests[0].reject(new Error("offline"));
    await Promise.resolve();
    const failed = render();
    assert.equal(button(failed, "addGame.title"), undefined);
    button(failed, "screens.localMode.retry").props.onPress();
    assert.equal(button(render(), "addGame.title"), undefined);
    requests[1].resolve({
        id: "igdb-72", name: "Sequel", released: "2018-02-03", publishers: [{name: "Studio"}],
        short_screenshots: [{image: "https://images.example/shot.jpg"}], igdb_rating: 86,
    });
    await Promise.resolve();
    button(render(), "addGame.title").props.onPress();
    const game = JSON.parse(pushed[0].params.game);
    assert.equal(game.metacriticScore, 86);
    assert.equal(game.releaseDate, "2018-02-03");
    assert.equal(game.publisher, "Studio");
    assert.deepEqual(game.screenshot_urls, ["https://images.example/shot.jpg"]);
});

test("A local game edit saves by database ID when the catalog ID is empty", async () => {
    const element = (type, props) => ({type, props});
    const updates = [];
    const alerts = [];
    const {default: ModalEdit} = load("app/(modals)/modalEdit.tsx", {
        react: {useState: initial => [Array.isArray(initial) ? ["new-group"] : initial, () => {}]},
        "react/jsx-runtime": {jsx: element, jsxs: element},
        "react-native": {Alert: {alert: title => alerts.push(title)}, Platform: {OS: "test"}, StyleSheet: {create: value => value}},
        "expo-router": {
            useLocalSearchParams: () => ({game: JSON.stringify({db_id: "local-id", game_id: "", title: "Mirrored game"})}),
            useRouter: () => ({}),
        },
        "expo-symbols": {},
        "expo-haptics": {},
        "@react-native-community/datetimepicker": {},
        "react-i18next": {useTranslation: () => ({t: key => key})},
        "@/context/localMode": {useLocalMode: () => ({activeSource: "local", document: {platforms: []}})},
        "@/context/theme": {useTheme: () => ({themeColors: {}})},
        "@/components/AccountModal": {},
        "@/components/SelectMenu": {},
        "@/hooks/useUserGames": {useUserGames: () => ({updateGame: async (...args) => updates.push(args)})},
        "@/context/GroupsContext": {useGroups: () => ({groups: [], getGroupsForGame: () => [{id: "old-group"}]})},
        "@/common/StatusCommons": {GAME_STATUSES: [], STATUS_CONFIG: {}},
        "@/common/ProgressSources": {PROGRESS_MODES: []},
    });
    findElement(ModalEdit(), node => node.props?.accessibilityLabel === "editGame.saveA11y").props.onPress();
    await Promise.resolve();
    assert.equal(updates[0][0], "local-id");
    assert.deepEqual(updates[0][2], {add: ["new-group"], remove: ["old-group"]});
    assert.deepEqual(alerts, ["editGame.savedTitle"]);
});

test("Cloud client starts lazily and its transport is unavailable in local mode", async context => {
    let active = false;
    let created = 0;
    let transport;
    let networkCalls = 0;
    context.mock.method(globalThis, "fetch", async () => { networkCalls++; return Response.json({}); });
    const {supabase} = load("services/supabase.ts", {
        "@supabase/supabase-js": {createClient: (_url, _key, options) => {
            created++;
            transport = options.global.fetch;
            return {from: table => table};
        }},
        "@/context/settings": {isCloudSourceAvailable: () => active},
        "./authSession": {},
        "@react-native-async-storage/async-storage": {},
        "@/constants/env": {SUPABASE_URL: "https://test.invalid", SUPABASE_ANON_KEY: "fake"},
    });
    assert.equal(created, 0);
    assert.throws(() => supabase.from("games"), /cloudUnavailable/);
    assert.equal(created, 0);
    active = true;
    assert.equal(supabase.from("games"), "games");
    assert.equal(supabase.from("groups"), "groups");
    assert.equal(created, 1);
    await transport("https://test.invalid");
    active = false;
    await assert.rejects(transport("https://test.invalid"), /cloudUnavailable/);
    assert.equal(networkCalls, 1);
});

test("The local-mode switch opens credential setup once and restores the selected profile", async () => {
    const storage = new Map();
    const asyncStorage = {
        getItem: async key => storage.get(key) ?? null,
        multiGet: async keys => keys.map(key => [key, storage.get(key) ?? null]),
        setItem: async (key, value) => { storage.set(key, value); },
        multiSet: async pairs => { for (const [key, value] of pairs) storage.set(key, value); },
    };
    async function mount() {
        const hooks = [];
        let index = 0;
        const {SettingsProvider, isCloudSourceAvailable} = load("context/settings.tsx", {
            "@react-native-async-storage/async-storage": {__esModule: true, default: asyncStorage},
            "@/utils/i18n": {getCurrentLanguage: () => "en", changeLanguage: () => {}},
            "react/jsx-runtime": {jsx: (_type, props) => props},
            react: {
                createContext: () => ({Provider: "settings"}),
                useState: initial => {
                    const i = index++;
                    hooks[i] ??= {value: initial};
                    return [hooks[i].value, value => { hooks[i].value = value; }];
                },
                useRef: initial => hooks[index++] ??= {current: initial},
                useEffect: effect => { hooks[index++] ??= {cleanup: effect()}; },
                useCallback: callback => callback,
                useMemo: factory => factory(),
            },
        });
        const render = () => {
            index = 0;
            return SettingsProvider({children: null}).value;
        };
        render();
        await Promise.resolve();
        return {render, isCloudSourceAvailable};
    }
    const first = await mount();
    assert.equal(first.render().activeSource, "cloud");
    assert.equal(await first.render().setLocalModeEnabled(true), true);
    await first.render().setActiveSource("local");
    assert.equal(first.render().activeSource, "local");
    assert.equal(first.isCloudSourceAvailable(), false);
    const restarted = await mount();
    assert.equal(restarted.render().localModeEnabled, true);
    assert.equal(restarted.render().activeSource, "local");
    await restarted.render().setLocalModeEnabled(false);
    assert.equal(restarted.render().activeSource, "cloud");
    assert.equal(storage.get("activeSource"), "cloud");
    assert.equal(await restarted.render().setLocalModeEnabled(true), false);
});
