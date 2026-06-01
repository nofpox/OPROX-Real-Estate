import React, { createContext, useContext, useState, useEffect } from 'react';
import { useGetMe, useLogin, useLogout, AuthUser, AuthCredentials } from '@workspace/api-client-react';

interface PortalAuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: AuthCredentials) => Promise<void>;
  logout: () => Promise<void>;
}

const PortalAuthContext = createContext<PortalAuthContextType>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  login: async () => {},
  logout: async () => {},
});

export const PortalAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: meData, isLoading: isMeLoading } = useGetMe({ query: { retry: false } } as any);

  useEffect(() => {
    if (meData) {
      setUser(meData as unknown as AuthUser);
    } else {
      setUser(null);
    }
  }, [meData]);

  const loginMutation = useLogin();
  const logoutMutation = useLogout();

  const login = async (credentials: AuthCredentials) => {
    const res = await loginMutation.mutateAsync({ data: credentials });
    if (res) {
      // Login response IS the AuthUser (session data returned directly)
      setUser(res as unknown as AuthUser);
    }
  };

  const logout = async () => {
    await logoutMutation.mutateAsync();
    setUser(null);
  };

  return (
    <PortalAuthContext.Provider
      value={{
        user,
        isLoading: isMeLoading || loginMutation.isPending || logoutMutation.isPending,
        isAuthenticated: !!user,
        login,
        logout,
      }}
    >
      {children}
    </PortalAuthContext.Provider>
  );
};

export const usePortalAuth = () => useContext(PortalAuthContext);
