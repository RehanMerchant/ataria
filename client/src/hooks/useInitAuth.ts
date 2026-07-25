import { useEffect } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { api } from "../api/axios";

export const useInitAuth = () => {
  const { setAuth, clearAuth, setInitialized } = useAuthStore();

  useEffect(() => {
    const initSession = async () => {
      try {
        // The backend `protect` middleware handles checking and refreshing the cookies
        const { data } = await api.get('/auth/me');
        setAuth(data.data.user);
      } catch (error) {
        // If it fails (401), they aren't logged in. Clear any ghost state.
        clearAuth();
      } finally {
        // Tell React it is safe to render the app now
        setInitialized();
      }
    };

    initSession();
  }, [setAuth, clearAuth, setInitialized]);
};