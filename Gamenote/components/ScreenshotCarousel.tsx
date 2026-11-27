import {useRef, useState} from "react";
import {Pressable, ScrollView, StyleSheet, type NativeScrollEvent, type NativeSyntheticEvent, type ScrollViewInstance} from "react-native";
import {Image} from "expo-image";
import {useTranslation} from "react-i18next";

type Props = {
    images: string[];
    isLocal: boolean;
    onOpen: (index: number) => void;
};

export default function ScreenshotCarousel({images, isLocal, onOpen}: Props) {
    const {t} = useTranslation();
    const [width, setWidth] = useState(0);
    const scrollView = useRef<ScrollViewInstance>(null);
    const page = useRef(0);
    const restoredWidth = useRef(0);
    if (images.length === 0) return null;
    const imageWidth = Math.max(0, width - 16);
    const pageWidth = imageWidth + 8;

    function rememberPage({nativeEvent}: NativeSyntheticEvent<NativeScrollEvent>) {
        if (!imageWidth || restoredWidth.current !== width || Math.abs(nativeEvent.layoutMeasurement.width - width) > 1) return;
        page.current = Math.max(0, Math.min(images.length - 1, Math.round(nativeEvent.contentOffset.x / pageWidth)));
    }

    function restorePage(contentWidth: number) {
        if (!imageWidth || restoredWidth.current === width || Math.abs(contentWidth - (images.length * pageWidth + 8)) > 1) return;
        restoredWidth.current = width;
        scrollView.current?.scrollTo({x: Math.min(page.current, images.length - 1) * pageWidth, animated: false});
    }

    return (
        <ScrollView ref={scrollView} horizontal decelerationRate="fast" showsHorizontalScrollIndicator={false}
                    onLayout={event => setWidth(event.nativeEvent.layout.width)}
                    onContentSizeChange={restorePage} onScrollEndDrag={rememberPage} onMomentumScrollEnd={rememberPage}
                    contentInsetAdjustmentBehavior="never"
                    snapToInterval={imageWidth ? pageWidth : undefined}
                    contentContainerStyle={styles.content}>
            {imageWidth > 0 && images.map((uri, index) => (
                <Pressable key={uri} accessibilityRole="button" accessibilityLabel={t("gallery.open", {index: index + 1})}
                           onPress={() => onOpen(index)}>
                    <Image source={{uri}} style={[styles.image, {width: imageWidth}]} contentFit="cover"
                           cachePolicy={isLocal ? "memory" : "memory-disk"}
                           transition={{duration: 200, effect: "cross-dissolve"}}/>
                </Pressable>
            ))}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    content: {gap: 8, padding: 8},
    image: {aspectRatio: 16 / 9, borderRadius: 8},
});
