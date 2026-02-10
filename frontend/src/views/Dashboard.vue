<template>
  <div class="dashboard">
    <div class="dashboard-header">
      <h1>Welcome, {{ user?.displayName || user?.username || 'Player' }}!</h1>
      <p>Your gaming dashboard</p>
    </div>
    
    <div class="dashboard-grid">
      <!-- User Profile Card -->
      <div class="dashboard-card profile-card">
        <div class="card-header">
          <h3>Your Profile</h3>
        </div>
        <div class="card-content">
          <div class="profile-info">
            <div class="profile-avatar">
              <img v-if="user?.profileImageUrl" :src="user.profileImageUrl" alt="Profile" />
              <div v-else class="avatar-placeholder">
                {{ user?.username?.charAt(0).toUpperCase() || 'U' }}
              </div>
            </div>
            <div class="profile-details">
              <h4>{{ user?.displayName || user?.username }}</h4>
              <p class="username">@{{ user?.username }}</p>
              <p class="member-since">
                Member since {{ formatDate(user?.createdAt) }}
              </p>
            </div>
          </div>
          
          <div class="profile-stats">
            <div class="stat">
              <div class="stat-value">{{ stats.gamesPlayed }}</div>
              <div class="stat-label">Games Played</div>
            </div>
            <div class="stat">
              <div class="stat-value">{{ stats.wins }}</div>
              <div class="stat-label">Wins</div>
            </div>
            <div class="stat">
              <div class="stat-value">{{ stats.totalScore }}</div>
              <div class="stat-label">Total Score</div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Quick Actions Card -->
      <div class="dashboard-card actions-card">
        <div class="card-header">
          <h3>Quick Actions</h3>
        </div>
        <div class="card-content">
          <button @click="createGame" class="action-btn primary" :disabled="isCreatingGame">
            <span v-if="!isCreatingGame">🎮 Create New Game</span>
            <span v-else>Creating...</span>
          </button>
          
          <div class="join-game">
            <input 
              v-model="joinCode" 
              type="text" 
              placeholder="Enter game code" 
              class="join-input"
              @keyup.enter="joinGame"
            />
            <button @click="joinGame" class="action-btn secondary" :disabled="!joinCode || isJoiningGame">
              <span v-if="!isJoiningGame">Join Game</span>
              <span v-else>Joining...</span>
            </button>
          </div>
          
          <button @click="refreshGames" class="action-btn tertiary">
            🔄 Refresh Games
          </button>
        </div>
      </div>
      
      <!-- Active Games Card -->
      <div class="dashboard-card games-card">
        <div class="card-header">
          <h3>Active Games</h3>
          <span class="badge">{{ activeGames.length }}</span>
        </div>
        <div class="card-content">
          <div v-if="activeGames.length === 0" class="empty-state">
            <p>No active games. Create one to get started!</p>
          </div>
          
          <div v-else class="games-list">
            <div 
              v-for="game in activeGames" 
              :key="game.sessionCode"
              class="game-item"
              @click="joinExistingGame(game.sessionCode)"
            >
              <div class="game-info">
                <div class="game-code">{{ game.sessionCode }}</div>
                <div class="game-host">Host: {{ game.hostUsername }}</div>
              </div>
              <div class="game-stats">
                <div class="players-count">
                  👥 {{ game.currentPlayers }}/{{ game.maxPlayers }}
                </div>
                <div class="game-status" :class="game.status">
                  {{ game.status === 'waiting' ? 'Waiting' : 'Playing' }}
                </div>
              </div>
              <div class="join-arrow">→</div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Leaderboard Card -->
      <div class="dashboard-card leaderboard-card">
        <div class="card-header">
          <h3>Top Players</h3>
        </div>
        <div class="card-content">
          <div v-if="leaderboard.length === 0" class="empty-state">
            <p>No leaderboard data yet</p>
          </div>
          
          <div v-else class="leaderboard-list">
            <div 
              v-for="(player, index) in leaderboard" 
              :key="player.userId"
              class="leaderboard-item"
              :class="{ 'current-user': player.userId === user?.id }"
            >
              <div class="rank">{{ index + 1 }}</div>
              <div class="player-avatar">
                <div class="avatar-small">
                  {{ player.username.charAt(0).toUpperCase() }}
                </div>
              </div>
              <div class="player-info">
                <div class="player-name">{{ player.username }}</div>
                <div class="player-stats">
                  {{ player.totalScore }} pts • {{ player.wins }} wins
                </div>
              </div>
              <div class="player-score">
                {{ player.totalScore }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- WebSocket Status -->
    <div class="websocket-status" :class="wsStatus">
      WebSocket: {{ wsStatus === 'connected' ? 'Connected' : 'Disconnected' }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useAuthStore } from '../stores/auth';
import { useWebSocket } from '../composables/useWebSocket';
import { useRouter } from 'vue-router';

const authStore = useAuthStore();
const { status: wsStatus, sendMessage } = useWebSocket();
const router = useRouter();

const user = computed(() => authStore.user);
const joinCode = ref('');
const isCreatingGame = ref(false);
const isJoiningGame = ref(false);
const activeGames = ref<any[]>([]);
const leaderboard = ref<any[]>([]);
const stats = ref({
  gamesPlayed: 0,
  wins: 0,
  totalScore: 0,
});

const formatDate = (dateString?: string | Date) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short' 
  });
};

const createGame = async () => {
  if (isCreatingGame.value) return;
  
  isCreatingGame.value = true;
  try {
    sendMessage({
      type: 'create_game',
      payload: { maxPlayers: 4 },
    });
    
    // Listen for game_created response
    // In a real implementation, you'd set up a proper event listener
    setTimeout(() => {
      isCreatingGame.value = false;
    }, 2000);
  } catch (error) {
    console.error('Failed to create game:', error);
    isCreatingGame.value = false;
  }
};

const joinGame = () => {
  if (!joinCode.value.trim() || isJoiningGame.value) return;
  
  isJoiningGame.value = true;
  router.push(`/game/${joinCode.value.trim()}`);
};

const joinExistingGame = (sessionCode: string) => {
  router.push(`/game/${sessionCode}`);
};

const refreshGames = async () => {
  try {
    const response = await fetch('/api/game/active');
    if (response.ok) {
      const data = await response.json();
      activeGames.value = data.games || [];
    }
  } catch (error) {
    console.error('Failed to refresh games:', error);
  }
};

const fetchLeaderboard = async () => {
  try {
    const response = await fetch('/api/leaderboard');
    if (response.ok) {
      const data = await response.json();
      leaderboard.value = data.leaderboard || [];
    }
  } catch (error) {
    console.error('Failed to fetch leaderboard:', error);
  }
};

const fetchUserStats = async () => {
  try {
    const response = await fetch('/api/user/stats');
    if (response.ok) {
      const data = await response.json();
      stats.value = data.stats || stats.value;
    }
  } catch (error) {
    console.error('Failed to fetch user stats:', error);
  }
};

onMounted(() => {
  refreshGames();
  fetchLeaderboard();
  fetchUserStats();
  
  // Set up WebSocket message handlers
  // In a real implementation, you'd use the useWebSocket composable
});
</script>

<style scoped>
.dashboard {
  padding: 1rem;
}

.dashboard-header {
  margin-bottom: 2rem;
}

.dashboard-header h1 {
  font-size: 2rem;
  color: #333;
  margin-bottom: 0.5rem;
}

.dashboard-header p {
  color: #666;
  font-size: 1.1rem;
}

.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.dashboard-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  overflow: hidden;
}

.card-header {
  background: linear-gradient(135deg, #6441a5 0%, #2a0845 100%);
  color: white;
  padding: 1rem 1.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-header h3 {
  margin: 0;
  font-size: 1.2rem;
}

.badge {
  background: rgba(255, 255, 255, 0.2);
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.9rem;
  font-weight: 600;
}

.card-content {
  padding: 1.5rem;
}

/* Profile Card */
.profile-info {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.profile-avatar {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  overflow: hidden;
  background: #f0f0f0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.profile-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #6441a5;
  color: white;
  font-size: 2rem;
  font-weight: bold;
}

.profile-details h4 {
  margin: 0 0 0.25rem 0;
  font-size: 1.3rem;
  color: #333;
}

.username {
  color: #666;
  margin: 0 0 0.5rem 0;
  font-size: 0.9rem;
}

.member-since {
  color: #888;
  font-size: 0.85rem;
  margin: 0;
}

.profile-stats {
  display: flex;
  justify-content: space-around;
  border-top: 1px solid #eee;
  padding-top: 1.5rem;
}

.stat {
  text-align: center;
}

.stat-value {
  font-size: 1.8rem;
  font-weight: bold;
  color: #6441a5;
  margin-bottom: 0.25rem;
}

.stat-label {
  font-size: 0.85rem;
  color: #666;
}

/* Actions Card */
.action-btn {
  width: 100%;
  padding: 0.75rem 1rem;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.action-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.action-btn.primary {
  background: #9146ff;
  color: white;
}

.action-btn.primary:hover:not(:disabled) {
  background: #7c3aed;
  transform: translateY(-1px);
}

.action-btn.secondary {
  background: #f0f0f0;
  color: #333;
}

.action-btn.secondary:hover:not(:disabled) {
  background: #e0e0e0;
}

.action-btn.tertiary {
  background: transparent;
  color: #666;
  border: 1px solid #ddd;
}

.action-btn.tertiary:hover {
  background: #f9f9f9;
}

.join-game {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.join-input {
  flex: 1;
  padding: 0.75rem 1rem;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 1rem;
}

.join-input:focus {
  outline: none;
  border-color: #9146ff;
}

/* Games Card */
.empty-state {
  text-align: center;
  padding: 2rem 1rem;
  color: #888;
}

.games-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.game-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem;
  background: #f9f9f9;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.game-item:hover {
  background: #f0f0f0;
  transform: translateX(4px);
}

.game-info {
  flex: 1;
}

.game-code {
  font-weight: bold;
  color: #333;
  margin-bottom: 0.25rem;
}

.game-host {
  font-size: 0.9rem;
  color: #666;
}

.game-stats {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.25rem;
}

.players-count {
  font-size: 0.9rem;
  color: #666;
}

.game-status {
  font-size: 0.8rem;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-weight: 500;
}

.game-status.waiting {
  background: #fff3cd;
  color: #856404;
}

.game-status.playing {
  background: #d4edda;
  color: #155724;
}

.join-arrow {
  margin-left: 1rem;
  color: #9146ff;
  font-weight: bold;
}

/* Leaderboard Card */
.leaderboard-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.leaderboard-item {
  display: flex;
  align-items: center;
  padding: 0.75rem;
  border-radius: 8px;
  transition: background 0.2s;
}

.leaderboard-item:hover {
  background: #f9f9f9;
}

.leaderboard-item.current-user {
  background: #f0e6ff;
  border: 1px solid #d9c6ff;
}

.rank {
  width: 30px;
  font-weight: bold;
  color: #6441a5;
  font-size: 1.1rem;
}

.player-avatar {
  margin: 0 0.75rem;
}

.avatar-small {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #6441a5;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
}

.player-info {
  flex: 1;
}

.player-name {
  font-weight: 500;
  color: #333;
  margin-bottom: 0.1rem;
}

.player-stats {
  font-size: 0.8rem;
  color: #666;
}

.player-score {
  font-weight: bold;
  color: #6441a5;
  font-size: 1.1rem;
}

/* WebSocket Status */
.websocket-status {
  position: fixed;
  bottom: 1rem;
  right: 1rem;
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 500;
  z-index: 1000;
}

.websocket-status.connected {
  background: #d4edda;
  color: #155724;
  border: 1px solid #c3e6cb;
}

.websocket-status.disconnected {
  background: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
}

@media (max-width: 768px) {
  .dashboard-grid {
    grid-template-columns: 1fr;
  }
  
  .websocket-status {
    position: static;
    margin-top: 1rem;
    text-align: center;
  }
}
</style>