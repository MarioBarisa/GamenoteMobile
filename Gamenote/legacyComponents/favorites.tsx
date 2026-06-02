/* import { createContext, useContext, useMemo, useState } from "react";

type FavoriteItem = {
    name: string;
    imageFront?: string;
    id?: number;
};

type FavoritesContextType = {
    favorites: FavoriteItem[];
    toggleFavorite: (item: FavoriteItem) => void;
    isFavorite: (name: string) => boolean;
};


const FavoritesContext = createContext<FavoritesContextType | null>(null);

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
    const [favorites, setFavorites] = useState<FavoriteItem[]>([]);

    const toggleFavorite = (item: FavoriteItem) => {
        setFavorites((prev) => {
            const exists = prev.some((p) => p.name === item.name);
            if (exists) return prev.filter((p) => p.name !== item.name);
            return [...prev, item];
        });
    };

    const isFavorite = (name: string) => favorites.some((p) => p.name === name);
    const value = useMemo(
        () => ({ favorites, toggleFavorite, isFavorite }),
        [favorites]
    );

    return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;

}

export function useFavorites() {
  
    const ctx = useContext(FavoritesContext);
    if (!ctx) throw new Error("useFavorites mora biti unutra FavoritesProvider.")
    return ctx;

}
*/