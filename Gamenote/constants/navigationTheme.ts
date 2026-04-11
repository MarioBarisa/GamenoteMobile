
import {colors} from "@/constants/theme";
import {useTheme} from "@/context/theme";

export function useNavigationTheme() {

    const {theme} = useTheme();
    const t = colors[theme];

    return {
        headerStyle: { backgroundColor: t.background },
        headerLargeStyle: { backgroundColor: t.background },
        headerTitleStyle: { color: t.text },
        headerLargeTitleStyle: { color: t.text },
        headerTintColor: t.accent,
        contentStyle: { backgroundColor: t.background },
    };

}

