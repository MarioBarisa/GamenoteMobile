import {Redirect} from "expo-router";
import {useAuth} from "@/context/auth";


//FALSE -> REDIRECT RADI,  TRUE -> REDIRECT NE RADI
const DEV_IGNORE_REDIRECT_PROFILE = true;

export default function Index() {
    const {loggedIn} = useAuth();

    if (DEV_IGNORE_REDIRECT_PROFILE) {
        return <Redirect href="/(tabs)/home"/>;
    }

    return <Redirect href={loggedIn ? "/(tabs)/home" : "/(tabs)/profile"}/>;
}
