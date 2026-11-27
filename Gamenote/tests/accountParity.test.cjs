const assert = require("node:assert/strict");
const {readFileSync} = require("node:fs");
const {join} = require("node:path");
const {setTimeout: tick} = require("node:timers/promises");
const {test} = require("node:test");
const ts = require("typescript");

function load(path, imports = {}) {
    const source = readFileSync(join(__dirname, "..", path), "utf8");
    const {outputText} = ts.transpileModule(source, {
        fileName: path,
        compilerOptions: {module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX},
    });
    const module = {exports: {}};
    new Function("require", "module", "exports", outputText)(name => {
        assert.ok(name in imports, `Unexpected import: ${name}`);
        return imports[name];
    }, module, module.exports);
    return module.exports;
}

const authSession = load("services/authSession.ts");
const totp = (id, status = "verified") => ({id, status, factor_type: "totp"});
const noError = data => ({data, error: null});
const signedSession = (aal = "aal1", userId = "player", id = "session1") => ({
    user: {id: userId, email: `${userId}@example.test`},
    access_token: `header.${Buffer.from(JSON.stringify({aal, session_id: id})).toString("base64url")}.signature`,
});

function authFixture({session = signedSession(), factors = []} = {}) {
    const calls = [];
    let notify;
    const user = () => ({...session.user, factors});
    const emit = (event, next = session) => {
        session = next;
        notify?.(event, next);
    };
    const auth = {
        initialize: async () => {},
        startAutoRefresh: async () => {},
        stopAutoRefresh: async () => {},
        onAuthStateChange: callback => {
            notify = callback;
            return {data: {subscription: {unsubscribe: () => { notify = undefined; }}}};
        },
        getSession: async () => noError({session}),
        getUser: async () => noError({user: user()}),
        refreshSession: async () => {
            calls.push("refresh");
            emit("TOKEN_REFRESHED");
            return noError({session});
        },
        signOut: async params => {
            calls.push(["signOut", params]);
            emit("SIGNED_OUT", null);
            return noError({});
        },
        updateUser: async attributes => {
            calls.push(["updatePassword", attributes]);
            return noError({user: user()});
        },
        mfa: {
            enroll: async params => {
                calls.push(["enroll", params]);
                factors = [...factors, totp("mobile", "unverified")];
                return noError({id: "mobile", totp: {secret: "FAKE"}});
            },
            challenge: async params => {
                calls.push(["challenge", params]);
                return noError({id: "fresh-challenge"});
            },
            verify: async params => {
                calls.push(["verify", params]);
                if (params.code !== "012345") return {error: {code: "mfa_verification_failed"}};
                factors = factors.map(factor => factor.id === params.factorId ? {...factor, status: "verified"} : factor);
                emit("MFA_CHALLENGE_VERIFIED", signedSession("aal2", session.user.id, authSession.sessionClaims(session).session_id));
                return noError(session);
            },
            unenroll: async params => {
                calls.push(["unenroll", params]);
                factors = factors.filter(factor => factor.id !== params.factorId);
                return noError(null);
            },
        },
    };
    const client = {
        supabase: {auth},
        requireSession: async expected => {
            if (!authSession.sameSession(expected, session)) throw new Error("session");
            return session;
        },
        createPasswordCheckClient: () => ({
            auth: {
                signInWithPassword: async params => {
                    calls.push(["passwordCheck", params]);
                    return params.password === "correct" ? noError({user: user()}) : {error: {code: "invalid_credentials"}};
                },
                signOut: async params => calls.push(["signOutPasswordCheck", params]),
            },
        }),
    };
    const mfa = load("services/mfa.ts", {"./supabase": client, "./authSession": authSession});
    return {
        emit, client, mfa, calls, user,
        setFactors: next => { factors = next; },
    };
}

function mountAuth(context, fixture, source = "cloud") {
    const hooks = [];
    let index = 0;
    const react = {
        createContext: () => ({Provider: Symbol("AuthContext")}),
        useState: initial => {
            const slot = index++;
            if (!hooks[slot]) hooks[slot] = {value: initial};
            return [hooks[slot].value, value => { hooks[slot].value = value; }];
        },
        useRef: initial => hooks[index++] ??= {current: initial},
        useCallback: callback => hooks[index++] ??= callback,
        useEffect: effect => { hooks[index++] ??= {cleanup: effect()}; },
    };
    const {AuthProvider} = load("context/auth.tsx", {
        react,
        "react/jsx-runtime": {jsx: (_type, props) => props},
        "react-native": {AppState: {addEventListener: () => ({remove() {}})}},
        "@/services/supabase": fixture.client,
        "@/services/authSession": authSession,
        "@/services/mfa": fixture.mfa,
        "@/context/settings": {
            isCloudSourceAvailable: () => source === "cloud",
            useSettings: () => ({localSettingsLoaded: true, activeSource: source}),
        },
        "@/services/supabaseAuth": load("services/supabaseAuth.ts", {"./supabase": fixture.client}),
    });
    context.after(() => hooks.forEach(hook => hook.cleanup?.()));
    const render = () => {
        index = 0;
        return AuthProvider({children: null}).value;
    };
    render();
    return render;
}

async function waitForPhase(render, phase) {
    for (let attempt = 0; attempt < 50 && render().phase !== phase; attempt++) {
        await tick(10);
    }
    assert.equal(render().phase, phase);
}

test("Cold AAL1 session stays private while checking and until TOTP verification", async context => {
    const session = signedSession();
    const fixture = authFixture({session, factors: [totp("web")]});
    const render = mountAuth(context, fixture);
    assert.equal(render().phase, "starting");
    fixture.emit("INITIAL_SESSION");
    assert.equal(render().loggedIn, false);
    assert.equal(render().session, null);
    await waitForPhase(render, "mfa");
    assert.equal(render().phase, "mfa");
    assert.equal(render().user, null);
    assert.equal(render().totpFactors[0].id, "web");
    await render().verifySignIn("web", "012345");
    await waitForPhase(render, "ready");
    assert.equal(render().phase, "ready");
    assert.ok(authSession.sameSession(render().session, session));
});

test("The router blocks private deep links and tab mounts until the pending session is verified", () => {
    const element = (type, props) => ({type, props});
    const Protected = Symbol("Protected");
    const Screen = Symbol("Screen");
    const auth = {phase: "starting", loggedIn: false, user: null};
    const local = {localModeEnabled: false, activeSource: "cloud"};
    const style = {background: "white", accent: "blue"};
    const {default: RootLayout, unstable_settings} = load("app/_layout.tsx", {
        react: {useEffect() {}, useRef: value => ({current: value})},
        "react/jsx-runtime": {jsx: element, jsxs: element},
        "react-native": {ActivityIndicator: "activity", View: "view"},
        "expo-splash-screen": {preventAutoHideAsync() {}},
        "expo-router": {Stack: {Protected, Screen}},
        "react-i18next": {useTranslation: () => ({t: key => key})},
        "@/context/GroupsContext": {GroupsProvider: "groups"},
        "@/context/theme": {ThemeProvider: "theme", useTheme: () => ({themeColors: style})},
        "@/context/settings": {SettingsProvider: "settings", useSettings: () => ({tcgMode: false, tcgSettingsLoaded: true})},
        "@/context/UserGamesContext": {UserGamesProvider: "games"},
        "@/services/foilTextures": {},
        "@/context/localMode": {LocalModeProvider: "local", useLocalMode: () => local},
        "@/context/TCGMotion": {TCGMotionProvider: "motion"},
        "@/context/auth": {AuthProvider: "auth", useAuth: () => auth},
        "@/constants/navigationTheme": {useNavigationTheme: () => ({})},
        "@/components/ErrorBoundary": "boundary",
        "@/utils/i18n": {},
    });
    const rootNavigator = RootLayout().props.children.props.children.props.children.type;
    const gamesProvider = rootNavigator().props.children.props.children.props.children;
    assert.equal(gamesProvider.type, "games");
    const appContent = gamesProvider.props.children.type;
    assert.equal(appContent().type, "view");

    assert.equal(unstable_settings.anchor, "index");
    const availableRoutes = () => appContent().props.children.props.children.flatMap(child => {
        if (child.type !== Protected) return [child];
        return child.props.guard ? [child.props.children].flat() : [];
    }).filter(child => child.type === Screen);

    for (const phase of ["checking", "mfa", "error"]) {
        auth.phase = phase;
        const routes = availableRoutes();
        assert.deepEqual(routes.map(child => child.props.name), ["index", "(modals)/mfaSignInModal"]);
        assert.equal(routes[1].props.options.presentation, "modal");
    }
    auth.phase = "guest";
    assert.ok(availableRoutes().some(route => route.props.name === "(tabs)"));
    assert.ok(!availableRoutes().some(route => route.props.name === "(modals)/shareProfileModal"));
    auth.phase = "ready";
    auth.loggedIn = true;
    assert.ok(availableRoutes().some(route => route.props.name === "(tabs)"));
    const shareModal = availableRoutes().find(route => route.props.name === "(modals)/shareProfileModal");
    const totpModal = availableRoutes().find(route => route.props.name === "(modals)/totpSettingsModal");
    assert.equal(shareModal.props.options.headerShown, false);
    assert.equal(totpModal.props.options.headerShown, true);
    local.localModeEnabled = true;
    local.activeSource = "local";
    auth.phase = "guest";
    const localRoutes = availableRoutes().map(route => route.props.name);
    assert.ok(localRoutes.includes("(tabs)"));
    assert.ok(localRoutes.includes("settings/local-mode"));
    assert.ok(localRoutes.includes("(modals)/localModeOnboarding"));
    assert.ok(!localRoutes.includes("(modals)/shareProfileModal"));
    assert.ok(!localRoutes.includes("(modals)/registerModal"));
});

test("Profile switching keeps the same groups provider around navigation", () => {
    let activeSource = "cloud";
    const Provider = Symbol("groups context");
    const stack = Symbol("stack");
    const {GroupsProvider} = load("context/GroupsContext.tsx", {
        react: {
            createContext: () => ({Provider}),
            useCallback: callback => callback,
            useState: initial => [initial(), () => {}],
            useEffect() {},
        },
        "react/jsx-runtime": {jsx: (type, props) => ({type, props})},
        "@/context/localMode": {useLocalMode: () => ({activeSource, document: {groups: [{id: "offline"}], game_groups: []}})},
        "@/context/auth": {useAuth: () => ({loggedIn: false})},
        "@/constants/PLACEHOLDER_GROUPS.TSX": {MOCK_GROUPS: [{id: "demo"}], MOCK_GAME_GROUPS: []},
        "@/services/localData": {LOCAL_USER_ID: "local"},
        "@/services/supabase": {},
        "@/services/groupsApi": {},
    });

    for (const [source, id] of [["cloud", "demo"], ["local", "offline"], ["cloud", "demo"]]) {
        activeSource = source;
        const result = GroupsProvider({children: stack});
        assert.equal(result.type, Provider);
        assert.equal(result.props.children, stack);
        assert.equal(result.props.value.groups[0].id, id);
    }
});

test("Native tabs wait for a measured iOS 27 host and clear prior profile details", () => {
    let activeSource = "cloud";
    let hasLayout = false;
    const refs = [];
    let refIndex = 0;
    const actions = [];
    const navigation = {
        getRootState: () => ({routes: [{name: "(tabs)", state: {routes: [
            {state: {key: "home", routes: [{name: "index"}, {name: "details"}], index: 1}},
            {state: {key: "profile", routes: [{name: "index"}], index: 0}},
        ]}}]}),
        dispatch: action => actions.push(action),
    };
    const NativeTabs = {Trigger: {Label: "label", Icon: "icon", Badge: "badge"}};
    const jsx = (type, props) => ({type, props});
    const {default: TabsLayout} = load("app/(tabs)/_layout.tsx", {
        react: {
            useState: () => [hasLayout, value => { hasLayout = value; }],
            useRef: value => {
                const index = refIndex++;
                return refs[index] ?? (refs[index] = {current: value});
            },
            useLayoutEffect: effect => effect(),
            useEffect() {},
        },
        "react/jsx-runtime": {jsx, jsxs: jsx},
        "expo-router": {useSegments: () => ["(tabs)", "profile"], useNavigationContainerRef: () => navigation},
        "expo-router/native-tabs": {NativeTabs},
        "expo-router/react-navigation": {StackActions: {popTo: name => ({type: "POP_TO", name})}},
        "react-native": {Platform: {OS: "ios", Version: "27.1.2"}, View: "view"},
        "expo-haptics": {},
        "@/context/settings": {useSettings: () => ({activeSource, vibrationsEnabled: false})},
        "@/context/theme": {useTheme: () => ({})},
        "@/context/auth": {useAuth: () => ({loggedIn: false})},
        "react-i18next": {useTranslation: () => ({t: key => key})},
        "@react-native-async-storage/async-storage": {},
    });
    const render = () => { refIndex = 0; return TabsLayout().props; };
    render().onLayout({nativeEvent: {layout: {width: 0, height: 0}}});
    assert.equal(render().children, false);
    render().onLayout({nativeEvent: {layout: {width: 951, height: 669}}});
    assert.equal(render().children.props.minimizeBehavior, "onScrollDown");
    activeSource = "local";
    assert.equal(render().children.type, NativeTabs);
    assert.deepEqual(actions, [{type: "POP_TO", name: "index", target: "home"}]);
});

test("Returning to the cloud profile stays targeted while the router is still on the index", () => {
    let phase = "guest";
    let returnToCloudProfile = false;
    const routes = [];
    const router = {push: route => routes.push(route), replace: route => routes.push(route)};
    const {default: Index} = load("app/index.tsx", {
        react: {useCallback: callback => callback},
        "react/jsx-runtime": {jsx: (_type, props) => props},
        "react-native": {ActivityIndicator: "activity", View: "view"},
        "expo-router": {useFocusEffect: focus => focus(), useRouter: () => router},
        "@/context/auth": {useAuth: () => ({phase})},
        "@/context/localMode": {useLocalMode: () => ({
            returnToCloudProfile,
            setReturnToCloudProfile: value => { returnToCloudProfile = value; },
        })},
        "@/context/theme": {useTheme: () => ({themeColors: {}})},
    });

    Index();
    assert.deepEqual(routes, ["/(tabs)/profile"]);
    routes.length = 0;
    returnToCloudProfile = true;
    phase = "checking";
    Index();
    assert.deepEqual(routes, []);
    phase = "mfa";
    Index();
    assert.deepEqual(routes, ["/(modals)/mfaSignInModal"]);
    phase = "ready";
    Index();
    Index();
    assert.deepEqual(routes.slice(-2), ["/(tabs)/profile", "/(tabs)/profile"]);
    returnToCloudProfile = false;
    Index();
    assert.equal(routes.at(-1), "/(tabs)/home");
});

test("A cold local startup skips cloud authentication", context => {
    const fixture = authFixture();
    for (const method of ["initialize", "onAuthStateChange", "startAutoRefresh"]) {
        fixture.client.supabase.auth[method] = () => assert.fail(`Local startup called ${method}`);
    }
    const render = mountAuth(context, fixture, "local");
    assert.equal(render().phase, "guest");
    assert.equal(render().session, null);
});

test("AAL1 without verified TOTP opens the app and changing accounts clears the previous authorization", async context => {
    const fixture = authFixture({factors: [totp("draft", "unverified")]});
    const render = mountAuth(context, fixture);
    fixture.emit("INITIAL_SESSION");
    await waitForPhase(render, "ready");
    assert.equal(render().loggedIn, true);
    fixture.setFactors([totp("new-account-factor")]);
    fixture.emit("SIGNED_IN", signedSession("aal1", "other-player", "other-session"));
    assert.equal(render().session, null);
    await waitForPhase(render, "mfa");
    assert.equal(render().phase, "mfa");
    await render().cancelSignIn();
    assert.deepEqual(fixture.calls.at(-1), ["signOut", {scope: "local"}]);
    assert.equal(render().phase, "guest");
});

test("Password changes check the current password without a TOTP challenge", async context => {
    const fixture = authFixture({session: signedSession("aal2"), factors: [totp("web")]});
    const render = mountAuth(context, fixture);
    fixture.emit("INITIAL_SESSION");
    await waitForPhase(render, "ready");
    assert.equal((await render().updatePassword("new-password", "")).success, false);
    assert.equal((await render().updatePassword("new-password", "correct", () => true)).success, false);
    assert.deepEqual(fixture.calls, []);
    await assert.rejects(render().updatePassword("new-password", "wrong"), {code: "invalid_credentials"});
    assert.ok(!fixture.calls.some(([name]) => name === "updatePassword"));
    await render().updatePassword("new-password", "correct", () => fixture.calls.some(([name]) => name === "signOutPasswordCheck"));
    assert.ok(!fixture.calls.some(([name]) => name === "updatePassword"));
    assert.equal((await render().updatePassword("new-password", "correct")).success, true);
    assert.deepEqual(fixture.calls.slice(-3), [
        ["passwordCheck", {email: "player@example.test", password: "correct"}],
        ["signOutPasswordCheck", {scope: "local"}],
        ["updatePassword", {password: "new-password", current_password: "correct"}],
    ]);
    assert.ok(!fixture.calls.some(([name]) => name === "challenge" || name === "verify" || name === "signOut"));
});

test("Recovery uses the AAL1 token, refreshes and checks any remaining TOTP factors before opening the profile", async context => {
    const session = signedSession();
    const fixture = authFixture({session, factors: [totp("web"), totp("backup")]});
    const render = mountAuth(context, fixture);
    fixture.emit("INITIAL_SESSION");
    await waitForPhase(render, "mfa");
    context.mock.method(globalThis, "fetch", async (url, options) => {
        assert.equal(url, "https://gamenote.eu/.netlify/functions/mfa-recovery");
        assert.equal(options.method, "POST");
        assert.equal(options.headers.Authorization, `Bearer ${session.access_token}`);
        assert.deepEqual(JSON.parse(options.body), {action: "recover", code: "A".repeat(32)});
        fixture.setFactors([totp("backup")]);
        return Response.json({recovered: true});
    });
    await render().recoverSignIn("A".repeat(32));
    await waitForPhase(render, "mfa");
    for (let attempt = 0; attempt < 50 && render().totpFactors.length !== 1; attempt++) await tick(10);
    assert.equal(fixture.calls[0], "refresh");
    assert.equal(render().phase, "mfa");
    assert.equal(render().openRecoveredProfile, false);
    assert.deepEqual(render().totpFactors.map(factor => factor.id), ["backup"]);
    await render().verifySignIn("backup", "012345");
    await waitForPhase(render, "ready");
    assert.equal(render().phase, "ready");
    assert.equal(render().openRecoveredProfile, true);
});

test("Setup checks an isolated password and service status, verifies on the shared account, retries issue, then clears", async context => {
    const session = signedSession();
    const fixture = authFixture({session, factors: [totp("unrelated-draft", "unverified")]});
    const {mfa, calls} = fixture;
    let statusAvailable = false;
    let issueAvailable = false;
    context.mock.method(globalThis, "fetch", async (_url, options) => {
        const request = JSON.parse(options.body);
        calls.push([request.action, request.factorId]);
        if (request.action === "status") {
            return statusAvailable ? Response.json({hasCodes: false}) : Response.json({error: "unavailable"}, {status: 503});
        }
        if (request.action === "issue") {
            const {data} = await fixture.client.supabase.auth.getSession();
            assert.equal(authSession.sessionClaims(data.session).aal, "aal2");
            assert.equal(options.headers.Authorization, `Bearer ${data.session.access_token}`);
            assert.equal(request.factorId, "mobile");
            return issueAvailable ? Response.json({codes: ["FAKE-CODE"]}) : Response.json({error: "unavailable"}, {status: 503});
        }
        assert.equal(request.factorId, "mobile");
        return Response.json({cleared: true});
    });
    await assert.rejects(mfa.checkCurrentPassword(session, "wrong"), {code: "invalid_credentials"});
    await mfa.checkCurrentPassword(session, "correct");
    assert.deepEqual(calls.at(-1), ["signOutPasswordCheck", {scope: "local"}]);
    await assert.rejects(mfa.enrollTotp(session, () => false), /recoveryUnavailable/);
    assert.equal(calls.some(([name]) => name === "enroll"), false);
    statusAvailable = true;

    const draft = await mfa.enrollTotp(session, () => false);
    await mfa.removeUnverifiedFactor(session, draft.id);
    assert.deepEqual(fixture.user().factors, [totp("unrelated-draft", "unverified")]);

    const enrollment = await mfa.enrollTotp(session, () => false);
    await mfa.verifyTotp(session, enrollment.id, "012345");
    await mfa.removeUnverifiedFactor(session, enrollment.id);
    assert.deepEqual(authSession.verifiedTotp(fixture.user()).map(factor => factor.id), ["mobile"]);
    await assert.rejects(mfa.recoveryCodes(session, {action: "issue", factorId: enrollment.id}), /unavailable/);
    issueAvailable = true;
    assert.deepEqual((await mfa.recoveryCodes(session, {action: "issue", factorId: enrollment.id})).codes, ["FAKE-CODE"]);
    await mfa.removeTotp(session, enrollment.id);
    await mfa.recoveryCodes(session, {action: "clear", factorId: enrollment.id});
    assert.deepEqual(authSession.verifiedTotp(fixture.user()), []);
    assert.deepEqual(calls.slice(-2), [["unenroll", {factorId: "mobile"}], ["clear", "mobile"]]);
});

test("TOTP setup removes only abandoned Gamenote TOTP drafts before retrying", async context => {
    const session = signedSession();
    const abandoned = {...totp("abandoned", "unverified"), friendly_name: "Gamenote"};
    const otherDraft = {...totp("other", "unverified"), friendly_name: "Other"};
    const phone = {...totp("phone", "unverified"), friendly_name: "Gamenote", factor_type: "phone"};
    const fixture = authFixture({session, factors: [abandoned, otherDraft, phone]});
    context.mock.method(globalThis, "fetch", async () => Response.json({hasCodes: false}));
    assert.equal(await fixture.mfa.enrollTotp(session, () => true), null);
    assert.deepEqual(fixture.calls, []);
    await fixture.mfa.enrollTotp(session, () => false);
    assert.deepEqual(fixture.calls[0], ["unenroll", {factorId: "abandoned"}]);
    assert.equal(fixture.calls[1][0], "enroll");
    fixture.setFactors([{...abandoned, status: "verified"}]);
    await assert.rejects(fixture.mfa.enrollTotp(session, () => false), /factor/);
    assert.equal(fixture.calls.length, 2);
});

test("The cloud auth error screen opens the local library without signing out", async () => {
    const element = (type, props) => ({type, props});
    let switches = 0;
    let signOuts = 0;
    const {default: SignIn} = load("app/(modals)/mfaSignInModal.tsx", {
        react: {useState: initial => [initial, () => {}]},
        "react/jsx-runtime": {jsx: element, jsxs: element},
        "react-native": {Keyboard: {dismiss() {}}, StyleSheet: {create: value => value}},
        "react-i18next": {useTranslation: () => ({t: key => key})},
        "@/context/auth": {useAuth: () => ({phase: "error", totpFactors: [], cancelSignIn: () => signOuts++})},
        "@/context/localMode": {useLocalMode: () => ({localModeEnabled: true, switchSource: async () => { switches++; }})},
        "@/context/theme": {useTheme: () => ({themeColors: {}})},
        "@/components/AccountModal": {ModalButton: "button"},
        "@/components/TotpCodeInput": {},
        "@/hooks/useTotpKeyboardScroll": {useTotpKeyboardScroll: () => ({})},
        "@/services/mfa": {},
    });
    const action = SignIn().props.children.find(child => child?.props?.label === "screens.localMode.openLibrary");
    await action.props.onPress();
    assert.equal(switches, 1);
    assert.equal(signOuts, 0);
});

test("A password starts masked and its visibility can be toggled", () => {
    let masked;
    const element = (type, props) => ({type, props});
    const {default: PasswordInput} = load("components/PasswordInput.tsx", {
        react: {useState: initial => [masked ?? (masked = initial), update => { masked = typeof update === "function" ? update(masked) : update; }]},
        "react/jsx-runtime": {jsx: element, jsxs: element},
        "react-native": {Pressable: "button", StyleSheet: {create: value => value}, TextInput: "input", View: "view"},
        "expo-symbols": {SymbolView: "symbol"},
        "react-i18next": {useTranslation: () => ({t: value => value})},
        "@/context/theme": {useTheme: () => ({themeColors: {accent: "blue"}})},
    });
    const render = () => PasswordInput({value: "fixture", textContentType: "password"}).props.children;
    const [input, toggle] = render();
    assert.equal(input.props.secureTextEntry, true);
    assert.equal(input.props.keyboardType, undefined);
    assert.equal(input.props.textContentType, "password");
    toggle.props.onPress();
    assert.equal(render()[0].props.secureTextEntry, false);
    assert.equal(render()[0].props.value, "fixture");
    toggle.props.onPress();
    assert.equal(render()[0].props.secureTextEntry, true);
});

test("TOTP scrolls only by the overlap with the keyboard", context => {
    const listeners = new Map();
    const animate = globalThis.requestAnimationFrame;
    globalThis.requestAnimationFrame = callback => callback();
    context.after(() => {
        if (animate) globalThis.requestAnimationFrame = animate;
        else delete globalThis.requestAnimationFrame;
    });
    const {useTotpKeyboardScroll} = load("hooks/useTotpKeyboardScroll.ts", {
        react: {
            useCallback: callback => callback,
            useEffect: effect => { context.after(effect()); },
            useRef: current => ({current}),
            useState: initial => [initial, () => {}],
        },
        "react-native": {Keyboard: {
            addListener(name, callback) {
                listeners.set(name, callback);
                return {remove: () => listeners.delete(name)};
            },
        }},
    });
    const {scrollProps, fieldProps} = useTotpKeyboardScroll(true);
    const scrolls = [];
    let fieldTop = 490;
    scrollProps.ref.current = {
        getNativeScrollRef: () => ({measureInWindow: callback => callback(0, 60, 380, 700)}),
        scrollTo: options => scrolls.push(options),
    };
    fieldProps.fieldRef.current = {measureInWindow: callback => callback(0, fieldTop, 320, 50)};
    scrollProps.onScroll({nativeEvent: {contentOffset: {y: 24}}});
    const showKeyboard = () => listeners.get("keyboardDidShow")({endCoordinates: {screenY: 560}});

    fieldProps.onFocusChange(true);
    showKeyboard();
    assert.deepEqual(scrolls, []);
    fieldTop = 520;
    showKeyboard();
    assert.deepEqual(scrolls, [{y: 42, animated: true}]);
    fieldProps.onFocusChange(false);
    showKeyboard();
    assert.equal(scrolls.length, 1);
});

test("TOTP input preserves leading zeros and strips pasted whitespace, and Platinum needs active TOTP", () => {
    const {normalizeTotpCode, totpQrMarkup} = load("utils/totpCode.ts");
    assert.equal(normalizeTotpCode(" 01 23\n45 "), "012345");
    assert.equal(normalizeTotpCode("012345"), "012345");
    assert.equal(normalizeTotpCode("01234567"), "012345");
    const input = readFileSync(join(__dirname, "../components/TotpCodeInput.tsx"), "utf8");
    assert.equal(input.match(/<TextInput\b/g)?.length, 1);
    assert.match(input, /textContentType="oneTimeCode"/);
    assert.match(input, /keyboardType="number-pad"/);
    assert.match(input, /contextMenuHidden=\{false}/);
    assert.match(input, /ClipboardPasteButton/);
    assert.doesNotMatch(input, /caretHidden/);
    assert.equal(totpQrMarkup('data:image/svg+xml;utf-8,<svg width="192" height="192"></svg>'),
        '<svg viewBox="0 0 192 192" width="192" height="192"></svg>');
    const scaledSvg = '<svg viewBox="1 1 25 25" width="192" height="192"></svg>';
    assert.equal(totpQrMarkup(scaledSvg), scaledSvg);

    const {hasPlatinum} = load("utils/profileAchievements.ts");
    const stats = {totalGames: 50, finishedGames: 25, totalPlaytime: 3000, bestGames: 10};
    assert.equal(hasPlatinum(stats, false), false);
    assert.equal(hasPlatinum(stats, true), true);
    for (const key of Object.keys(stats)) {
        assert.equal(hasPlatinum({...stats, [key]: stats[key] - 1}, true), false);
    }
});

test("Sharing covers private, first public username, scope changes, revocation and conflicts", async () => {
    let row = null;
    let saveError = null;
    const rpcCalls = [];
    const request = {
        select(columns) { assert.equal(columns, "username,share_scope"); return this; },
        eq(column, value) { assert.deepEqual([column, value], ["user_id", "player"]); return this; },
        maybeSingle: async () => noError(row),
    };
    const supabase = {
        from: name => { assert.equal(name, "library_shares"); return request; },
        rpc: async (name, params) => {
            rpcCalls.push([name, params]);
            if (name === "check_library_username") return noError({available: params.p_username !== "taken"});
            assert.equal(name, "save_library_share");
            if (saveError) return {data: null, error: {code: saveError}};
            row = {...row, username: row?.username ?? params.p_username, share_scope: params.p_scope};
            return noError(row);
        },
    };
    const session = signedSession();
    const {loadShareSettings, saveShareSettings, publicProfileUrl} = load("services/libraryShare.ts", {
        "./supabase": {supabase, requireSession: expected => assert.equal(expected, session)},
    });
    const initial = await loadShareSettings("player");
    assert.deepEqual(initial, {username: null, share_scope: "none"});
    assert.equal(publicProfileUrl(initial, "none"), "");
    await assert.rejects(saveShareSettings(session, initial, " stats ", "library"), /reserved/);
    await assert.rejects(saveShareSettings(session, initial, "a!", "library"), /invalid/);
    await assert.rejects(saveShareSettings(session, initial, "TAKEN", "library"), /taken/);
    saveError = "23505";
    await assert.rejects(saveShareSettings(session, initial, "raced", "library"), /taken/);
    saveError = "offline";
    await assert.rejects(saveShareSettings(session, initial, "player-name", "library"), /saveError/);
    saveError = null;
    const shared = await saveShareSettings(session, initial, " Player-Name ", "library");
    assert.deepEqual(rpcCalls.slice(-2), [
        ["check_library_username", {p_username: "player-name"}],
        ["save_library_share", {p_username: "player-name", p_scope: "library"}],
    ]);
    assert.equal(publicProfileUrl(shared, "library"), "https://gamenote.eu/player-name");
    assert.equal(publicProfileUrl(shared, "all"), "");
    const expanded = await saveShareSettings(session, shared, "ignored", "all");
    assert.deepEqual(rpcCalls.at(-1), ["save_library_share", {p_username: null, p_scope: "all"}]);
    assert.equal(publicProfileUrl(expanded, "all"), "https://gamenote.eu/player-name");
    const revoked = await saveShareSettings(session, expanded, "ignored", "none");
    assert.deepEqual(rpcCalls.at(-1), ["save_library_share", {p_username: null, p_scope: "none"}]);
    assert.equal(publicProfileUrl(revoked, "none"), "");
});
