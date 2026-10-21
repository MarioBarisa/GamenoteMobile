import {Button, HStack, Host, Image, Menu, Text} from "@expo/ui/swift-ui";
import {contentShape, font, foregroundStyle, shapes} from "@expo/ui/swift-ui/modifiers";
import {StyleSheet, View} from "react-native";
import type {ReactElement} from "react";
import {useTheme} from "@/context/theme";

type Option = {label: string; value: string; systemImage?: string};

type Props = {
    label?: string | null;
    systemImage?: string | null;
    iconColor?: string;
    trigger?: ReactElement;
    options: Option[];
    selected?: string | null;
    onSelect: (value: string) => void;
};

const TRIGGER_SIZE = 44;

// Nativni iOS menu za odabir vrijednosti
export default function SelectMenu({label, systemImage, iconColor, trigger, options, selected, onSelect}: Props) {
    const {themeColors: c} = useTheme();

    // Vlastita RN ikona: prikaz gore, nevidljivi menu hvata dodir
    if (trigger) {
        return (
            <View style={styles.triggerWrap}>
                <View pointerEvents="none">{trigger}</View>
                {/* Nevidljivi nativni menu hvata dodir */}
                <Host style={[StyleSheet.absoluteFill, styles.nativeOverlay]}>
                    <Menu
                        label={<Image systemName="circle" size={TRIGGER_SIZE} color="#000000"/>}
                        modifiers={[contentShape(shapes.rectangle())]}
                    >
                        {options.map((option) => (
                            <Button
                                key={option.value}
                                label={option.label}
                                systemImage={(selected === option.value ? "checkmark" : option.systemImage) as any}
                                onPress={() => onSelect(option.value)}
                            />
                        ))}
                    </Menu>
                </Host>
            </View>
        );
    }

    // Ikona gumba, null gasi ikonu
    const icon = systemImage === null ? null : (systemImage ?? "chevron.up.chevron.down");

    // Sadržaj gumba s trenutnom vrijednosti
    const defaultTrigger = (
        <HStack spacing={6}>
            {label ? (
                <Text modifiers={[font({size: 15, weight: "medium"}), foregroundStyle(c.text)]}>
                    {label}
                </Text>
            ) : null}
            {icon ? (
                <Image systemName={icon as any} size={13} color={iconColor ?? c.accent}/>
            ) : null}
        </HStack>
    );

    return (
        <Host matchContents style={{alignSelf: "center"}}>
            <Menu label={defaultTrigger}>
                {options.map((option) => (
                    <Button
                        key={option.value}
                        label={option.label}
                        systemImage={(selected === option.value ? "checkmark" : option.systemImage) as any}
                        onPress={() => onSelect(option.value)}
                    />
                ))}
            </Menu>
        </Host>
    );
}

const styles = StyleSheet.create({
    triggerWrap: {
        width: TRIGGER_SIZE,
        height: TRIGGER_SIZE,
        alignItems: "center",
        justifyContent: "center",
    },
    nativeOverlay: {
        opacity: 0.02, // Alpha mora biti iznad 0.01
    },
});
