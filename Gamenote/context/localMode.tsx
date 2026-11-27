import {createContext, type ReactNode, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore} from "react";
import {AppState} from "react-native";
import {useAuth} from "@/context/auth";
import {isCloudSourceAvailable, useSettings} from "@/context/settings";
import {deleteLocalProfile, getLocalState, loadLocalData, localImageUrl, subscribeLocalData, type LocalProfile} from "@/services/localData";
import {disableLocalMirror, syncLocalMirror} from "@/services/localMirror";
import {hasIgdbCredentials} from "@/services/igdbApi";
import {STATUS_PLATFORM} from "@/common/StatusCommons";
import {useTheme} from "@/context/theme";

function useLocalModeState() {
    const {localModeEnabled, activeSource, activateLocalMode, setActiveSource} = useSettings();
    const {session, knownCloudUserId, username, avatarUrl} = useAuth();
    const cloudUserId = activeSource === "cloud" ? session?.user.id : undefined;
    const {document, size, error, resetRevision} = useSyncExternalStore(subscribeLocalData, getLocalState, getLocalState);
    const [returnToCloudProfile, setReturnToCloudProfile] = useState(false);
    const [igdbConfigured, setIgdbConfigured] = useState<boolean | null>(null);
    const [mirrorBusy, setMirrorBusy] = useState(false);
    const [mirrorError, setMirrorError] = useState(false);
    const mirrorUserId = cloudUserId ?? knownCloudUserId;
    const mirrorEnabled = Boolean(mirrorUserId && document?.mirrors?.[mirrorUserId]?.enabled);
    const current = useRef({cloudUserId, knownCloudUserId, localModeEnabled, mirrorEnabled});
    const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const syncing = useRef<Promise<void> | null>(null);

    useLayoutEffect(() => {
        current.current = {cloudUserId, knownCloudUserId, localModeEnabled, mirrorEnabled};
    }, [cloudUserId, knownCloudUserId, localModeEnabled, mirrorEnabled]);

    const refreshIgdbStatus = useCallback(async () => {
        setIgdbConfigured(await hasIgdbCredentials());
    }, []);

    useEffect(() => {
        if (!localModeEnabled) return;
        loadLocalData().catch(() => {});
        refreshIgdbStatus().catch(() => setIgdbConfigured(false));
    }, [localModeEnabled, refreshIgdbStatus]);

    const runMirror = useCallback(async (initialProfile?: LocalProfile) => {
        const userId = current.current.cloudUserId;
        if (!userId || !isCloudSourceAvailable() || !current.current.localModeEnabled || (!initialProfile && !current.current.mirrorEnabled)) return;
        const isCurrent = () => current.current.localModeEnabled && (isCloudSourceAvailable()
            ? current.current.cloudUserId === userId : current.current.knownCloudUserId === userId);
        await syncLocalMirror(userId, isCurrent, initialProfile);
    }, []);

    const requestMirrorRefresh = useCallback(() => {
        if (!current.current.mirrorEnabled || !current.current.cloudUserId || !current.current.localModeEnabled) return;
        clearTimeout(timer.current);
        timer.current = setTimeout(() => {
            timer.current = undefined;
            const job = (syncing.current ?? Promise.resolve()).then(() => runMirror()).then(() => {
                setMirrorError(false);
            }, () => { setMirrorError(true); });
            syncing.current = job;
            void job.finally(() => { if (syncing.current === job) syncing.current = null; });
        }, 200);
    }, [runMirror]);

    useEffect(() => {
        if (!cloudUserId || !mirrorEnabled || !localModeEnabled) return;
        requestMirrorRefresh();
        const listener = AppState.addEventListener("change", state => {
            if (state === "active") requestMirrorRefresh();
        });
        return () => { listener.remove(); clearTimeout(timer.current); timer.current = undefined; };
    }, [cloudUserId, localModeEnabled, mirrorEnabled, requestMirrorRefresh]);

    const setMirrorEnabled = useCallback(async (enabled: boolean) => {
        const userId = current.current.cloudUserId;
        if (!userId) return;
        setMirrorBusy(true);
        setMirrorError(false);
        try {
            if (enabled) await runMirror({
                name: typeof username === "string" ? username : "",
                profileUrl: typeof avatarUrl === "string" ? avatarUrl : "",
            });
            else await disableLocalMirror(userId);
        } catch {
            setMirrorError(true);
        } finally {
            setMirrorBusy(false);
        }
    }, [avatarUrl, runMirror, username]);

    const eraseLocalProfile = useCallback(async () => {
        await deleteLocalProfile();
        setMirrorError(false);
    }, []);

    const openLocalLibrary = useCallback(async () => {
        await loadLocalData();
        await activateLocalMode();
    }, [activateLocalMode]);

    const switchSource = useCallback(async () => {
        if (activeSource === "cloud") {
            await loadLocalData();
            if (current.current.mirrorEnabled && (timer.current || syncing.current)) {
                const pending = timer.current;
                clearTimeout(pending);
                timer.current = undefined;
                const inProgress = syncing.current ?? Promise.resolve();
                const job = pending ? inProgress.then(() => runMirror()).catch(() => {}) : inProgress;
                await Promise.race([job, new Promise(resolve => setTimeout(resolve, 600))]);
            }
        }
        setReturnToCloudProfile(activeSource === "local");
        try {
            await setActiveSource(activeSource === "cloud" ? "local" : "cloud");
        } catch (error) {
            setReturnToCloudProfile(false);
            throw error;
        }
    }, [activeSource, runMirror, setActiveSource]);

    return {
        localModeEnabled, activeSource, openLocalLibrary, switchSource, returnToCloudProfile, setReturnToCloudProfile, document, storageSize: size, storageError: error,
        eraseLocalProfile, resetRevision, mirrorEnabled, mirrorBusy, mirrorError, knownCloudUserId, canChangeMirror: Boolean(cloudUserId),
        setMirrorEnabled, requestMirrorRefresh, igdbConfigured, refreshIgdbStatus,
    };
}

const LocalModeContext = createContext<ReturnType<typeof useLocalModeState> | null>(null);

export function LocalModeProvider({children}: {children: ReactNode}) {
    const value = useLocalModeState();
    return <LocalModeContext.Provider value={value}>{children}</LocalModeContext.Provider>;
}

export function useLocalMode() {
    const local = useContext(LocalModeContext);
    if (!local) throw new Error("LocalModeProvider");
    return local;
}

export function useGamePresentation() {
    const {activeSource, document} = useLocalMode();
    const {themeColors} = useTheme();
    const isLocal = activeSource === "local";
    const imageUrl = isLocal ? localImageUrl : (url?: string) => url;
    const platformStyle = (name?: string) => {
        if (!name) return undefined;
        const standard = Object.hasOwn(STATUS_PLATFORM, name) ? STATUS_PLATFORM[name] : undefined;
        if (!isLocal) return standard;
        const custom = document?.platformColors;
        const color = custom && Object.hasOwn(custom, name) ? custom[name] : undefined;
        return {label: standard?.label ?? name, text: color ?? standard?.text ?? themeColors.secondaryText};
    };
    return {isLocal, imageUrl, platformStyle};
}
