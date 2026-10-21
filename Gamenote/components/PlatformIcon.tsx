import {SvgXml} from "react-native-svg";
import {useTheme} from "@/context/theme";
import {PLATFORM_ICONS, PLATFORM_ICON_KEYS} from "@/constants/platformIcons";
import {STATUS_PLATFORM} from "@/common/StatusCommons";

type Props = {
    platform: string;
    size?: number;
};

// Ikona platforme iz Iconify podataka
export default function PlatformIcon({platform, size = 28}: Props) {
    const {themeColors: c} = useTheme();

    const key = PLATFORM_ICON_KEYS[platform];
    const body = key ? PLATFORM_ICONS[key] : undefined;
    if (!body) return null;

    const platformColor = STATUS_PLATFORM[platform]?.text ?? c.text;
    // Bijela ikona je nevidljiva u light modu
    const color = platformColor.toUpperCase() === "#FFFFFF" ? c.text : platformColor;

    const xml = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">${body.replaceAll("currentColor", color)}</svg>`;

    return <SvgXml xml={xml} width={size} height={size}/>;
}
