// HR Profile API Service
const API_BASE_URL = 'http://localhost:8000/api';

export const hrProfileAPI = {
  // Create HR profile
  async createProfile(profileData) {
    try {
      const response = await fetch(`${API_BASE_URL}/hr-profiles`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(profileData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to create HR profile');
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating HR profile:', error);
      throw error;
    }
  },

  // Get HR profile by user ID
  async getProfile(userId) {
    try {
      const response = await fetch(`${API_BASE_URL}/hr-profiles/${userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          return null; // Profile doesn't exist
        }
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to fetch HR profile');
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching HR profile:', error);
      throw error;
    }
  },

  // Update HR profile
  async updateProfile(userId, profileData) {
    try {
      const response = await fetch(`${API_BASE_URL}/hr-profiles/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(profileData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to update HR profile');
      }

      return await response.json();
    } catch (error) {
      console.error('Error updating HR profile:', error);
      throw error;
    }
  },

  // Delete HR profile
  async deleteProfile(userId) {
    try {
      const response = await fetch(`${API_BASE_URL}/hr-profiles/${userId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to delete HR profile');
      }

      return await response.json();
    } catch (error) {
      console.error('Error deleting HR profile:', error);
      throw error;
    }
  },
};
