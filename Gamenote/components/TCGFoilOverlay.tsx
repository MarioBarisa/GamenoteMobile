import {memo, useEffect, useId, useState} from "react";
import {Image, LayoutChangeEvent, StyleSheet} from "react-native";
import Animated, {useAnimatedStyle} from "react-native-reanimated";
import Svg, {Defs, LinearGradient, RadialGradient, Rect, Stop} from "react-native-svg";
import {useTCGMotion} from "@/context/TCGMotion";
import {FoilVariant} from "@/hooks/useTCGFoil";

const coverStops = {
    gold: [
        ["12%", "#000"], ["22%", "#f7e08b"], ["34%", "#000"],
        ["44%", "#fff3b0"], ["56%", "#000"], ["66%", "#d4af37"],
        ["78%", "#000"], ["88%", "#ffe98a"], ["100%", "#000"],
    ],
    holo: [
        ["10%", "#000"], ["20%", "#7c3aed"], ["32%", "#000"],
        ["42%", "#22d3ee"], ["54%", "#000"], ["64%", "#f472b6"],
        ["76%", "#000"], ["86%", "#2dd4bf"], ["100%", "#000"],
    ],
};
const exTextures = {
    gold: require("@/assets/tcg/foil-gold.png"),
    holo: require("@/assets/tcg/foil-spectrum.png"),
    prism: require("@/assets/tcg/foil-prism.png"),
};
const lightColors = {
    gold: ["#f6efed", "#e7dad5", "#160f0c"],
    holo: ["#eff1f6", "#d9dde7", "#0f1116"],
    prism: ["#ebf2f0", "#d2e0dc", "#091311"],
};
const FoilLight = memo(function FoilLight({variant, diameter, darkEdge = false}: {
    variant: FoilVariant;
    diameter: number;
    darkEdge?: boolean;
}) {
    const gradientId = useId();
    const palette = lightColors[variant];
    const radius = diameter / 2;

    return (
        <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
            <Defs>
                <RadialGradient id={gradientId} gradientUnits="userSpaceOnUse" cx={radius} cy={radius} rx={radius} ry={radius}>
                    <Stop offset="8%" stopColor={palette[0]} stopOpacity={0.264} />
                    <Stop offset="28%" stopColor={palette[1]} stopOpacity={0.2} />
                    <Stop offset="90%" stopColor={darkEdge ? palette[2] : palette[0]} stopOpacity={darkEdge ? 0.1 : 0} />
                </RadialGradient>
            </Defs>
            <Rect width="100%" height="100%" fill={`url(#${gradientId})`} />
        </Svg>
    );
});

function CoverFoil({variant}: {variant: FoilVariant}) {
    const {coverStyle, registerCard} = useTCGMotion();
    const [size, setSize] = useState({width: 0, height: 0});
    const gradientId = useId();
    useEffect(() => registerCard(), [registerCard]);

    const width = size.width * 2.2;
    const height = size.height * 2.2;
    // CSS kut od 115 stupnjeva
    const dx = Math.sin(115 * Math.PI / 180);
    const dy = -Math.cos(115 * Math.PI / 180);
    const length = width * dx + height * dy;
    const measure = ({nativeEvent: {layout}}: LayoutChangeEvent) => {
        setSize(current => current.width === layout.width && current.height === layout.height
            ? current : {width: layout.width, height: layout.height});
    };
    return (
        <Animated.View
            pointerEvents="none"
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            onLayout={measure}
            style={[styles.overlay, styles.coverBlend, {opacity: variant === "prism" ? 0.55 : 0.45}]}
        >
            {/* Blending neposredno s posterom */}
            <Animated.View style={[styles.coverFoil, coverStyle]}>
                {variant === "prism" ? (
                    <Image source={require("@/assets/tcg/cover-prism.png")} style={styles.fill} resizeMode="cover" />
                ) : size.width > 0 && (
                    <Svg width="100%" height="100%">
                        <Defs>
                            <LinearGradient
                                id={gradientId}
                                gradientUnits="userSpaceOnUse"
                                x1={(width - dx * length) / 2}
                                y1={(height - dy * length) / 2}
                                x2={(width + dx * length) / 2}
                                y2={(height + dy * length) / 2}
                            >
                                {coverStops[variant].map(([offset, stopColor]) => (
                                    <Stop key={offset} offset={offset} stopColor={stopColor} />
                                ))}
                            </LinearGradient>
                        </Defs>
                        <Rect width="100%" height="100%" fill={`url(#${gradientId})`} />
                    </Svg>
                )}
            </Animated.View>
        </Animated.View>
    );
}

function EXHolo({variant}: {variant: FoilVariant}) {
    const {x, y, textureStyle, lightStyle, glareStyle} = useTCGMotion();
    const [size, setSize] = useState({width: 0, height: 0});
    const {width, height} = size;
    const diameter = Math.hypot(width, height);
    const reflectionStyle = useAnimatedStyle(() => {
        const cx = (0.5 + x.value * 0.5) * width;
        const cy = (0.5 + y.value * 0.5) * height;
        const radius = Math.hypot(Math.max(cx, width - cx), Math.max(cy, height - cy));
        // Isti gradijent, bez ponovnog SVG crtanja
        return {
            transform: [
                {translateX: cx - width / 2},
                {translateY: cy - height / 2},
                {scale: diameter > 0 ? radius * 2 / diameter : 1},
            ],
        };
    });
    const reflectionFrame = {
        position: "absolute" as const,
        width: diameter,
        height: diameter,
        left: (width - diameter) / 2,
        top: (height - diameter) / 2,
    };
    const measure = ({nativeEvent: {layout}}: LayoutChangeEvent) => {
        setSize(current => current.width === layout.width && current.height === layout.height
            ? current : {width: layout.width, height: layout.height});
    };

    return (
        <>
            <Animated.View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" onLayout={measure} style={[styles.overlay, styles.exHolo, lightStyle]}>
                {width > 0 && (
                    <Animated.View shouldRasterizeIOS style={[reflectionFrame, reflectionStyle]}>
                        <FoilLight variant={variant} diameter={diameter} darkEdge />
                    </Animated.View>
                )}
                {/* Izvorna tekstura preko refleksije */}
                <Animated.View style={[styles.exTexture, textureStyle]}>
                    <Image source={exTextures[variant]} style={styles.fill} resizeMode="cover" />
                </Animated.View>
            </Animated.View>
            <Animated.View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[styles.overlay, styles.glare, glareStyle]}>
                {width > 0 && (
                    <Animated.View shouldRasterizeIOS style={[reflectionFrame, reflectionStyle]}>
                        <FoilLight variant={variant} diameter={diameter} />
                    </Animated.View>
                )}
            </Animated.View>
        </>
    );
}

type Props = {
    variant: FoilVariant;
    surface: "cover" | "card";
};

export default memo(function TCGFoilOverlay({variant, surface}: Props) {
    return surface === "cover" ? <CoverFoil variant={variant} /> : <EXHolo variant={variant} />;
});

const styles = StyleSheet.create({
    fill: {width: "100%", height: "100%"},
    overlay: {...StyleSheet.absoluteFill, overflow: "hidden"},
    coverBlend: {mixBlendMode: "color-dodge"},
    coverFoil: {
        position: "absolute",
        left: "-60%",
        top: "-60%",
        width: "220%",
        height: "220%",
    },
    glare: {mixBlendMode: "overlay"},
    exHolo: {mixBlendMode: "soft-light"},
    exTexture: {
        position: "absolute",
        left: "-20%",
        top: "-30%",
        width: "140%",
        height: "160%",
        mixBlendMode: "color-burn",
    },
});
