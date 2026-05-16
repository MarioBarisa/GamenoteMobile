import {router, Stack} from "expo-router";
import {useNavigationTheme} from "@/constants/navigationTheme";
import {Pressable} from "react-native";
import {SymbolView} from "expo-symbols";
import {useTheme} from "@/context/theme";
import {colors} from "@/constants/theme";

// noinspection JSUnusedGlobalSymbols
export default function GroupsLayout() {
    const navTheme = useNavigationTheme();
     const {theme} = useTheme();
     const t = colors[theme];
    return (
        <Stack screenOptions={navTheme}>
            <Stack.Screen
                name="index"
                options={{
                    title: "Grupe",
                    headerRight: () => (
                        <Pressable onPress={() => router.push("/(modals)/addGroupModal")} hitSlop={10}>
                            <SymbolView
                                name={"rectangle.stack.badge.plus"}
                                resizeMode="scaleAspectFit"
                                style={{width: 32, height: 30}}
                                tintColor={t.text}
                            />
                        </Pressable>
                    ),
                }}
            />
            <Stack.Screen
                name="group-detail"
                options={{}}
            />
        </Stack>
    );
}
