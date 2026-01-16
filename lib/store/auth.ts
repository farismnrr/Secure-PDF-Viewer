import { create } from "zustand";

interface User {
    id: string;
    username: string;
    email: string;
    role: string;
    tenant_id: string;
}

interface AuthState {
    accessToken: string | null;
    user: User | null;
    isAuthenticated: boolean;
    isInitializing: boolean;
    setAccessToken: (token: string | null) => void;
    clearAuth: () => void;
    logout: () => void;
    refresh: () => Promise<void>;
    fetchUser: () => Promise<void>;
    initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
    accessToken: null,
    user: null,
    isAuthenticated: false,
    isInitializing: true,

    setAccessToken: (token) => {
        set({
            accessToken: token,
            isAuthenticated: !!token,
        });
        if (token) {
            get().fetchUser();
        }
    },

    clearAuth: () => {
        set({
            accessToken: null,
            user: null,
            isAuthenticated: false,
        });
    },

    logout: () => {
        // Clear state
        get().clearAuth();
    },

    refresh: async () => {
        try {
            const SSO_URL = process.env.NEXT_PUBLIC_SSO_URL;
            const API_KEY = process.env.NEXT_PUBLIC_API_KEY;

            if (!SSO_URL) {
                throw new Error("NEXT_PUBLIC_SSO_URL is not configured");
            }
            if (!API_KEY) {
                throw new Error("NEXT_PUBLIC_API_KEY is not configured");
            }

            // Direct call to Service (Cross-Origin)
            const response = await fetch(`${SSO_URL}/auth/refresh`, {
                method: "GET",
                headers: {
                    "Accept": "application/json",
                    "X-API-Key": API_KEY
                },
                credentials: "include", // Sends the SameSite=None cookie
            });

            if (response.ok) {
                const data = await response.json();
                // Backend returns { data: { access_token: "..." } } structure
                const token = data.data?.access_token || data.access_token;

                if (token) {
                    set({
                        accessToken: token,
                        isAuthenticated: true,
                    });
                    // Fetch user after refresh
                    await get().fetchUser();
                }
            } else {
                // If refresh fails (e.g., 401), clear auth
                get().clearAuth();
            }
        } catch (error) {
            console.error("Failed to refresh token", error);
            get().clearAuth();
        }
    },

    fetchUser: async () => {
        const { accessToken } = get();
        if (!accessToken) return;

        try {
            const res = await fetch("/api/auth/user", {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            });

            if (res.ok) {
                const userData = await res.json();
                // Response from /auth/verify is { status: true, data: { user: {...} } }
                set({ user: userData.data?.user || userData.data || userData });
            }
        } catch (error) {
            console.error("Fetch user failed:", error);
        }
    },

    initialize: async () => {
        // If we already have a token (e.g. from callback), just fetch user
        if (get().accessToken) {
            await get().fetchUser();
            set({ isInitializing: false });
            return;
        }
        set({ isInitializing: true });
        await get().refresh();
        set({ isInitializing: false });
    },
}));
