import {useEffect, useState} from "react";
import {Animated, Modal, Platform, Pressable, StyleSheet, Text, useWindowDimensions, View} from "react-native";
import {BlurView} from "expo-blur";
import {Host, RoundedRectangle} from "@expo/ui/swift-ui";
import {glassEffect} from "@expo/ui/swift-ui/modifiers";
import {Image} from "expo-image";
import {SymbolView} from "expo-symbols";
import {useSafeAreaInsets} from "react-native-safe-area-context";
import {useTranslation} from "react-i18next";
import {Game} from "@/common/Game";
import {useTheme} from "@/context/theme";

export type MenuAnchor = {x: number; y: number; width: number; height: number};

type Props = {
    game: Game;
    anchor: MenuAnchor | null;
    visible: boolean;
    onClose: () => void;
    onDismiss: () => void;
    onEdit: () => void;
    onDelete: () => void;
};

const MENU_WIDTH = 224;
const MENU_HEIGHT = 108;
const SUPPORTS_GLASS = parseInt(String(Platform.Version), 10) >= 26;

// Kontekstni izbornik s podignutim pregledom
export default function GameContextMenu({game, anchor, visible, onClose, onDismiss, onEdit, onDelete}: Props) {
    const {themeColors: c, theme} = useTheme();
    const {t: tr} = useTranslation();
    const insets = useSafeAreaInsets();
    const {width: screenWidth, height: screenHeight} = useWindowDimensions();

    const [pending, setPending] = useState<"edit" | "delete" | null>(null);
    const [scale] = useState(() => new Animated.Value(0.94));
    const [opacity] = useState(() => new Animated.Value(0));

    // Ulazna animacija prema gore
    useEffect(() => {
        if (!visible) return;
        scale.setValue(0.94);
        opacity.setValue(0);
        Animated.parallel([
            Animated.spring(scale, {toValue: 1, friction: 8, tension: 110, useNativeDriver: true}),
            Animated.timing(opacity, {toValue: 1, duration: 120, useNativeDriver: true}),
        ]).start();
    }, [visible, opacity, scale]);

    if (!anchor) return null;

    const imageUri = game.image_url || game.background_image || null;
    const previewHeight = (anchor.width * 4) / 3; // cover je 3:4
    const menuTop = anchor.y + previewHeight + 10;
    const fitsBelow = menuTop + MENU_HEIGHT < screenHeight - insets.bottom;
    const menuLeft = Math.min(
        Math.max(anchor.x + anchor.width / 2 - MENU_WIDTH / 2, 16),
        screenWidth - MENU_WIDTH - 16
    );

    // Radnja se izvršava nakon zatvaranja
    const choose = (action: "edit" | "delete") => {
        setPending(action);
        onClose();
    };

    return (
        <Modal
            transparent
            visible={visible}
            animationType="fade"
            onRequestClose={onClose}
            onDismiss={() => {
                if (pending === "edit") onEdit();
                if (pending === "delete") onDelete();
                setPending(null);
                onDismiss();
            }}
        >
            <Pressable style={styles.backdrop} onPress={onClose}>
                <BlurView
                    intensity={40}
                    tint={theme === "dark" ? "systemUltraThinMaterialDark" : "systemUltraThinMaterialLight"}
                    style={StyleSheet.absoluteFill}
                />
                <View style={styles.dim}/>
            </Pressable>

            {/* Podignuti pregled kartice */}
            <Animated.View
                pointerEvents="none"
                style={[
                    styles.previewOuter,
                    {
                        left: anchor.x,
                        top: anchor.y,
                        width: anchor.width,
                        height: previewHeight,
                        opacity,
                        transform: [{scale}],
                    },
                ]}
            >
                <View style={[styles.previewCard, {backgroundColor: c.card}]}>
                    {imageUri ? (
                        <Image source={{uri: imageUri}} style={styles.image} contentFit="cover" cachePolicy="memory-disk"/>
                    ) : (
                        <View style={styles.placeholder}>
                            <Text style={{color: c.secondaryText}}>{tr("common.noImage")}</Text>
                        </View>
                    )}
                </View>
            </Animated.View>

            {/* Nativni izbornik radnji */}
            <Animated.View
                style={[
                    styles.menuWrap,
                    {
                        left: menuLeft,
                        width: MENU_WIDTH,
                        top: fitsBelow ? menuTop : undefined,
                        bottom: fitsBelow ? undefined : screenHeight - anchor.y + 10,
                        opacity,
                        transform: [{scale}],
                    },
                ]}
            >
                {SUPPORTS_GLASS ? (
                    // Liquid glass pozadina izbornika
                    <Host pointerEvents="none" style={StyleSheet.absoluteFill}>
                        <RoundedRectangle
                            cornerRadius={14}
                            modifiers={[glassEffect({
                                glass: {variant: "regular"},
                                shape: "roundedRectangle",
                                cornerRadius: 14,
                            })]}
                        />
                    </Host>
                ) : (
                    <BlurView
                        intensity={85}
                        tint={theme === "dark" ? "systemThickMaterialDark" : "systemThickMaterialLight"}
                        style={StyleSheet.absoluteFill}
                    />
                )}

                <View style={styles.menuInner}>
                    <Pressable
                        onPress={() => choose("edit")}
                        style={({pressed}) => [styles.row, pressed && styles.rowPressed]}
                    >
                        <SymbolView name="pencil" style={styles.icon} tintColor={c.text}/>
                        <Text style={[styles.rowLabel, {color: c.text}]}>{tr("gameCard.actionEdit")}</Text>
                    </Pressable>

                    <View style={[styles.separator, {borderTopColor: c.secondaryText}]}/>

                    <Pressable
                        onPress={() => choose("delete")}
                        style={({pressed}) => [styles.row, pressed && styles.rowPressed]}
                    >
                        <SymbolView name="trash" style={styles.icon} tintColor="#FF453A"/>
                        <Text style={[styles.rowLabel, {color: "#FF453A"}]}>{tr("gameCard.actionDelete")}</Text>
                    </Pressable>
                </View>
            </Animated.View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
    },
    dim: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0,0,0,0.28)",
    },
    previewOuter: {
        position: "absolute",
        shadowColor: "#000",
        shadowOpacity: 0.35,
        shadowRadius: 24,
        shadowOffset: {width: 0, height: 12},
    },
    previewCard: {
        flex: 1,
        borderRadius: 12,
        overflow: "hidden",
    },
    image: {
        width: "100%",
        height: "100%",
    },
    placeholder: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
    },
    menuWrap: {
        position: "absolute",
        shadowColor: "#000",
        shadowOpacity: 0.3,
        shadowRadius: 20,
        shadowOffset: {width: 0, height: 8},
    },
    menuInner: {
        borderRadius: 14,
        overflow: "hidden",
    },
    row: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        paddingHorizontal: 16,
        paddingVertical: 14,
    },
    rowPressed: {
        backgroundColor: "rgba(120,120,128,0.18)",
    },
    icon: {
        width: 18,
        height: 18,
    },
    rowLabel: {
        fontSize: 17,
        fontWeight: "500",
    },
    separator: {
        borderTopWidth: StyleSheet.hairlineWidth,
        opacity: 0.35,
    },
});
