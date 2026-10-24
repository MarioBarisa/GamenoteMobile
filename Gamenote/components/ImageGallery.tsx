import {useCallback, useEffect, useLayoutEffect, useRef, useState} from "react";
import {
    ActivityIndicator, Animated, Easing, Modal, Pressable, ScrollView, StyleSheet, Text,
    useWindowDimensions, View, type GestureResponderEvent, type ScrollViewInstance, type ViewInstance,
} from "react-native";
import {Image} from "expo-image";
import {SymbolView} from "expo-symbols";
import {StatusBar} from "expo-status-bar";
import {useSafeAreaInsets} from "react-native-safe-area-context";
import {useTranslation} from "react-i18next";
import {GestureDetector, GestureHandlerRootView, useTapGesture} from "react-native-gesture-handler";
import {gallerySwipe} from "@/utils/gallerySwipe";
import {useTheme} from "@/context/theme";

type Props = {images: string[]; initialIndex: number; onClose: () => void};
type ImageSize = {width: number; height: number};

const THUMBNAIL_WIDTH = 64;
const THUMBNAIL_GAP = 8;

function clamp(value: number, limit: number) {
    return Math.max(-limit, Math.min(value, limit));
}

function GalleryImage({uri, label, onLoad}: {uri: string; label: string; onLoad: (size: ImageSize) => void}) {
    const {t: tr} = useTranslation();
    const [loading, setLoading] = useState(true);
    const [failed, setFailed] = useState(false);
    const [attempt, setAttempt] = useState(0);
    return (
        <View style={styles.image}>
            <Image
                key={attempt}
                source={{uri}}
                style={styles.image}
                contentFit="contain"
                cachePolicy="memory-disk"
                accessibilityLabel={label}
                onLoad={({source}) => {
                    onLoad(source);
                    setLoading(false);
                }}
                onError={() => {setLoading(false); setFailed(true);}}
            />
            {loading && <ActivityIndicator pointerEvents="none" style={StyleSheet.absoluteFill} color="#FFFFFF"/>}
            {failed && (
                <View style={styles.error} pointerEvents="box-none">
                    <Pressable accessibilityRole="button" style={styles.retry} onPress={() => {
                        setFailed(false);
                        setLoading(true);
                        setAttempt(attempt + 1);
                    }}>
                        <SymbolView name="arrow.clockwise" tintColor="#FFFFFF" style={styles.icon}/>
                        <Text style={styles.text}>{tr("gallery.retry")}</Text>
                    </Pressable>
                </View>
            )}
        </View>
    );
}

export default function ImageGallery({images: initialImages, initialIndex, onClose}: Props) {
    const {t: tr} = useTranslation();
    const {accent} = useTheme();
    const insets = useSafeAreaInsets();
    const windowDimensions = useWindowDimensions();
    const [viewport, setViewport] = useState({x: 0, y: 0, width: windowDimensions.width, height: windowDimensions.height});
    const {width, height} = viewport;
    const stageRef = useRef<ViewInstance>(null);
    const thumbnailsRef = useRef<ScrollViewInstance>(null);
    const [thumbnailViewportWidth, setThumbnailViewportWidth] = useState(0);
    const [images] = useState(initialImages);
    const [index, setIndex] = useState(initialIndex);
    const sizes = useRef<Record<string, ImageSize>>({});
    const [motion] = useState(() => ({
        page: new Animated.Value(-initialIndex * width), dismiss: new Animated.Value(0),
        scale: new Animated.Value(1), x: new Animated.Value(0), y: new Animated.Value(0),
        visibility: new Animated.Value(0),
    }));
    const closing = useRef(false);
    const movement = useRef({dx: 0, dy: 0, vx: 0, vy: 0, lastX: 0, lastY: 0, time: 0});
    const gesture = useRef({
        scale: 1, x: 0, y: 0, startScale: 1, startX: 0, startY: 0,
        touchX: 0, touchY: 0, focalX: 0, focalY: 0, distance: 0,
        pinching: false, hadPinch: false, busy: false, axis: "",
    });

    useEffect(() => {
        const animation = Animated.timing(motion.visibility, {
            toValue: 1, duration: 180, easing: Easing.out(Easing.cubic), useNativeDriver: true,
        });
        animation.start();
        return () => animation.stop();
    }, [motion]);

    useLayoutEffect(() => {
        motion.page.setValue(-index * width);
        motion.dismiss.setValue(0);
        motion.scale.setValue(1);
        motion.x.setValue(0);
        motion.y.setValue(0);
        Object.assign(gesture.current, {scale: 1, x: 0, y: 0, busy: false});
    }, [index, width, height, motion]);

    const centerActiveThumbnail = useCallback(() => {
        if (thumbnailViewportWidth <= 0) return;
        const contentWidth = images.length * (THUMBNAIL_WIDTH + THUMBNAIL_GAP) - THUMBNAIL_GAP + 32;
        const center = 16 + index * (THUMBNAIL_WIDTH + THUMBNAIL_GAP) + THUMBNAIL_WIDTH / 2;
        const offset = Math.max(0, Math.min(center - thumbnailViewportWidth / 2, contentWidth - thumbnailViewportWidth));
        thumbnailsRef.current?.scrollTo({x: offset, animated: true});
    }, [images.length, index, thumbnailViewportWidth]);

    useLayoutEffect(centerActiveThumbnail, [centerActiveThumbnail]);

    function selectThumbnail(target: number) {
        if (closing.current || gesture.current.busy) return;
        if (target !== index) {
            gesture.current.busy = true;
            setIndex(target);
            return;
        }
        motion.scale.setValue(1);
        motion.x.setValue(0);
        motion.y.setValue(0);
        Object.assign(gesture.current, {scale: 1, x: 0, y: 0});
    }

    function animate(value: Animated.Value, toValue: number) {
        return Animated.timing(value, {toValue, duration: 200, useNativeDriver: true});
    }

    function closeGallery(dragOffset = 0) {
        if (closing.current) return;
        closing.current = true;
        motion.page.stopAnimation();
        motion.dismiss.stopAnimation();
        motion.scale.stopAnimation();
        motion.x.stopAnimation();
        motion.y.stopAnimation();
        gesture.current.busy = true;
        const config = {duration: 240, easing: Easing.out(Easing.cubic), useNativeDriver: true};
        const animations = [Animated.timing(motion.visibility, {...config, toValue: 0})];
        if (dragOffset !== 0) {
            animations.push(Animated.timing(motion.dismiss, {
                ...config,
                toValue: dragOffset + Math.sign(dragOffset) * Math.min(height * 0.12, 80),
            }));
        }
        Animated.parallel(animations).start(({finished}) => {
            if (finished) onClose();
            else {
                closing.current = false;
                gesture.current.busy = false;
            }
        });
    }

    function limits(scale: number) {
        const size = sizes.current[images[index]];
        const ratio = size ? size.width / size.height : width / height;
        const imageWidth = Math.min(width, height * ratio);
        return {
            x: Math.max(0, (imageWidth * scale - width) / 2),
            y: Math.max(0, (imageWidth / ratio * scale - height) / 2),
        };
    }

    function settle() {
        gesture.current.busy = true;
        Animated.parallel([animate(motion.page, -index * width), animate(motion.dismiss, 0)]).start(() => {
            gesture.current.busy = false;
        });
    }

    function changePage(direction: number) {
        if (index + direction < 0 || index + direction >= images.length) return;
        gesture.current.busy = true;
        animate(motion.page, -(index + direction) * width).start(({finished}) => {
            if (finished) setIndex(index + direction);
            else gesture.current.busy = false;
        });
    }

    function beginPinch(event: GestureResponderEvent) {
        const [first, second] = event.nativeEvent.touches;
        if (!second) return;
        const state = gesture.current;
        state.pinching = true;
        state.hadPinch = true;
        state.startScale = state.scale;
        state.startX = state.x;
        state.startY = state.y;
        state.distance = Math.max(1, Math.hypot(second.pageX - first.pageX, second.pageY - first.pageY));
        state.focalX = (first.pageX + second.pageX) / 2 - viewport.x - width / 2;
        state.focalY = (first.pageY + second.pageY) / 2 - viewport.y - height / 2;
        motion.page.setValue(-index * width);
        motion.dismiss.setValue(0);
    }

    const doubleTap = useTapGesture({
        numberOfTaps: 2,
        maxDistance: 10,
        disableReanimated: true,
        cancelsJSResponder: false,
        cancelsTouchesInView: false,
        onActivate: (event) => {
            const state = gesture.current;
            if (closing.current || state.busy) return;
            state.scale = state.scale > 1 ? 1 : 3;
            const bounds = limits(state.scale);
            state.x = state.scale === 1 ? 0 : clamp((width / 2 - event.x) * 2, bounds.x);
            state.y = state.scale === 1 ? 0 : clamp((height / 2 - event.y) * 2, bounds.y);
            state.busy = true;
            Animated.parallel([animate(motion.scale, state.scale), animate(motion.x, state.x), animate(motion.y, state.y)]).start(() => {
                state.busy = false;
            });
        },
    });

    const responder = {
        onStartShouldSetResponder: () => !closing.current && !gesture.current.busy,
        onMoveShouldSetResponder: () => !closing.current && !gesture.current.busy,
        onResponderTerminationRequest: () => false,
        onResponderGrant: (event: GestureResponderEvent) => {
            const state = gesture.current;
            const touch = event.nativeEvent.touches[0];
            Object.assign(movement.current, {dx: 0, dy: 0, vx: 0, vy: 0, lastX: touch.pageX, lastY: touch.pageY, time: event.nativeEvent.timestamp});
            state.axis = "";
            state.hadPinch = false;
            state.pinching = false;
            state.startX = state.x;
            state.startY = state.y;
            state.touchX = touch.pageX;
            state.touchY = touch.pageY;
            if (event.nativeEvent.touches.length > 1) beginPinch(event);
        },
        onResponderMove: (event: GestureResponderEvent) => {
            if (closing.current) return;
            const state = gesture.current;
            const [first, second] = event.nativeEvent.touches;
            if (!first) return;
            const move = movement.current;
            const elapsed = Math.max(1, event.nativeEvent.timestamp - move.time);
            move.dx = first.pageX - state.touchX;
            move.dy = first.pageY - state.touchY;
            move.vx = (first.pageX - move.lastX) / elapsed;
            move.vy = (first.pageY - move.lastY) / elapsed;
            move.lastX = first.pageX;
            move.lastY = first.pageY;
            move.time = event.nativeEvent.timestamp;
            if (second) {
                if (!state.pinching) beginPinch(event);
                const distance = Math.hypot(second.pageX - first.pageX, second.pageY - first.pageY);
                state.scale = Math.max(1, Math.min(5, state.startScale * distance / state.distance));
                const change = state.scale / state.startScale;
                const bounds = limits(state.scale);
                state.x = clamp((first.pageX + second.pageX) / 2 - viewport.x - width / 2 - (state.focalX - state.startX) * change, bounds.x);
                state.y = clamp((first.pageY + second.pageY) / 2 - viewport.y - height / 2 - (state.focalY - state.startY) * change, bounds.y);
                motion.scale.setValue(state.scale);
                motion.x.setValue(state.x);
                motion.y.setValue(state.y);
                return;
            }
            if (state.pinching) {
                state.pinching = false;
                state.startX = state.x;
                state.startY = state.y;
                state.touchX = first.pageX;
                state.touchY = first.pageY;
            }
            if (state.scale > 1) {
                const bounds = limits(state.scale);
                state.x = clamp(state.startX + first.pageX - state.touchX, bounds.x);
                state.y = clamp(state.startY + first.pageY - state.touchY, bounds.y);
                motion.x.setValue(state.x);
                motion.y.setValue(state.y);
                return;
            }
            if (state.hadPinch) return;
            // Jedan pokret ima samo jednu namjenu
            if (!state.axis && Math.max(Math.abs(move.dx), Math.abs(move.dy)) > 8) {
                state.axis = Math.abs(move.dx) > Math.abs(move.dy) ? "horizontal" : "vertical";
            }
            if (state.axis === "horizontal") {
                const atEdge = (move.dx > 0 && index === 0) || (move.dx < 0 && index === images.length - 1);
                motion.page.setValue(-index * width + move.dx * (atEdge ? 0.2 : 1));
            } else if (state.axis === "vertical") {
                motion.dismiss.setValue(move.dy);
            }
        },
        onResponderRelease: (event: GestureResponderEvent) => {
            if (closing.current) return;
            const move = movement.current;
            const state = gesture.current;
            if (state.hadPinch) return;
            if (Math.abs(move.dx) < 8 && Math.abs(move.dy) < 8) return;
            if (state.scale > 1) return;
            // Zanemari brzinu nakon zadržavanja prsta
            if (event.nativeEvent.timestamp - move.time > 100) {
                move.vx = 0;
                move.vy = 0;
            }
            const action = gallerySwipe({...move, dx: state.axis === "vertical" ? 0 : move.dx, dy: state.axis === "horizontal" ? 0 : move.dy, width, height, index, count: images.length});
            if (action === "next") changePage(1);
            else if (action === "previous") changePage(-1);
            else if (action === "close") closeGallery(move.dy);
            else settle();
        },
        onResponderTerminate: () => {
            if (!closing.current) settle();
        },
    };

    const dragOpacity = motion.dismiss.interpolate({inputRange: [-height, 0, height], outputRange: [0, 1, 0], extrapolate: "clamp"});
    const opacity = Animated.multiply(dragOpacity, motion.visibility);
    const footerDragOpacity = motion.dismiss.interpolate({inputRange: [-80, 0, 80], outputRange: [0, 1, 0], extrapolate: "clamp"});
    const footerOpacity = Animated.multiply(footerDragOpacity, motion.visibility);
    const dragScale = motion.dismiss.interpolate({inputRange: [-height, 0, height], outputRange: [0.88, 1, 0.88], extrapolate: "clamp"});
    const transitionScale = motion.visibility.interpolate({inputRange: [0, 1], outputRange: [0.96, 1]});
    return (
        <Modal visible transparent animationType="none" presentationStyle="overFullScreen" onRequestClose={() => closeGallery()}>
            <GestureHandlerRootView style={styles.root}>
                <StatusBar style="light"/>
                <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.backdrop, {opacity}]}/>
                <GestureDetector gesture={doubleTap}>
                    <View
                        ref={stageRef}
                        testID="image-gallery-stage"
                        style={styles.stage}
                        onLayout={() => stageRef.current?.measureInWindow((x, y, stageWidth, stageHeight) => {
                            if (stageWidth <= 0 || stageHeight <= 0) return;
                            setViewport(previous => previous.x === x && previous.y === y && previous.width === stageWidth && previous.height === stageHeight
                                ? previous
                                : {x, y, width: stageWidth, height: stageHeight});
                        })}
                        {...responder}
                    >
                        <Animated.View style={[styles.image, {opacity: motion.visibility, transform: [{scale: Animated.multiply(dragScale, transitionScale)}]}]}>
                            <Animated.View style={{width: width * images.length, height, transform: [{translateX: motion.page}, {translateY: motion.dismiss}]}}>
                                {[index - 1, index, index + 1].map((pageIndex) => (
                                    <View key={pageIndex} style={{position: "absolute", left: pageIndex * width, top: 0, width, height}}>
                                        {images[pageIndex] && (
                                            <Animated.View style={[styles.image, pageIndex === index && {transform: [{translateX: motion.x}, {translateY: motion.y}, {scale: motion.scale}]}]}>
                                                <GalleryImage
                                                    uri={images[pageIndex]}
                                                    label={tr("gallery.position", {index: pageIndex + 1, count: images.length})}
                                                    onLoad={(size) => {if (size.width > 0 && size.height > 0) sizes.current[images[pageIndex]] = size;}}
                                                />
                                            </Animated.View>
                                        )}
                                    </View>
                                ))}
                            </Animated.View>
                        </Animated.View>
                    </View>
                </GestureDetector>
                <Animated.View pointerEvents="box-none" testID="image-gallery-footer" style={[styles.footer, {paddingBottom: Math.max(8, insets.bottom), opacity: footerOpacity}]}>
                    <ScrollView
                        ref={thumbnailsRef}
                        testID="image-gallery-thumbnails"
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.thumbnails}
                        style={styles.thumbnailScroll}
                        onLayout={({nativeEvent}) => setThumbnailViewportWidth(nativeEvent.layout.width)}
                        onContentSizeChange={centerActiveThumbnail}
                    >
                        {images.map((uri, thumbnailIndex) => (
                            <Pressable
                                key={uri}
                                testID={`image-gallery-thumbnail-${thumbnailIndex}`}
                                accessibilityRole="button"
                                accessibilityLabel={tr("gallery.open", {index: thumbnailIndex + 1})}
                                accessibilityState={{selected: thumbnailIndex === index}}
                                onPress={() => selectThumbnail(thumbnailIndex)}
                                style={[styles.thumbnail, {borderColor: thumbnailIndex === index ? accent : "transparent"}]}
                            >
                                <Image source={{uri}} style={styles.thumbnailImage} contentFit="cover" cachePolicy="memory-disk" accessible={false}/>
                            </Pressable>
                        ))}
                    </ScrollView>
                    <Text pointerEvents="none" testID="image-gallery-position" style={styles.position} accessibilityLabel={tr("gallery.position", {index: index + 1, count: images.length})}>
                        {index + 1} / {images.length}
                    </Text>
                </Animated.View>
                <Animated.View style={[styles.controls, {top: insets.top + 8, opacity}]}>
                    <Pressable accessibilityRole="button" accessibilityLabel={tr("gallery.close")} onPress={() => closeGallery()} style={styles.close}>
                        <SymbolView name="xmark" tintColor="#FFFFFF" style={styles.icon}/>
                    </Pressable>
                </Animated.View>
            </GestureHandlerRootView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    root: {flex: 1},
    stage: {flex: 1, overflow: "hidden"},
    backdrop: {backgroundColor: "#000000"},
    image: {width: "100%", height: "100%"},
    controls: {position: "absolute", left: 20, right: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between"},
    close: {width: 48, height: 48, borderRadius: 24, backgroundColor: "rgba(40,40,40,0.85)", alignItems: "center", justifyContent: "center"},
    icon: {width: 22, height: 22},
    text: {color: "#FFFFFF", fontSize: 16, fontWeight: "600"},
    footer: {position: "absolute", bottom: 0, left: 0, right: 0, paddingTop: 8, gap: 8, backgroundColor: "transparent"},
    thumbnailScroll: {flexGrow: 0, height: 48},
    thumbnails: {flexGrow: 1, justifyContent: "center", alignItems: "center", gap: THUMBNAIL_GAP, paddingHorizontal: 16},
    thumbnail: {width: THUMBNAIL_WIDTH, height: 48, borderWidth: 2, borderRadius: 8, padding: 2},
    thumbnailImage: {width: "100%", height: "100%", borderRadius: 4},
    position: {color: "#FFFFFF", fontSize: 14, lineHeight: 20, textAlign: "center"},
    error: {position: "absolute", top: 0, right: 0, bottom: 0, left: 0, alignItems: "center", justifyContent: "center"},
    retry: {alignItems: "center", gap: 12, padding: 24},
});
