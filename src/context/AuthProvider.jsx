import { useCallback, useMemo, useState } from "react";
import AuthContext from "./authContext";

const DEMO_CREDENTIALS = {
  username: "admin",
  password: "admin123",
};

// eslint-disable-next-line react/prop-types
export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(
    () => sessionStorage.getItem("library-admin-auth") === "true"
  );

  const login = useCallback((username, password) => {
    const isValid =
      username === DEMO_CREDENTIALS.username &&
      password === DEMO_CREDENTIALS.password;

    if (isValid) {
      sessionStorage.setItem("library-admin-auth", "true");
      setIsAuthenticated(true);
    }

    return isValid;
  }, []);

  const logout = useCallback(() => {
    sessionStorage.removeItem("library-admin-auth");
    setIsAuthenticated(false);
  }, []);

  const value = useMemo(
    () => ({ isAuthenticated, login, logout }),
    [isAuthenticated, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
