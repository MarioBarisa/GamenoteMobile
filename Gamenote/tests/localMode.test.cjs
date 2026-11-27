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

test("Opening a cloud account without mirroring preserves the offline library", async () => {
    const {data, saved} = fixture();
    const local = await data.addLocalGame(game("Offline game"));
    await data.setLocalProfile({name: "Local profile", profileUrl: "https://images.example/avatar.png"});
    await data.createLocalGroup({name: "Local group", rating: null, type: "collection"}, [local.db_id]);
    await data.setLocalPlatforms(platforms => [...platforms, "Steam Deck"]);
    let reads = 0;
    const mirror = mirrorFixture(data, async () => {
        reads++;
        return {data: [], error: null};
    });

    const original = saved();
    await mirror.syncLocalMirror("my-account", () => true);
    assert.equal(reads, 0);
    assert.deepEqual(saved(), original);

    await mirror.syncLocalMirror("my-account", () => true, {name: "Cloud profile", profileUrl: ""});
    assert.ok(reads > 0);
    const afterOptIn = saved();
    const previousReads = reads;
    await mirror.syncLocalMirror("different-account", () => true);
    assert.equal(reads, previousReads);
    assert.deepEqual(saved(), afterOptIn);
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
        "@/components/ScreenViewport": {ScreenViewport: "viewport", ScreenScrollView: "scroll"},
        "@/constants/layout": {screenContent: {}},
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
    if (Array.isArray(node)) return node.map(child => findElement(child, matches)).find(Boolean);
    if (matches(node)) return node;
    return findElement(node.props?.children, matches);
}

test("Manual local entry saves poster and screenshot URLs without a catalog description", async () => {
    const {data, saved} = fixture();
    const hooks = [];
    const alerts = [];
    let index = 0;
    let params = {};
    const element = (type, props) => ({type, props});
    const {default: AddGame} = load("app/(modals)/addGameModal.tsx", {
        react: {
            useState: initial => {
                const slot = index++;
                const hook = hooks[slot] ?? (hooks[slot] = {value: initial});
                return [hook.value, update => { hook.value = typeof update === "function" ? update(hook.value) : update; }];
            },
            useRef: initial => {
                const slot = index++;
                return hooks[slot] ?? (hooks[slot] = {current: initial});
            },
        },
        "react/jsx-runtime": {jsx: element, jsxs: element},
        "react-native": {Alert: {alert: (...args) => alerts.push(args)}, Platform: {OS: "test"}, StyleSheet: {create: value => value}},
        "expo-router": {useLocalSearchParams: () => params, useRouter: () => ({})},
        "expo-symbols": {},
        "expo-clipboard": {ClipboardPasteButton: "paste", isPasteButtonAvailable: true},
        "expo-haptics": {},
        "@react-native-community/datetimepicker": {},
        "react-i18next": {useTranslation: () => ({t: (key, options) => options?.number ? `${key} ${options.number}` : key})},
        "@/constants/layout": {screenContent: {}},
        "@/context/theme": {useTheme: () => ({themeColors: {}})},
        "@/context/localMode": {useLocalMode: () => ({activeSource: "local", document: {platforms: ["PC"]}})},
        "@/context/GroupsContext": {useGroups: () => ({groups: []})},
        "@/components/AccountModal": {ModalInput: "field"},
        "@/components/LocalImageLinkInput": {__esModule: true, default: "image-field"},
        "@/components/SelectMenu": {__esModule: true, default: "menu"},
        "@/hooks/useUserGames": {useUserGames: () => ({addGame: data.addLocalGame})},
        "@/services/localData": data,
        "@/common/StatusCommons": {GAME_STATUSES: ["playing"], STATUS_CONFIG: {playing: {label: "Playing"}}},
        "@/common/ProgressSources": {PROGRESS_MODES: [], PLATFORM_PROGRESS_MODE: {}},
    });
    const render = () => { index = 0; return AddGame(); };
    const field = key => findElement(render(), node => node.type === "field" && node.props.accessibilityLabel === key);
    const imageField = label => findElement(render(), node => node.type === "image-field" && node.props.label === label);
    const action = label => findElement(render(), node => node.props?.accessibilityLabel === label).props.onPress;
    const select = (label, value) => findElement(render(), node => node.type === "menu" && node.props.label === label).props.onSelect(value);
    const submit = () => action("addGame.addButton")();

    assert.equal(findElement(render(), node => node.props?.children === "addGame.includeDescription"), undefined);
    field("screens.localMode.gameTitle").props.onChangeText("Local cover test");
    select("editGame.platformDefault", "PC");
    select("editGame.statusDefault", "playing");
    imageField("screens.localMode.posterUrl").props.onChangeText("  https://images.example/poster.jpg ");
    imageField("screens.localMode.screenshotUrl 1").props.onChangeText("https://api.gamenote.eu/hidden.jpg");
    submit();
    assert.equal(alerts.at(-1)[1], "screens.localMode.invalidGameImageUrl");
    assert.equal((await data.loadLocalData()).games.length, 0);

    imageField("screens.localMode.screenshotUrl 1").props.onRemove();
    action("screens.localMode.addScreenshot")();
    imageField("screens.localMode.screenshotUrl 1").props.onChangeText("https://images.example/one.jpg");
    action("screens.localMode.pasteScreenshots")({type: "text", text: "\n https://images.example/two.jpg\r\nhttps://images.example/one.jpg"});
    assert.equal(imageField("screens.localMode.screenshotUrl 2").props.value, "https://images.example/two.jpg");
    assert.equal(imageField("screens.localMode.screenshotUrl 3").props.value, "https://images.example/one.jpg");
    submit();
    await data.loadLocalData();
    assert.equal(saved().games[0].image_url, "https://images.example/poster.jpg");
    assert.deepEqual(saved().games[0].screenshot_urls, ["https://images.example/one.jpg", "https://images.example/two.jpg"]);
    assert.equal(saved().games[0].about, "");

    params = {game: JSON.stringify({title: "From IGDB", game_id: "igdb-71"})};
    assert.equal(imageField("screens.localMode.posterUrl"), undefined);
    assert.ok(findElement(render(), node => node.props?.children === "addGame.includeDescription"));
});

test("Image links are marked loaded only after Expo Image decodes them", context => {
    context.mock.timers.enable({apis: ["setTimeout"]});
    const {data} = fixture();
    const hooks = [];
    const element = (type, props, key) => ({type, props, key});
    let index = 0;
    const {default: LocalImageLinkInput} = load("components/LocalImageLinkInput.tsx", {
        react: {
            useState: initial => {
                const slot = index++;
                const hook = hooks[slot] ?? (hooks[slot] = {value: initial});
                return [hook.value, value => { hook.value = value; }];
            },
            useEffect: effect => {
                const slot = index++;
                if (!hooks[slot]) hooks[slot] = {cleanup: effect()};
            },
        },
        "react/jsx-runtime": {jsx: element, jsxs: element},
        "react-native": {
            ActivityIndicator: "spinner", Pressable: "button", Text: "text", View: "view",
            StyleSheet: {create: value => value},
        },
        "expo-image": {Image: "image"},
        "expo-symbols": {SymbolView: "symbol"},
        "react-i18next": {useTranslation: () => ({t: key => key})},
        "@/components/AccountModal": {ModalInput: "field"},
        "@/context/theme": {useTheme: () => ({themeColors: {}})},
        "@/services/localData": data,
    });
    const input = value => LocalImageLinkInput({label: "Poster", value, onChangeText() {}, poster: true});
    const message = (node, key) => findElement(node, item => item.type === "text" && item.props.children === `screens.localMode.${key}`);
    const preview = value => findElement(input(value), item => item.props?.url);
    assert.ok(message(input("invalid"), "invalidGameImageUrl"));
    assert.equal(preview(""), undefined);

    const first = preview("https://images.example/poster");
    const render = () => { index = 0; return first.type(first.props); };
    assert.ok(message(render(), "imageLinkLoading"));
    assert.equal(findElement(render(), node => node.type === "image"), undefined);
    context.mock.timers.tick(600);
    findElement(render(), node => node.type === "image").props.onError();
    assert.ok(message(render(), "imageLinkFailed"));
    findElement(render(), node => node.type === "button").props.onPress();
    findElement(render(), node => node.type === "image").props.onLoad();
    assert.ok(message(render(), "imageLinkLoaded"));
    assert.notEqual(preview("https://images.example/another").key, first.key);
});

test("The game grid uses the measured viewport and keeps the visible game when it reflows", () => {
    const hooks = [];
    let index = 0;
    const element = (type, props) => ({type, props});
    const {default: GameLibraryList} = load("components/GameLibraryList.tsx", {
        react: {
            createElement: (type, props) => element(type, props),
            useState: initial => {
                const slot = index++;
                const hook = hooks[slot] ?? (hooks[slot] = {value: initial});
                return [hook.value, value => { hook.value = value; }];
            },
            useRef: initial => {
                const slot = index++;
                return hooks[slot] ?? (hooks[slot] = {current: initial});
            },
            useCallback: callback => callback,
        },
        "react/jsx-runtime": {jsx: element, jsxs: element, Fragment: "fragment"},
        "react-native": {
            FlatList: "list", View: "view", StyleSheet: {create: value => value},
            useWindowDimensions: () => ({width: 460}),
        },
        "react-native-safe-area-context": {SafeAreaView: "safe-area", useSafeAreaInsets: () => ({left: 0, right: 60})},
        "@/context/theme": {useTheme: () => ({themeColors: {}})},
        "@/components/GameCard": {__esModule: true, default: "full-card"},
        "@/components/GameCardCompact": {__esModule: true, default: "compact-card"},
        "@/components/GameCardSkeleton": {},
    });
    const games = Array.from({length: 30}, (_, i) => game(String(i), {db_id: String(i)}));
    const render = () => { index = 0; return GameLibraryList({games, compact: true, onDelete: async () => {}}); };
    const list = node => findElement(node, item => item.type === "list").props;
    const first = render();
    assert.equal(list(first).numColumns, 2);
    assert.equal(list(first).renderItem({item: games[0]}).props.width, 178);
    list(first).onViewableItemsChanged({viewableItems: [{key: games[11].db_id}]});
    first.props.children.props.onLayout({nativeEvent: {layout: {width: 800}}});
    const wide = list(render());
    assert.equal(wide.numColumns, 4);
    assert.equal(wide.initialScrollIndex, 2);
    assert.equal(wide.renderItem({item: games[0]}).props.width, 183);
    const calls = [];
    wide.ref.current = {scrollToOffset: options => calls.push(options), scrollToIndex: options => calls.push(options)};
    wide.onScrollToIndexFailed({index: 2, averageItemLength: 200});
    wide.CellRendererComponent({index: 1}).props.onLayout({});
    assert.deepEqual(calls, [{offset: 400, animated: false}]);
    wide.CellRendererComponent({index: 2, onLayout: () => calls.push("measured")}).props.onLayout({});
    assert.deepEqual(calls, [{offset: 400, animated: false}, "measured", {index: 2, animated: false}]);
});

test("Jump Back In keeps the original iPhone layout and fits artwork to Duo and iPad", () => {
    const platform = {OS: "ios", isPad: false};
    let dimensions = {width: 440, height: 956};
    let rail;
    let stateIndex = 0;
    const states = [];
    const element = (type, props) => ({type, props});
    const {default: Home} = load("app/(tabs)/home/index.tsx", {
        react: {
            useState: initial => {
                const slot = stateIndex++;
                const state = states[slot] ?? (states[slot] = {value: initial});
                return [state.value, value => { state.value = value; }];
            },
            useMemo: callback => callback(),
            useCallback: callback => callback,
        },
        "react/jsx-runtime": {jsx: element, jsxs: element},
        "react-native": {Platform: platform, StyleSheet: {create: value => value}, useWindowDimensions: () => dimensions},
        "expo-image": {Image: "poster"},
        "expo-status-bar": {useVerticalBarEdgeIOS: () => rail},
        "expo-haptics": {},
        "expo-symbols": {},
        "expo-router": {},
        "react-i18next": {useTranslation: () => ({t: key => key})},
        "@/components/GameLibraryList": {__esModule: true, default: "library"},
        "@/context/localMode": {useGamePresentation: () => ({imageUrl: value => value})},
        "@/context/theme": {useTheme: () => ({themeColors: {}})},
        "@/context/settings": {useSettings: () => ({compactCards: false})},
        "@/hooks/useUserGames": {useUserGames: () => ({games: [{status: "paused", image_url: "cover"}]})},
        "@/common/StatusCommons": {STATUS_CONFIG: {paused: {label: "Paused"}}},
    });
    function render() {
        stateIndex = 0;
        const card = Home().props.ListFooterComponent;
        return {card, image: findElement(card, item => item.type === "poster").props};
    }
    const original = render();
    assert.equal(original.image.contentFit, "cover");
    assert.deepEqual(original.image.style[1], {aspectRatio: 15 / 16, maxWidth: 400});
    assert.equal(original.card.props.onLayout, undefined);

    dimensions = {width: 466, height: 678};
    rail = "trailing";
    const duo = render();
    assert.equal(duo.image.contentFit, "contain");
    duo.image.onLoad({source: {width: 600, height: 400}});
    const {width, height} = render().image.style[1];
    assert.equal(width / height, 1.5);

    dimensions = {width: 669, height: 951};
    rail = null;
    assert.equal(render().image.contentFit, "contain");
    platform.isPad = true;
    dimensions = {width: 430, height: 900};
    assert.equal(render().image.contentFit, "contain");
    platform.isPad = false;
    assert.equal(render().image.contentFit, "cover");
});

test("Resizing the screenshot carousel restores the selected page after content layout", () => {
    let width = 0;
    let refIndex = 0;
    const refs = [];
    const offsets = [];
    const element = (type, props) => ({type, props});
    const {default: ScreenshotCarousel} = load("components/ScreenshotCarousel.tsx", {
        react: {
            useState: () => [width, value => { width = value; }],
            useRef: value => {
                const slot = refIndex++;
                return refs[slot] ?? (refs[slot] = {current: value});
            },
        },
        "react/jsx-runtime": {jsx: element},
        "react-native": {ScrollView: "scroll", Pressable: "button", StyleSheet: {create: value => value}},
        "expo-image": {Image: "image"},
        "react-i18next": {useTranslation: () => ({t: key => key})},
    });
    const render = () => {
        refIndex = 0;
        return ScreenshotCarousel({images: ["first", "second", "third"], isLocal: true, onOpen() {}}).props;
    };
    const layout = value => ({nativeEvent: {layout: {width: value}}});
    const carousel = render();
    carousel.ref.current = {scrollTo: options => offsets.push(options)};
    carousel.onLayout(layout(400));
    render().onContentSizeChange(3 * 392 + 8);
    render().onMomentumScrollEnd({nativeEvent: {layoutMeasurement: {width: 400}, contentOffset: {x: 784}}});
    carousel.onLayout(layout(600));
    const resized = render();
    resized.onContentSizeChange(3 * 392 + 8);
    assert.equal(offsets.length, 1);
    resized.onContentSizeChange(3 * 592 + 8);
    assert.deepEqual(offsets.at(-1), {x: 1184, animated: false});
});

test("Search hides results from the previous profile before the new catalog responds", async context => {
    let activeSource = "cloud";
    let effect;
    let hookIndex = 0;
    const hooks = [];
    const element = (type, props) => ({type, props});
    const {default: Search} = load("app/(tabs)/search/index.tsx", {
        react: {
            useState: value => {
                const index = hookIndex++;
                const slot = hooks[index] ?? (hooks[index] = {value});
                return [slot.value, update => { slot.value = typeof update === "function" ? update(slot.value) : update; }];
            },
            useEffect: callback => { effect = callback; },
            useCallback: callback => callback,
            useMemo: callback => callback(),
        },
        "react/jsx-runtime": {Fragment: "fragment", jsx: element, jsxs: element},
        "react-native": {TouchableOpacity: "button", StyleSheet: {create: value => value}},
        "expo-image": {},
        "expo-symbols": {},
        "expo-haptics": {ImpactFeedbackStyle: {Light: "light"}, impactAsync: async () => {}},
        "expo-router": {Stack: {Screen: "header"}, useRouter: () => ({})},
        "expo-router/react-navigation": {useFocusEffect() {}},
        "react-i18next": {useTranslation: () => ({t: key => key})},
        "@/components/ScreenViewport": {ScreenFlatList: "catalog"},
        "@/components/GameLibraryList": {__esModule: true, default: "library"},
        "@/constants/layout": {screenContent: {}},
        "@/constants/theme": {colors: {light: {}}},
        "@/context/localMode": {useLocalMode: () => ({activeSource, igdbConfigured: true})},
        "@/context/auth": {useAuth: () => ({loggedIn: activeSource === "cloud"})},
        "@/context/theme": {useTheme: () => ({theme: "light"})},
        "@/context/settings": {useSettings: () => ({compactCards: false})},
        "@/hooks/useUserGames": {useUserGames: () => ({games: []})},
        "@/services/gamesApi": {searchGames: async () => ({results: [{id: 42}]})},
        "@/services/igdbApi": {searchIgdbGames: async () => ({results: [{id: "igdb-42"}]})},
    });
    const render = () => { hookIndex = 0; return Search(); };
    const catalog = () => findElement(render(), item => item.type === "catalog").props.data;
    const header = findElement(render(), item => item.type === "header").props.options;
    await header.headerRight().props.onPress();
    header.headerSearchBarOptions.onChangeText({nativeEvent: {text: "game"}});
    context.mock.timers.enable({apis: ["setTimeout"]});
    render();
    const stopCloud = effect();
    context.mock.timers.tick(400);
    await Promise.resolve();
    assert.deepEqual(catalog(), [{id: 42}]);

    activeSource = "local";
    assert.deepEqual(catalog(), []);
    stopCloud();
    const stopLocal = effect();
    context.mock.timers.tick(400);
    await Promise.resolve();
    assert.deepEqual(catalog(), [{id: "igdb-42"}]);
    stopLocal();
});

test("A referenced IGDB game can only be added after its details load successfully", async () => {
    const mount = (type, props) => ({type, props});
    const hooks = [];
    let index = 0;
    const requests = [];
    const pushed = [];
    const {default: Details} = load("app/(tabs)/search/rawg-details.tsx", {
        "@/components/ScreenViewport": {ScreenViewport: "viewport", ScreenScrollView: "scroll"},
        "@/constants/layout": {screenContent: {}},
        "@/components/ScreenshotCarousel": {},
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
        "@/constants/layout": {screenContent: {}},
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

test("Editing a deleted cloud game explains the failure without updating groups", async () => {
    const element = (type, props) => ({type, props});
    class GameNotFoundError extends Error {}
    const alerts = [];
    let closed = false;
    const {default: ModalEdit} = load("app/(modals)/modalEdit.tsx", {
        "@/constants/layout": {screenContent: {}},
        react: {useState: value => [Array.isArray(value) ? [] : value, () => {}]},
        "react/jsx-runtime": {jsx: element, jsxs: element},
        "react-native": {Alert: {alert: (...args) => alerts.push(args)}, Platform: {OS: "test"}, StyleSheet: {create: value => value}},
        "expo-router": {
            useLocalSearchParams: () => ({game: JSON.stringify({db_id: "deleted", game_id: "42", title: "Game"})}),
            useRouter: () => ({back: () => { closed = true; }}),
        },
        "expo-symbols": {}, "expo-haptics": {}, "@react-native-community/datetimepicker": {},
        "react-i18next": {useTranslation: () => ({t: key => key})},
        "@/context/localMode": {useLocalMode: () => ({activeSource: "cloud"})},
        "@/context/theme": {useTheme: () => ({themeColors: {}})},
        "@/components/AccountModal": {}, "@/components/SelectMenu": {},
        "@/hooks/useUserGames": {GameNotFoundError, useUserGames: () => ({updateGame: async () => { throw new GameNotFoundError(); }})},
        "@/context/GroupsContext": {useGroups: () => ({
            groups: [], getGroupsForGame: () => [{id: "old-group"}],
            removeGameFromGroup: () => assert.fail("Changed groups for a deleted game"),
        })},
        "@/common/StatusCommons": {GAME_STATUSES: [], STATUS_CONFIG: {}},
        "@/common/ProgressSources": {PROGRESS_MODES: []},
    });
    await findElement(ModalEdit(), node => node.props?.accessibilityLabel === "editGame.saveA11y").props.onPress();
    assert.equal(alerts.length, 1);
    assert.deepEqual(alerts[0].slice(0, 2), ["gameDetails.notFound", "editGame.gameRemoved"]);
    alerts[0][2][0].onPress();
    assert.equal(closed, true);
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
            "@/services/foilTextures": {preloadFoilTextures: () => assert.fail("TCG textures loaded while disabled")},
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
    const accountFree = await mount();
    assert.equal(accountFree.render().claimLocalModeOnboarding(), false);
    await accountFree.render().activateLocalMode();
    assert.equal(accountFree.render().activeSource, "local");
    assert.equal(accountFree.render().claimLocalModeOnboarding(), true);
    assert.equal(accountFree.render().claimLocalModeOnboarding(), false);
    const afterOnboarding = await mount();
    assert.equal(afterOnboarding.render().claimLocalModeOnboarding(), false);
    storage.clear();

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
    await restarted.render().setLocalModeEnabled(false);
    await restarted.render().activateLocalMode();
    assert.equal(restarted.render().activeSource, "local");
    assert.equal(restarted.isCloudSourceAvailable(), false);
    const reopened = await mount();
    assert.equal(reopened.render().localModeEnabled, true);
    assert.equal(reopened.render().activeSource, "local");
    await reopened.render().setActiveSource("cloud");
    assert.equal(reopened.render().localModeEnabled, true);
    assert.equal(reopened.isCloudSourceAvailable(), true);
});
