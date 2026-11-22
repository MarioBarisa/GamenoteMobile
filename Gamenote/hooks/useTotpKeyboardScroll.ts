import {useCallback, useEffect, useRef, useState, type ComponentRef} from "react";
import {Keyboard, type NativeScrollEvent, type NativeSyntheticEvent, type ScrollView, type View} from "react-native";

const FIELD_GAP = 8;

export function useTotpKeyboardScroll(enabled: boolean) {
    const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
    const fieldRef = useRef<ComponentRef<typeof View>>(null);
    const focused = useRef(false);
    const scrollOffset = useRef(0);
    const revision = useRef(0);
    const [bottomInset, setBottomInset] = useState(0);

    const clear = useCallback(() => {
        revision.current++;
        setBottomInset(0);
    }, []);

    const revealField = useCallback((keyboardTop: number) => {
        const scroll = scrollRef.current;
        const field = fieldRef.current;
        if (!focused.current || !scroll || !field) return;
        const current = ++revision.current;

        scroll.getNativeScrollRef()?.measureInWindow((_x, top, _width, height) => {
            if (revision.current !== current) return;
            const bottom = top + height;
            setBottomInset(Math.max(0, bottom - keyboardTop));

            requestAnimationFrame(() => {
                if (revision.current !== current) return;
                field.measureInWindow((_fieldX, fieldTop, _fieldWidth, fieldHeight) => {
                    if (revision.current !== current) return;
                    const overlap = fieldTop + fieldHeight + FIELD_GAP - Math.min(bottom, keyboardTop);
                    if (overlap > 0) scroll.scrollTo({y: scrollOffset.current + overlap, animated: true});
                });
            });
        });
    }, []);

    useEffect(() => {
        if (!enabled) return;
        const show = Keyboard.addListener("keyboardDidShow", ({endCoordinates}) => revealField(endCoordinates.screenY));
        const resize = Keyboard.addListener("keyboardDidChangeFrame", ({endCoordinates}) => {
            if (endCoordinates.height > 0) revealField(endCoordinates.screenY);
        });
        const hide = Keyboard.addListener("keyboardDidHide", clear);
        return () => {
            focused.current = false;
            clear();
            show.remove();
            resize.remove();
            hide.remove();
        };
    }, [enabled, revealField, clear]);

    return {
        scrollProps: {
            ref: scrollRef,
            contentInset: {bottom: enabled ? bottomInset : 0},
            scrollEventThrottle: 16,
            onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => {
                scrollOffset.current = event.nativeEvent.contentOffset.y;
            },
        },
        fieldProps: {
            fieldRef,
            onFocusChange: (isFocused: boolean) => {
                focused.current = isFocused;
                if (!isFocused) revision.current++;
            },
        },
    };
}
