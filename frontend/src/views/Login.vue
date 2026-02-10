<template>
  <div class="login-container">
    <div class="login-card">
      <div class="login-header">
        <h2>Welcome to Twitch Game</h2>
        <p>Connect with your Twitch account to start playing</p>
      </div>
      
      <div class="login-content">
        <div class="features">
          <div class="feature">
            <div class="feature-icon">🎮</div>
            <h3>Real-time Multiplayer</h3>
            <p>Play with friends in real-time using WebSocket technology</p>
          </div>
          
          <div class="feature">
            <div class="feature-icon">🏆</div>
            <h3>Leaderboards</h3>
            <p>Compete with other players and climb the global rankings</p>
          </div>
          
          <div class="feature">
            <div class="feature-icon">💬</div>
            <h3>Integrated Chat</h3>
            <p>Chat with other players during gameplay</p>
          </div>
        </div>
        
        <div class="login-actions">
          <button @click="handleLogin" class="twitch-login-btn" :disabled="isLoading">
            <span class="twitch-icon">
              <svg viewBox="0 0 24 24" width="24" height="24">
                <path fill="currentColor" d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z"/>
              </svg>
            </span>
            <span v-if="!isLoading">Login with Twitch</span>
            <span v-else>Connecting...</span>
          </button>
          
          <p class="login-note">
            By logging in, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
      
      <div v-if="error" class="error-message">
        {{ error }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useAuthStore } from '../stores/auth';
import { useRouter } from 'vue-router';

const authStore = useAuthStore();
const router = useRouter();

const isLoading = ref(false);
const error = ref('');

const handleLogin = () => {
  isLoading.value = true;
  error.value = '';
  
  try {
    authStore.loginWithTwitch();
  } catch (err) {
    error.value = 'Failed to initiate login. Please try again.';
    isLoading.value = false;
  }
};
</script>

<style scoped>
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 70vh;
  padding: 2rem;
}

.login-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
  padding: 3rem;
  max-width: 800px;
  width: 100%;
}

.login-header {
  text-align: center;
  margin-bottom: 2.5rem;
}

.login-header h2 {
  font-size: 2rem;
  color: #333;
  margin-bottom: 0.5rem;
}

.login-header p {
  color: #666;
  font-size: 1.1rem;
}

.login-content {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 3rem;
  align-items: center;
}

.features {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.feature {
  text-align: center;
  padding: 1.5rem;
  background: #f8f9fa;
  border-radius: 8px;
  transition: transform 0.2s, box-shadow 0.2s;
}

.feature:hover {
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
}

.feature-icon {
  font-size: 2rem;
  margin-bottom: 1rem;
}

.feature h3 {
  font-size: 1.2rem;
  color: #333;
  margin-bottom: 0.5rem;
}

.feature p {
  color: #666;
  font-size: 0.9rem;
  line-height: 1.4;
}

.login-actions {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.twitch-login-btn {
  background: #9146ff;
  color: white;
  border: none;
  padding: 1rem 2rem;
  border-radius: 8px;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  transition: background 0.2s, transform 0.2s;
  width: 100%;
  justify-content: center;
  margin-bottom: 1.5rem;
}

.twitch-login-btn:hover:not(:disabled) {
  background: #7c3aed;
  transform: translateY(-1px);
}

.twitch-login-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.twitch-icon {
  display: flex;
  align-items: center;
}

.login-note {
  color: #666;
  font-size: 0.85rem;
  text-align: center;
  line-height: 1.4;
}

.error-message {
  background: #fee;
  color: #c33;
  padding: 1rem;
  border-radius: 6px;
  margin-top: 1.5rem;
  text-align: center;
  border: 1px solid #fcc;
}

@media (max-width: 768px) {
  .login-content {
    grid-template-columns: 1fr;
    gap: 2rem;
  }
  
  .login-card {
    padding: 2rem;
  }
}
</style>