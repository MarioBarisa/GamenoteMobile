import {useState} from "react";
import {Pressable, StyleSheet, TextInput, View, type StyleProp, type TextInputProps, type ViewStyle} from "react-native";
import {SymbolView} from "expo-symbols";
import {useTranslation} from "react-i18next";
import {useTheme} from "@/context/theme";

export default function PasswordInput({containerStyle, editable = true, style, ...props}: TextInputProps & {
    containerStyle?: StyleProp<ViewStyle>;
}) {
    const {t} = useTranslation();
    const {themeColors} = useTheme();
    const [masked, setMasked] = useState(false);
    const showPassword = !masked && editable;

    return (
        <View style={[styles.row, containerStyle]}>
            <TextInput {...props} style={[style, styles.field]} editable={editable}
                       secureTextEntry={!showPassword} autoCapitalize="none" autoCorrect={false} spellCheck={false}/>
            <Pressable accessibilityRole="button" accessibilityLabel={t(showPassword ? "profile.hidePassword" : "profile.showPassword")}
                       style={styles.visibility} disabled={!editable} onPress={() => setMasked(value => !value)}>
                <SymbolView name={showPassword ? "eye.slash.fill" : "eye.fill"} size={20} tintColor={themeColors.accent}/>
            </Pressable>
        </View>
    );
}

const styles = StyleSheet.create({
    row: {flexDirection: "row", alignItems: "center", gap: 8},
    field: {flex: 1},
    visibility: {width: 44, height: 44, alignItems: "center", justifyContent: "center"},
});
