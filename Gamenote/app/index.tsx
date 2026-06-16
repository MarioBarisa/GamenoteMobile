import {useLayoutEffect} from "react";
import {useRouter} from "expo-router";
import {useAuth} from "@/context/auth";

export default function Index() {
    const {loggedIn} = useAuth();
    const router = useRouter();

    useLayoutEffect(() => {
        router.replace(loggedIn ? "/(tabs)/home" : "/(tabs)/profile");
    }, [loggedIn, router]);

    return null;
}
