const assert = require("node:assert/strict");
const {readFileSync} = require("node:fs");
const {join} = require("node:path");
const {test} = require("node:test");
const ts = require("typescript");

function load(path, imports) {
    const source = readFileSync(join(__dirname, "..", path), "utf8");
    const {outputText} = ts.transpileModule(source, {compilerOptions: {module: ts.ModuleKind.CommonJS}});
    const module = {exports: {}};
    new Function("require", "module", "exports", outputText)(name => {
        assert.ok(name in imports, `Unexpected import: ${name}`);
        return imports[name];
    }, module, module.exports);
    return module.exports;
}

const rows = load("services/userGameRows.ts", {});

function fixture(context) {
    const store = load("services/gamesCache.ts", {"@/services/userGameRows": rows});
    const user = "user-id";
    const events = new Map();
    const queries = [];
    let status;
    let removed = false;
    const channel = {
        on: (_, options, callback) => { events.set(options.event, {options, callback}); },
        subscribe: callback => { status = callback; },
    };
    const database = {
        from(table) {
            assert.equal(table, "games");
            return {select(columns, options) {
                assert.equal(columns, rows.USER_GAME_COLUMNS);
                assert.deepEqual(options, {count: "exact"});
                return {eq(column, id) {
                    assert.equal(column, "user_id");
                    assert.equal(id, user);
                    return {order(key) {
                        assert.equal(key, "id");
                        return {range(from, to) {
                            assert.equal(to - from, 999);
                            return {abortSignal: signal => new Promise(resolve => queries.push({from, resolve, signal}))};
                        }};
                    }};
                }};
            }};
        },
        channel: (_topic, options) => {
            assert.deepEqual(options, {config: {postgres_changes_options: {wait: true}}});
            return channel;
        },
        removeChannel: async current => {
            assert.equal(current, channel);
            removed = true;
        },
    };
    const loadGames = options => store.loadGames(database, user, options);
    const tick = async () => { await Promise.resolve(); };
    const subscribe = () => {
        const cleanup = store.subscribeToGames(database, user, force => { void loadGames({force, silent: force}); });
        context.after(cleanup);
        return cleanup;
    };
    const row = (id, title = id) => ({id, game_api_id: `api-${id}`, title});
    const reply = (query, data, count = data.length) => query.resolve({data, count, error: null});
    return {store, user, events, queries, loadGames, tick, subscribe, setStatus: next => status(next), removed: () => removed, row, reply};
}

test("Games requests share one promise and expire after five minutes", async context => {
    const {queries, loadGames, tick, row, reply} = fixture(context);
    context.mock.timers.enable({apis: ["Date"], now: 0});
    const first = loadGames();
    assert.equal(loadGames({force: true}), first);
    await tick();
    assert.equal(queries.length, 1);
    reply(queries[0], [row("1")]);
    assert.equal(await first, true);

    context.mock.timers.setTime(299_999);
    assert.equal(await loadGames(), false);
    assert.equal(queries.length, 1);
    context.mock.timers.setTime(300_000);
    const expired = loadGames();
    await tick();
    assert.equal(queries.length, 2);
    reply(queries[1], [row("1")]);
    await expired;
});

test("Invalidation during a multi-page request retries and publishes only current results", async context => {
    const {store, user, queries, loadGames, tick, row, reply} = fixture(context);
    const pending = loadGames();
    await tick();
    reply(queries[0], Array.from({length: 1000}, (_, index) => row(String(index))), 1001);
    await tick();
    assert.equal(queries[1].from, 1000);
    assert.equal(store.invalidateGames(user), false);
    reply(queries[1], [], 1000);
    await tick();
    assert.equal(queries[2].from, 0);
    assert.deepEqual(store.getGamesSnapshot(user).games, []);
    reply(queries[2], [row("current")]);
    assert.equal(await pending, true);
    assert.deepEqual(store.getGamesSnapshot(user).games.map(game => game.title), ["current"]);
});

test("Realtime gates freshness and reconnects silently; unknown deletes leave an idle cache alone", async context => {
    const {store, user, queries, events, loadGames, tick, subscribe, setStatus, row, reply} = fixture(context);
    context.mock.timers.enable({apis: ["Date"], now: 0});
    subscribe();
    setStatus("SUBSCRIBED");
    const initial = loadGames();
    await tick();
    assert.equal(queries.length, 1);
    reply(queries[0], [row("1")]);
    await initial;
    assert.equal(events.get("INSERT").options.filter, "user_id=eq.user-id");
    assert.equal(events.get("UPDATE").options.filter, "user_id=eq.user-id");
    assert.ok(store.getFreshGames(user));
    context.mock.timers.setTime(60_000);
    assert.equal(store.needsForegroundRefresh(user), false);
    setStatus("CHANNEL_ERROR");
    assert.equal(store.getFreshGames(user), null);
    assert.equal(store.needsForegroundRefresh(user), true);
    setStatus("SUBSCRIBED");
    const reconnect = loadGames();
    await tick();
    assert.equal(queries.length, 2);
    assert.equal(store.getGamesSnapshot(user).isLoading, false);
    reply(queries[1], [row("1")]);
    await reconnect;

    const {callback: deleted} = events.get("DELETE");
    deleted({old: {id: "other-users-game"}});
    await tick();
    assert.equal(queries.length, 2);
    deleted({old: {id: "1"}});
    const changed = loadGames();
    await tick();
    assert.equal(queries.length, 3);
    reply(queries[2], []);
    await changed;
});

test("A delete invalidates the first read before the deleted row reaches the cache", async context => {
    const {store, user, queries, events, loadGames, tick, subscribe, setStatus, row, reply} = fixture(context);
    subscribe();
    setStatus("SUBSCRIBED");
    const initial = loadGames();
    await tick();
    events.get("DELETE").callback({old: {id: "removed"}});
    reply(queries[0], [row("removed")]);
    await tick();
    assert.equal(queries.length, 2);
    assert.equal(store.getGamesSnapshot(user).hasLoaded, false);
    reply(queries[1], []);
    assert.equal(await initial, true);
    assert.deepEqual(store.getGamesSnapshot(user).games, []);
});

test("Unrelated deletes do not restart a pending library read", async context => {
    const {store, user, queries, events, loadGames, tick, subscribe, setStatus, row, reply} = fixture(context);
    subscribe();
    setStatus("SUBSCRIBED");
    const initial = loadGames();
    await tick();
    events.get("DELETE").callback({old: {id: "other-account"}});
    reply(queries[0], [row("mine")]);
    await tick();
    assert.equal(queries.length, 1);
    assert.equal(await initial, true);
    assert.deepEqual(store.getGamesSnapshot(user).games.map(game => game.db_id), ["mine"]);
});

test("The fallback read is revalidated once Postgres changes are ready", async context => {
    const {store, user, queries, loadGames, tick, subscribe, setStatus, row, reply} = fixture(context);
    context.mock.timers.enable({apis: ["setTimeout"]});
    subscribe();
    context.mock.timers.tick(600);
    const fallback = loadGames();
    await tick();
    reply(queries[0], []);
    await fallback;
    assert.equal(store.getFreshGames(user), null);

    setStatus("SUBSCRIBED");
    const revalidation = loadGames();
    await tick();
    assert.equal(queries.length, 2);
    reply(queries[1], [row("new")]);
    await revalidation;
    assert.equal(store.getFreshGames(user)[0].db_id, "new");
});

test("Foregrounding retries a failed first read even while Realtime is connected", async context => {
    const {store, user, queries, loadGames, tick, subscribe, setStatus, reply} = fixture(context);
    context.mock.method(console, "error", () => {});
    subscribe();
    setStatus("SUBSCRIBED");
    const initial = loadGames();
    assert.equal(store.needsForegroundRefresh(user), false);
    await tick();
    queries[0].resolve({data: null, count: null, error: {message: "unavailable"}});
    assert.equal(await initial, false);
    assert.equal(store.needsForegroundRefresh(user), true);

    const retry = loadGames({force: true, silent: true});
    await tick();
    reply(queries[1], []);
    assert.equal(await retry, true);
    assert.equal(store.needsForegroundRefresh(user), false);
});

test("Foregrounding retries an invalidated snapshot whose refresh failed", async context => {
    const {store, user, events, queries, loadGames, tick, subscribe, setStatus, row, reply} = fixture(context);
    context.mock.method(console, "error", () => {});
    subscribe();
    setStatus("SUBSCRIBED");
    const initial = loadGames();
    await tick();
    reply(queries[0], [row("mine")]);
    await initial;

    events.get("DELETE").callback({old: {id: "mine"}});
    const refresh = loadGames();
    await tick();
    queries[1].resolve({data: null, count: null, error: {message: "unavailable"}});
    assert.equal(await refresh, false);
    assert.equal(store.getGamesSnapshot(user).hasLoaded, true);
    assert.equal(store.needsForegroundRefresh(user), true);
});

test("Optimistic writes roll back individually and a confirmed write ignores its realtime echo", async context => {
    const {store, user, queries, events, loadGames, tick, subscribe, setStatus, row, reply} = fixture(context);
    subscribe();
    setStatus("SUBSCRIBED");
    const initial = loadGames();
    await tick();
    reply(queries[0], [row("1", "First")]);
    await initial;

    const update = title => games => games.map(game => ({...game, title}));
    let rejectWrite;
    const failed = store.writeGames(user, update("Pending"), () => new Promise((_, reject) => { rejectWrite = reject; }));
    assert.equal(store.getGamesSnapshot(user).games[0].title, "Pending");
    await tick();
    rejectWrite(new Error("write failed"));
    await assert.rejects(failed, /write failed/);
    assert.equal(store.getGamesSnapshot(user).games[0].title, "First");

    const confirmed = row("1", "Saved");
    const saved = store.writeGames(user, update("Saved"), async () => {
        events.get("UPDATE").callback({new: confirmed});
        return () => [rows.supabaseRowToGame(confirmed)];
    });
    await saved;
    events.get("UPDATE").callback({new: confirmed});
    assert.equal(store.getGamesSnapshot(user).games[0].title, "Saved");
    assert.equal(queries.length, 1);
});

test("Cleanup clears the user cache and discards an outstanding request", async context => {
    const {store, user, queries, loadGames, tick, subscribe, setStatus, removed, row, reply} = fixture(context);
    const cleanup = subscribe();
    setStatus("SUBSCRIBED");
    const pending = loadGames();
    await tick();
    cleanup();
    assert.equal(queries[0].signal.aborted, true);
    assert.equal(removed(), true);
    reply(queries[0], [row("1")]);
    assert.equal(await pending, false);
    assert.equal(store.getGamesSnapshot(user), undefined);
});
