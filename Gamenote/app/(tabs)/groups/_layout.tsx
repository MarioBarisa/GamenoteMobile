import { Stack } from "expo-router";
import {useNavigationTheme} from "@/constants/navigationTheme";

// noinspection JSUnusedGlobalSymbols
export default function GroupsLayout() {
    const navTheme = useNavigationTheme();
    return (
        <Stack screenOptions={navTheme}>
            <Stack.Screen
                name="index"
                options={{
                    title: "Grupe",
                }}
            />
            <Stack.Screen
                name="group-detail"
                options={{}}
            />
        </Stack>
    );
}
