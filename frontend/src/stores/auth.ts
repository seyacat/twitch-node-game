import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { User } from '@shared';
import { useWebSocket } from '../composables/useWebSocket';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null);
  const token = ref<string | null>(localStorage.getItem('auth_token'));
  const isLoading = ref(false);
  
  // Initialize from localStorage
  if (token.value) {
    const savedUser = localStorage.getItem('auth_user');
    if (savedUser) {
      try {
        user.value = JSON.parse(savedUser);
      } catch (error) {
        console.error('Failed to parse saved user:', error);
        clearAuth();
      }
    }
  }
  
  const isAuthenticated = computed(() => !!token.value && !!user.value);
  
  const setAuth = (newToken: string, newUser: User) => {
    token.value = newToken;
    user.value = newUser;
    
    localStorage.setItem('auth_token', newToken);
    localStorage.setItem('auth_user', JSON.stringify(newUser));
    
    // Initialize WebSocket connection after authentication
    const { connect } = useWebSocket();
    connect(newToken);
  };
  
  const clearAuth = () => {
    token.value = null;
    user.value = null;
    
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    
    // Close WebSocket connection
    const { disconnect } = useWebSocket();
    disconnect();
  };
  
  const loginWithTwitch = () => {
    window.location.href = '/auth/twitch';
  };
  
  const logout = () => {
    clearAuth();
  };
  
  const refreshToken = async (): Promise<boolean> => {
    try {
      const refreshToken = localStorage.getItem('refresh_token');
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }
      
      const response = await fetch('/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
      });
      
      if (!response.ok) {
        throw new Error('Token refresh failed');
      }
      
      const data = await response.json();
      
      if (data.success && data.token) {
        token.value = data.token;
        localStorage.setItem('auth_token', data.token);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Token refresh error:', error);
      clearAuth();
      return false;
    }
  };
  
  return {
    user,
    token,
    isLoading,
    isAuthenticated,
    setAuth,
    clearAuth,
    loginWithTwitch,
    logout,
    refreshToken,
  };
});