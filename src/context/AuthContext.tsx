import React, { createContext, useState, useContext, useEffect } from "react";
import { User, UserRole, AuthContextType } from "../types";
import toast from "react-hot-toast";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const USER_STORAGE_KEY = "business_nexus_user";
const TOKEN_STORAGE_KEY = "business_nexus_token";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

interface BackendUser {
  id: number | string;
  full_name: string;
  email: string;
  role: UserRole;
  bio?: string;
  created_at?: string;
}

function mapBackendUser(backendUser: BackendUser): User {
  return {
    id: String(backendUser.id),
    name: backendUser.full_name,
    email: backendUser.email,
    role: backendUser.role,
    avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(
      backendUser.full_name,
    )}&background=random`,
    bio: backendUser.bio || "",
    isOnline: true,
    createdAt: backendUser.created_at || new Date().toISOString(),
  };
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem(USER_STORAGE_KEY);
    const storedToken = localStorage.getItem(TOKEN_STORAGE_KEY);

    if (storedUser && storedToken) {
      setUser(JSON.parse(storedUser));
    }

    setIsLoading(false);
  }, []);

  const login = async (
    email: string,
    password: string,
    role: UserRole,
  ): Promise<void> => {
    setIsLoading(true);

    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Login failed");
      }

      if (data.user.role !== role) {
        throw new Error(
          `This account is registered as ${data.user.role}, not ${role}`,
        );
      }

      const mappedUser = mapBackendUser(data.user);

      setUser(mappedUser);

      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(mappedUser));

      localStorage.setItem(TOKEN_STORAGE_KEY, data.token);

      toast.success("Successfully logged in!");
    } catch (error) {
      toast.error((error as Error).message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (
    name: string,
    email: string,
    password: string,
    role: UserRole,
  ): Promise<void> => {
    setIsLoading(true);

    try {
      const res = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          full_name: name,
          email,
          password,
          role,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Registration failed");
      }

      const mappedUser = mapBackendUser(data.user);

      setUser(mappedUser);

      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(mappedUser));

      localStorage.setItem(TOKEN_STORAGE_KEY, data.token);

      toast.success("Account created successfully!");
    } catch (error) {
      toast.error((error as Error).message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const forgotPassword = async (email: string): Promise<void> => {
    void email;

    toast.error("Password reset is not available yet");
    throw new Error("Not implemented");
  };

  const resetPassword = async (
    token: string,
    newPassword: string,
  ): Promise<void> => {
    void token;
    void newPassword;

    toast.error("Password reset is not available yet");
    throw new Error("Not implemented");
  };

  const logout = (): void => {
    setUser(null);

    localStorage.removeItem(USER_STORAGE_KEY);
    localStorage.removeItem(TOKEN_STORAGE_KEY);

    toast.success("Logged out successfully");
  };

  const updateProfile = async (
    userId: string,
    updates: Partial<User>,
  ): Promise<void> => {
    try {
      const token = localStorage.getItem(TOKEN_STORAGE_KEY);

      const res = await fetch(`${API_URL}/profile/me`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          bio: updates.bio,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Update failed");
      }

      if (user?.id === userId) {
        const updatedUser = {
          ...user,
          ...updates,
        };

        setUser(updatedUser);

        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updatedUser));
      }

      toast.success("Profile updated successfully");
    } catch (error) {
      toast.error((error as Error).message);
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    login,
    register,
    logout,
    forgotPassword,
    resetPassword,
    updateProfile,
    isAuthenticated: !!user,
    isLoading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
};
