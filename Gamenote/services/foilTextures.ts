import {Image, type ImageRef} from "expo-image";

export const foilTextures = {
    gold: require("@/assets/tcg/foil-gold.png"),
    holo: require("@/assets/tcg/foil-spectrum.png"),
    prism: require("@/assets/tcg/foil-prism.png"),
    prismCover: require("@/assets/tcg/cover-prism.png"),
};

export type FoilTexture = keyof typeof foilTextures;

const loaded = new Map<FoilTexture, ImageRef | null>();
const listeners = new Set<() => void>();
let preload: Promise<unknown> | undefined;

export function preloadFoilTextures() {
    preload ??= Promise.all((Object.keys(foilTextures) as FoilTexture[]).map(async key => {
        try {
            loaded.set(key, await Image.loadAsync(foilTextures[key]));
        } catch {
            loaded.set(key, null);
        }
        for (const listener of listeners) listener();
    }));
    return preload;
}

export function getFoilTexture(key: FoilTexture) {
    return loaded.get(key);
}

export function onFoilTexturesChanged(listener: () => void) {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
}
