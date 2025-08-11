// Candidate Profile API Service
const API_BASE_URL = 'http://localhost:8000/api';

export const candidateProfileAPI = {
  // Create candidate profile
  async createProfile(profileData) {
    try {
      const response = await fetch(`${API_BASE_URL}/candidate-profiles`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(profileData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to create candidate profile');
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating candidate profile:', error);
      throw error;
    }
  },

  // Get candidate profile by user ID
  async getProfile(userId) {
    try {
      const response = await fetch(`${API_BASE_URL}/candidate-profiles/${userId}`, {
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
        throw new Error(errorData.detail || 'Failed to fetch candidate profile');
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching candidate profile:', error);
      throw error;
    }
  },

  // Update candidate profile
  async updateProfile(userId, profileData) {
    try {
      const response = await fetch(`${API_BASE_URL}/candidate-profiles/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(profileData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to update candidate profile');
      }

      return await response.json();
    } catch (error) {
      console.error('Error updating candidate profile:', error);
      throw error;
    }
  },

  // Delete candidate profile
  async deleteProfile(userId) {
    try {
      const response = await fetch(`${API_BASE_URL}/candidate-profiles/${userId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to delete candidate profile');
      }

      return await response.json();
    } catch (error) {
      console.error('Error deleting candidate profile:', error);
      throw error;
    }
  },
};
