// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import { AuthProvider } from '@refinedev/core';
import { AuthenticationContextProvider, User } from './types';
import config from '@util/config';

/**
 * Configuration for the auth provider
 */
export interface AuthProviderConfig {
  tokenKey?: string;
  userKey?: string;
}

/**
 * Default auth provider implementation
 */
const ADMIN_EMAIL = config.adminEmail;
const ADMIN_PASSWORD = config.adminPassword;

/**
 * Creates a default permissive auth provider that uses localStorage
 * for persistence and always grants permissions
 */
const createAuthProvider = (
  config: AuthProviderConfig = {},
): AuthProvider & AuthenticationContextProvider => {
  const { tokenKey = 'auth_token', userKey = 'auth_user' } = config;

  const adminUser: User = {
    id: '1',
    name: 'Admin User',
    email: ADMIN_EMAIL,
    roles: ['admin'],
  };

  /**
   * Save token to storage
   */
  const saveToken = (token: string): void => {
    localStorage.setItem(tokenKey, token);
  };

  /**
   * Get token from storage
   */
  const getToken = async (): Promise<string | null> => {
    return localStorage.getItem(tokenKey);
  };

  /**
   * Save user to storage
   */
  const saveUser = (user: User): void => {
    localStorage.setItem(userKey, JSON.stringify(user));
  };

  /**
   * Get user from storage
   */
  const getUser = (): User | null => {
    const userStr = localStorage.getItem(userKey);
    if (!userStr) return null;
    try {
      return JSON.parse(userStr) as User;
    } catch (e) {
      return null;
    }
  };

  /**
   * Get permissions
   */
  const getPermissions = async () => {
    const user = getUser();
    return {
      roles: user?.roles || [],
    };
  };

  // Return the auth provider implementation
  return {
    login: async ({ email, password }) => {
      console.log('login', email, password);
      const response = await fetch(
        'http://localhost:8080/data/user/loginUser',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            phone: email,
            code: password,
          }),
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        return {
          success: false,
          error: {
            message: errorData.message || 'Login failed',
            name: 'Invalid phone or password',
          },
        };
      }

      const data = await response.json();

      // приклад структури: { access_token, user: { roles, ... } }
      saveToken(data.access_token);
      saveUser(data.user); // або адаптуй під потрібний формат

      return {
        success: true,
        redirectTo: '/overview',
      };
    },

    logout: async () => {
      localStorage.removeItem(tokenKey);
      localStorage.removeItem(userKey);

      return {
        success: true,
        redirectTo: '/login',
      };
    },

    check: async () => {
      const token = await getToken();

      if (token) {
        return {
          authenticated: true,
        };
      }

      return {
        authenticated: false,
        redirectTo: '/login',
        error: {
          message: 'Not authenticated',
          name: 'Authentication Error',
        },
      };
    },

    onError: async (error) => {
      console.log(`Authprovider: onError triggered, error: ${error}`);
      // Only logout for auth errors, not schema validation errors
      if (error.statusCode === 401) {
        return {
          logout: true,
        };
      }

      // For other errors, just return an error without logging out
      return {
        error: {
          message: error.message,
          name: error.name,
        },
      };
    },

    getIdentity: async () => {
      const user = getUser();
      if (!user) return null;
      return user;
    },

    getPermissions,

    // AuthenticationContextProvider methods

    getToken,
  };
};

export const authProvider = createAuthProvider();
