import {SvgXml} from "react-native-svg";
import {SymbolView} from "expo-symbols";
import {useTheme} from "@/context/theme";
import {PLATFORM_ICONS, PLATFORM_ICON_KEYS} from "@/constants/platformIcons";
import {useGamePresentation} from "@/context/localMode";
import {STATUS_PLATFORM} from "@/common/StatusCommons";

type Props = {
    platform: string;
    size?: number;
    colorOverride?: string;
    fallback?: boolean;
};

// Ikona platforme iz Iconify podataka
export default function PlatformIcon({platform, size = 28, colorOverride, fallback = false}: Props) {
    const {themeColors: c} = useTheme();

    const {isLocal, platformStyle} = useGamePresentation();
    const platformColor = colorOverride ?? (isLocal ? platformStyle(platform)?.text : STATUS_PLATFORM[platform]?.text) ?? c.text;
    // Bijela ikona je nevidljiva u light modu
    const color = platformColor.toUpperCase() === "#FFFFFF" ? c.text : platformColor;
    const key = Object.hasOwn(PLATFORM_ICON_KEYS, platform) ? PLATFORM_ICON_KEYS[platform] : undefined;
    const body = key ? PLATFORM_ICONS[key] : undefined;
    if (!body) {
        return isLocal || fallback ? <SymbolView name="gamecontroller.fill" size={size} tintColor={color}/> : null;
    }

    const xml = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">${body.replaceAll("currentColor", color)}</svg>`;

    return <SvgXml xml={xml} width={size} height={size}/>;
}
