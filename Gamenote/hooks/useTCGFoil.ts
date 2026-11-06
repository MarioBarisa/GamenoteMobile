import {useIsFocused} from "expo-router";
import {useSettings} from "@/context/settings";

export type FoilVariant = "gold" | "holo" | "prism";

export function getFoilVariant(rating: number | undefined, achievementPercent: number): FoilVariant | null {
    const completed = achievementPercent === 100;
    if (completed && rating === 5) return "prism";
    if (completed) return "gold";
    if (rating === 5) return "holo";
    return null;
}

export function useTCGFoil(rating: number | undefined, achievementPercent: number) {
    const {tcgMode, tcgSettingsLoaded} = useSettings();
    const isFocused = useIsFocused();
    if (!tcgMode || !tcgSettingsLoaded || !isFocused) return null;
    return getFoilVariant(rating, achievementPercent);
}
