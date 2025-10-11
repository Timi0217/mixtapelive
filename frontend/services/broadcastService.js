import api from './api';

class BroadcastService {
  // Start a broadcast
  async startBroadcast(caption) {
    try {
      const response = await api.post('/broadcasts/start', { caption });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Stop a broadcast
  async stopBroadcast(broadcastId) {
    try {
      const response = await api.post('/broadcasts/stop', { broadcastId });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Get all live broadcasts
  async getLiveBroadcasts(limit = 50) {
    try {
      const response = await api.get('/broadcasts/live', {
        params: { limit },
      });
      return response.data.broadcasts;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Get broadcast details
  async getBroadcast(broadcastId) {
    try {
      const response = await api.get(`/broadcasts/${broadcastId}`);
      return response.data.broadcast;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Join a broadcast (HTTP fallback)
  async joinBroadcast(broadcastId) {
    try {
      const response = await api.post(`/broadcasts/${broadcastId}/join`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Leave a broadcast (HTTP fallback)
  async leaveBroadcast(broadcastId) {
    try {
      const response = await api.post(`/broadcasts/${broadcastId}/leave`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Get active listeners in a broadcast
  async getListeners(broadcastId) {
    try {
      const response = await api.get(`/broadcasts/${broadcastId}/listeners`);
      return response.data.listeners;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Get curator's currently playing track
  async getCurrentlyPlaying(curatorId) {
    try {
      const response = await api.get(`/broadcasts/curator/${curatorId}/now-playing`);
      return response.data.currentTrack;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Get curator's broadcast history
  async getBroadcastHistory(curatorId, limit = 20) {
    try {
      const response = await api.get(`/broadcasts/curator/${curatorId}/history`, {
        params: { limit },
      });
      return response.data.broadcasts;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Check if curator is live
  async getCuratorStatus(curatorId) {
    try {
      const response = await api.get(`/broadcasts/curator/${curatorId}/status`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Send heartbeat (for curators to keep broadcast alive)
  async sendHeartbeat(broadcastId) {
    try {
      const response = await api.post(`/broadcasts/${broadcastId}/heartbeat`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Handle API errors
  handleError(error) {
    if (error.response) {
      // Server responded with error
      return new Error(error.response.data.error || error.response.data.message || 'An error occurred');
    } else if (error.request) {
      // Request made but no response
      return new Error('Network error. Please check your connection.');
    } else {
      // Something else happened
      return new Error(error.message || 'An unexpected error occurred');
    }
  }
}

export default new BroadcastService();
