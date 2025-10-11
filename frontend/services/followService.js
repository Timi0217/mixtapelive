import api from './api';

class FollowService {
  // Follow a curator
  async followCurator(curatorId) {
    try {
      const response = await api.post('/follows/follow', { curatorId });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Unfollow a curator
  async unfollowCurator(curatorId) {
    try {
      const response = await api.delete(`/follows/follow/${curatorId}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Check if following a curator
  async isFollowing(curatorId) {
    try {
      const response = await api.get(`/follows/check/${curatorId}`);
      return response.data.isFollowing;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Get user's following list (curators they follow)
  async getFollowing(userId = null, limit = 100) {
    try {
      const params = { limit };
      if (userId) {
        params.userId = userId;
      }
      const response = await api.get('/follows/following', { params });
      return response.data.curators;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Get curator's followers
  async getFollowers(curatorId, limit = 100) {
    try {
      const response = await api.get(`/follows/followers/${curatorId}`, {
        params: { limit },
      });
      return response.data.followers;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Get follower/following counts
  async getCounts(userId) {
    try {
      const response = await api.get(`/follows/counts/${userId}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Get suggested curators (for discovery)
  async getSuggestedCurators(genres = null, limit = 20) {
    try {
      const params = { limit };
      if (genres && genres.length > 0) {
        params.genres = genres.join(',');
      }
      const response = await api.get('/follows/suggested', { params });
      return response.data.curators;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Search curators by username
  async searchCurators(query, limit = 20) {
    try {
      const response = await api.get('/follows/search', {
        params: { q: query, limit },
      });
      return response.data.curators;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Handle API errors
  handleError(error) {
    if (error.response) {
      return new Error(error.response.data.error || error.response.data.message || 'An error occurred');
    } else if (error.request) {
      return new Error('Network error. Please check your connection.');
    } else {
      return new Error(error.message || 'An unexpected error occurred');
    }
  }
}

export default new FollowService();
