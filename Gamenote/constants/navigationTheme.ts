import {colors} from "@/constants/theme";
import {useTheme} from "@/context/theme";

export function useNavigationTheme() {

    const {theme} = useTheme();
    const t = colors[theme];

    return {
        headerLargeTitle: true,
        headerTransparent: true,
       // headerBlurEffect: "systemUltraThinMaterial", // loš pre-iOS26 look
        headerStyle: { backgroundColor: "transparent" },
        headerLargeStyle: { backgroundColor: "transparent" },
        headerTitleStyle: { color: t.text },
        headerLargeTitleStyle: { color: t.text },
        headerTintColor: t.accent,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: t.background },
    };

}
