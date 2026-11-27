import {useEffect, useState} from "react";
import {ActivityIndicator, Pressable, StyleSheet, Text, View} from "react-native";
import {Image} from "expo-image";
import {SymbolView} from "expo-symbols";
import {useTranslation} from "react-i18next";
import {ModalInput} from "@/components/AccountModal";
import {useTheme} from "@/context/theme";
import {localImageUrl} from "@/services/localData";

function ImageLinkPreview({url, poster}: {url: string; poster: boolean}) {
    const {t} = useTranslation();
    const {themeColors} = useTheme();
    const [checking, setChecking] = useState(false);
    const [status, setStatus] = useState<"loading" | "loaded" | "failed">("loading");

    useEffect(() => {
        const timer = setTimeout(() => setChecking(true), 600);
        return () => clearTimeout(timer);
    }, []);

    const loaded = status === "loaded";
    const failed = status === "failed";

    return (
        <View style={styles.previewRow}>
            {checking && !failed && (
                <Image source={url} cachePolicy="memory" contentFit="contain" accessible={false}
                       style={[styles.preview, poster && styles.poster, {backgroundColor: themeColors.backgroundModal}]}
                       onLoad={() => setStatus("loaded")} onError={() => setStatus("failed")}/>
            )}
            {status === "loading" && <ActivityIndicator color={themeColors.accent} accessible={false}/>}
            {loaded && <SymbolView name="checkmark.circle.fill" size={18} tintColor={themeColors.accent}/>}
            {failed && <SymbolView name="exclamationmark.circle" size={18} tintColor={themeColors.destructive}/>}
            <View style={styles.status}>
                <Text style={{color: failed ? themeColors.destructive : themeColors.secondaryText}}>
                    {t(loaded ? "screens.localMode.imageLinkLoaded"
                        : failed ? "screens.localMode.imageLinkFailed" : "screens.localMode.imageLinkLoading")}
                </Text>
                {failed && (
                    <Pressable accessibilityRole="button" onPress={() => setStatus("loading")} style={styles.retry}>
                        <Text style={{color: themeColors.accent, fontWeight: "600"}}>
                            {t("screens.localMode.retryImageLink")}
                        </Text>
                    </Pressable>
                )}
            </View>
        </View>
    );
}

type Props = {
    label: string;
    value: string;
    onChangeText: (value: string) => void;
    poster?: boolean;
    autoFocus?: boolean;
    onRemove?: () => void;
    removeLabel?: string;
};

export default function LocalImageLinkInput({label, value, onChangeText, poster = false, autoFocus, onRemove, removeLabel}: Props) {
    const {t} = useTranslation();
    const {themeColors} = useTheme();
    const input = value.trim();
    const url = localImageUrl(input);

    return (
        <View style={styles.group}>
            <Text style={[styles.label, {color: themeColors.text}]}>{label}</Text>
            <View style={styles.controls}>
                <View style={styles.field}>
                    <ModalInput accessibilityLabel={label} value={value} onChangeText={onChangeText}
                                placeholder="https://" inputMode="url" autoFocus={autoFocus} autoCapitalize="none"
                                autoCorrect={false} spellCheck={false}/>
                </View>
                {onRemove && (
                    <Pressable accessibilityRole="button" accessibilityLabel={removeLabel} onPress={onRemove}
                               style={styles.remove}>
                        <SymbolView name="minus.circle" size={20} tintColor={themeColors.destructive}/>
                    </Pressable>
                )}
            </View>
            {url ? <ImageLinkPreview key={url} url={url} poster={poster}/> : input ? (
                <Text style={{color: themeColors.destructive}}>{t("screens.localMode.invalidGameImageUrl")}</Text>
            ) : null}
        </View>
    );
}

const styles = StyleSheet.create({
    group: {gap: 6},
    label: {fontSize: 15, fontWeight: "600"},
    controls: {flexDirection: "row", alignItems: "center", gap: 4},
    field: {flex: 1, minWidth: 0},
    remove: {width: 44, height: 44, alignItems: "center", justifyContent: "center"},
    previewRow: {flexDirection: "row", alignItems: "center", gap: 8},
    preview: {width: 72, height: 42, borderRadius: 6},
    poster: {width: 45, height: 60},
    status: {flex: 1},
    retry: {minHeight: 44, justifyContent: "center", alignSelf: "flex-start"},
});
