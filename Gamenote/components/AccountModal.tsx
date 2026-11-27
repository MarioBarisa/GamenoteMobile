import type {ComponentPropsWithRef, ReactNode} from "react";
import {screenContent} from "@/constants/layout";
import {ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, type TextInputProps} from "react-native";
import {useTheme} from "@/context/theme";
import PasswordInput from "@/components/PasswordInput";

export function AccountModal({children, adjustForKeyboard = true, scrollProps}: {
    children: ReactNode;
    adjustForKeyboard?: boolean;
    scrollProps?: Pick<ComponentPropsWithRef<typeof ScrollView>, "ref" | "contentInset" | "onScroll" | "scrollEventThrottle">;
}) {
    const {themeColors} = useTheme();
    return (
        <ScrollView style={{backgroundColor: themeColors.backgroundModal}}
                    contentContainerStyle={[screenContent.form, styles.content]}
                    contentInsetAdjustmentBehavior="automatic"
                    keyboardShouldPersistTaps={adjustForKeyboard ? "handled" : "always"}
                    keyboardDismissMode={adjustForKeyboard ? "none" : "on-drag"}
                    automaticallyAdjustKeyboardInsets={adjustForKeyboard}
                    {...scrollProps}>
            {children}
        </ScrollView>
    );
}

export function ModalText({children, error = false}: {children: ReactNode; error?: boolean}) {
    const {themeColors} = useTheme();
    return (
        <Text accessibilityRole={error ? "alert" : undefined}
              style={{fontSize: 16, color: error ? themeColors.destructive : themeColors.text}}>
            {children}
        </Text>
    );
}

export function ModalInput(props: TextInputProps) {
    const {themeColors} = useTheme();
    const Input = props.secureTextEntry ? PasswordInput : TextInput;
    return <Input placeholderTextColor={themeColors.secondaryText}
                  style={[styles.input, {color: themeColors.text, backgroundColor: themeColors.background}]}
                  {...props}/>;
}

export function ModalButton({label, onPress, disabled, busy, secondary, destructive}: {
    label: string;
    onPress: () => void;
    disabled?: boolean;
    busy?: boolean;
    secondary?: boolean;
    destructive?: boolean;
}) {
    const {themeColors} = useTheme();
    const foreground = destructive ? themeColors.destructive : themeColors.accent;
    return (
        <Pressable accessibilityRole="button" accessibilityLabel={label}
                   accessibilityState={{disabled: Boolean(disabled || busy), busy: Boolean(busy)}}
                   onPress={onPress} disabled={disabled || busy}
                   style={({pressed}) => [styles.button, {
                       backgroundColor: secondary ? themeColors.background : foreground,
                       opacity: disabled ? 0.45 : pressed ? 0.65 : 1,
                   }]}>
            {busy ? <ActivityIndicator color={secondary ? foreground : "white"}/> :
                <Text style={{fontSize: 16, fontWeight: "700", color: secondary ? foreground : "white"}}>{label}</Text>}
        </Pressable>
    );
}

const styles = StyleSheet.create({
    content: {padding: 24, gap: 16},
    input: {borderRadius: 10, padding: 12, minHeight: 44, fontSize: 16},
    button: {borderRadius: 28, minHeight: 48, padding: 12, alignItems: "center", justifyContent: "center"},
});
