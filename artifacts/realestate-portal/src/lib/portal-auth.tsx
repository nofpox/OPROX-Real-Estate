import React, { createContext, useContext, useState, useEffect } from 'react';
import { useGetMe, useLogin, useLogout, AuthUser, AuthCredentials } from '@workspace/api-client-react';

interface PortalAuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: AuthCredentials) => Promise<AuthUser | null>;
  logout: () => Promise<void>;
}

const DEV_ADMIN: AuthUser = {
  id: 1,
  username: 'admin',
  displayName: 'Administrator',
  email: 'admin@rkz.info',
  role: 'owner',
  isActive: true,
  createdAt: new Date().toISOString(),
  mustChangePassword: false,
} as unknown as AuthUser;

const PortalAuthContext = createContext<PortalAuthContextType>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  login: async () => null,
  logout: async () => {},
});

export const PortalAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isDev = import.meta.env.DEV;

  const [user, setUser] = useState<AuthUser | null>(isDev ? DEV_ADMIN : null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: meData, isLoading: isMeLoading } = useGetMe({ query: { retry: false, enabled: !isDev } } as any);

  useEffect(() => {
    if (isDev) return;
    if (meData) {
      setUser(meData as unknown as AuthUser);
    } else {
      setUser(null);
    }
  }, [meData, isDev]);

  const loginMutation = useLogin();
  const logoutMutation = useLogout();

  const login = async (credentials: AuthCredentials): Promise<AuthUser | null> => {
    if (isDev) return DEV_ADMIN;
    const res = await loginMutation.mutateAsync({ data: credentials });
    if (res) {
      const authedUser = res as unknown as AuthUser;
      setUser(authedUser);
      return authedUser;
    }
    return null;
  };

  const logout = async () => {
    if (isDev) return;
    await logoutMutation.mutateAsync();
    setUser(null);
  };

  return (
    <PortalAuthContext.Provider
      value={{
        user,
        isLoading: isDev ? false : (isMeLoading || loginMutation.isPending || logoutMutation.isPending),
        isAuthenticated: isDev ? true : !!user,
        login,
        logout,
      }}
    >
      {children}
    </PortalAuthContext.Provider>
  );
};

export const usePortalAuth = () => useContext(PortalAuthContext);
