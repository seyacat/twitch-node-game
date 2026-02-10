<template>
  <div id="app">
    <header class="app-header">
      <div class="container">
        <div class="header-content">
          <h1 class="logo">Twitch Game</h1>
          <nav class="nav">
            <router-link to="/" class="nav-link">Home</router-link>
            <router-link to="/dashboard" class="nav-link">Dashboard</router-link>
            <button v-if="authStore.isAuthenticated" @click="handleLogout" class="logout-btn">
              Logout
            </button>
            <router-link v-else to="/login" class="login-btn">
              Login with Twitch
            </router-link>
          </nav>
        </div>
      </div>
    </header>
    
    <main class="app-main">
      <div class="container">
        <router-view />
      </div>
    </main>
    
    <footer class="app-footer">
      <div class="container">
        <p>Twitch Node Game &copy; {{ new Date().getFullYear() }}</p>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from './stores/auth';
import { useRouter } from 'vue-router';

const authStore = useAuthStore();
const router = useRouter();

const handleLogout = () => {
  authStore.logout();
  router.push('/login');
};
</script>

<style scoped>
#app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
}

.app-header {
  background: linear-gradient(135deg, #6441a5 0%, #2a0845 100%);
  color: white;
  padding: 1rem 0;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.logo {
  font-size: 1.8rem;
  font-weight: bold;
  margin: 0;
}

.nav {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.nav-link {
  color: white;
  text-decoration: none;
  font-weight: 500;
  transition: opacity 0.2s;
}

.nav-link:hover {
  opacity: 0.8;
}

.nav-link.router-link-active {
  border-bottom: 2px solid white;
}

.login-btn, .logout-btn {
  background: #9146ff;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}

.login-btn:hover, .logout-btn:hover {
  background: #7c3aed;
}

.app-main {
  flex: 1;
  padding: 2rem 0;
  background: #f5f5f5;
}

.app-footer {
  background: #333;
  color: white;
  text-align: center;
  padding: 1rem 0;
  margin-top: auto;
}
</style>