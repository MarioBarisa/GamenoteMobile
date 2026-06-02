import {createContext, ReactNode, useContext, useMemo, useState} from "react";

type AuthContextValue = {
    loggedIn: boolean;
    username: string;
    setLoggedIn: (value: boolean) => void;
    setUsername: (value: string) => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({children}: { children: ReactNode }) {
    const [loggedIn, setLoggedIn] = useState(false);
    const [username, setUsername] = useState("");

    const value = useMemo(
        () => ({loggedIn, username, setLoggedIn, setUsername}),
        [loggedIn, username]
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used within AuthProvider");
    return ctx;
}
