import {createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState} from "react";
import {AccessibilityInfo, AppState} from "react-native";
import {DeviceMotion} from "expo-sensors";
import {cancelAnimation, Easing, SharedValue, useAnimatedStyle, useSharedValue, withTiming} from "react-native-reanimated";
import {useSettings} from "@/context/settings";

type TCGMotionValue = {
    x: SharedValue<number>;
    y: SharedValue<number>;
    coverStyle: ReturnType<typeof useAnimatedStyle>;
    textureStyle: ReturnType<typeof useAnimatedStyle>;
    lightStyle: ReturnType<typeof useAnimatedStyle>;
    glareStyle: ReturnType<typeof useAnimatedStyle>;
    registerCard: () => () => void;
};

const TCGMotionContext = createContext<TCGMotionValue | undefined>(undefined);
const MAX_TILT = Math.PI / 6;
const SMOOTHING = 0.2;
const DEAD_ZONE = 0.004;

function relativeTilt(angle: number, origin: number) {
    const difference = Math.atan2(Math.sin(angle - origin), Math.cos(angle - origin));
    return Math.max(-1, Math.min(1, difference / MAX_TILT));
}

export function TCGMotionProvider({children}: {children: ReactNode}) {
    const {tcgMode, tcgSettingsLoaded} = useSettings();
    const x = useSharedValue(0);
    const y = useSharedValue(0);
    const cardCount = useRef(0);
    const [hasCards, setHasCards] = useState(false);
    const [appState, setAppState] = useState(AppState.currentState);
    const [reduceMotion, setReduceMotion] = useState<boolean | null>(null);
    const permissionRequest = useRef<ReturnType<typeof DeviceMotion.requestPermissionsAsync> | null>(null);

    // Jedan izračun za sve kartice
    const coverStyle = useAnimatedStyle(() => ({
        transform: [
            {translateX: `${-x.value * 27.27}%`},
            {translateY: `${-y.value * 27.27}%`},
        ],
    }));
    const textureStyle = useAnimatedStyle(() => ({
        transform: [{translateX: x.value * 20}, {translateY: y.value * 20}],
    }));
    const lightStyle = useAnimatedStyle(() => ({
        opacity: 0.25 + Math.min(1, Math.hypot(x.value, y.value)) * 0.5,
    }));
    const glareStyle = useAnimatedStyle(() => ({
        opacity: Math.min(1, Math.hypot(x.value, y.value)),
    }));

    const registerCard = useCallback(() => {
        cardCount.current += 1;
        if (cardCount.current === 1) setHasCards(true);
        let registered = true;
        return () => {
            if (!registered) return;
            registered = false;
            cardCount.current -= 1;
            if (cardCount.current === 0) setHasCards(false);
        };
    }, []);

    useEffect(() => {
        const subscription = AppState.addEventListener("change", setAppState);
        return () => subscription.remove();
    }, []);

    useEffect(() => {
        let cancelled = false;
        let receivedChange = false;
        const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", value => {
            receivedChange = true;
            setReduceMotion(value);
        });
        AccessibilityInfo.isReduceMotionEnabled().then(value => {
            if (!cancelled && !receivedChange) setReduceMotion(value);
        }).catch(() => {
            if (!cancelled && !receivedChange) setReduceMotion(true);
        });
        return () => {
            cancelled = true;
            subscription.remove();
        };
    }, []);

    useEffect(() => {
        if (!tcgMode || !tcgSettingsLoaded || !hasCards || reduceMotion !== false || appState !== "active") return;

        let cancelled = false;
        let subscription: ReturnType<typeof DeviceMotion.addListener> | undefined;

        async function start() {
            try {
                if (!await DeviceMotion.isAvailableAsync() || cancelled) return;
                let permission = await DeviceMotion.getPermissionsAsync();
                if (cancelled) return;
                if (permission.status === "undetermined" && permission.canAskAgain) {
                    // Jedan zahtjev preživljava promjene lifecyclea
                    if (!permissionRequest.current) {
                        permissionRequest.current = DeviceMotion.requestPermissionsAsync();
                    }
                    try {
                        permission = await permissionRequest.current;
                    } finally {
                        permissionRequest.current = null;
                    }
                }
                if (!permission.granted || cancelled || AppState.currentState !== "active") return;

                let origin: {beta: number; gamma: number} | null = null;
                let filteredX = 0;
                let filteredY = 0;
                let previousX = 0;
                let previousY = 0;
                DeviceMotion.setUpdateInterval(32);
                subscription = DeviceMotion.addListener(({rotation}) => {
                    if (cancelled || !rotation || !Number.isFinite(rotation.beta) || !Number.isFinite(rotation.gamma)) return;
                    if (!origin) {
                        // Početni položaj telefona je neutralan
                        origin = {beta: rotation.beta, gamma: rotation.gamma};
                        return;
                    }
                    filteredX += (relativeTilt(rotation.gamma, origin.gamma) - filteredX) * SMOOTHING;
                    filteredY += (relativeTilt(rotation.beta, origin.beta) - filteredY) * SMOOTHING;
                    // Zanemari sitno podrhtavanje senzora
                    if (Math.abs(filteredX - previousX) >= DEAD_ZONE) {
                        previousX = filteredX;
                        x.value = withTiming(filteredX, {duration: 50, easing: Easing.linear});
                    }
                    if (Math.abs(filteredY - previousY) >= DEAD_ZONE) {
                        previousY = filteredY;
                        y.value = withTiming(filteredY, {duration: 50, easing: Easing.linear});
                    }
                });
            } catch {
                // Bez senzora folija ostaje statična
            }
        }

        void start();
        return () => {
            cancelled = true;
            subscription?.remove();
            cancelAnimation(x);
            cancelAnimation(y);
            x.value = 0;
            y.value = 0;
        };
    }, [tcgMode, tcgSettingsLoaded, hasCards, reduceMotion, appState, x, y]);

    const value = useMemo(() => ({x, y, coverStyle, textureStyle, lightStyle, glareStyle, registerCard}),
        [x, y, coverStyle, textureStyle, lightStyle, glareStyle, registerCard]);
    return <TCGMotionContext.Provider value={value}>{children}</TCGMotionContext.Provider>;
}

export function useTCGMotion() {
    const value = useContext(TCGMotionContext);
    if (!value) throw new Error("useTCGMotion must be inside a TCGMotionProvider");
    return value;
}
