// Authentication utility functions for MongoDB Atlas backend
export const authHelpers = {
  // Sign out user
  signOut: () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    window.location.href = '/signin';
  },

  // Get current user from localStorage
  getCurrentUser: () => {
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;
    
    try {
      return JSON.parse(userStr);
    } catch (error) {
      console.error('Error parsing user data:', error);
      return null;
    }
  },

  // Check if user is authenticated
  isAuthenticated: () => {
    const token = localStorage.getItem('authToken');
    const user = localStorage.getItem('user');
    return !!(token && user);
  },

  // Get user role
  getUserRole: () => {
    const user = authHelpers.getCurrentUser();
    return user?.role || null;
  },

  // Set user data after login
  setUserData: (userData, token = null) => {
    localStorage.setItem('user', JSON.stringify(userData));
    if (token) {
      localStorage.setItem('authToken', token);
    }
  },

  // Get auth token
  getAuthToken: () => {
    return localStorage.getItem('authToken');
  },

  // Check if user is HR
  isHRUser: () => {
    const role = authHelpers.getUserRole();
    return role === 'hr_user';
  },

  // Check if user is candidate
  isCandidate: () => {
    const role = authHelpers.getUserRole();
    return role === 'candidate';
  },

  // Auth state change listener (for compatibility with existing code)
  onAuthStateChange: (callback) => {
    // Simple implementation - in a real app you might want to use a more sophisticated approach
    const checkAuth = () => {
      const user = authHelpers.getCurrentUser();
      const isAuth = authHelpers.isAuthenticated();
      callback(isAuth ? 'SIGNED_IN' : 'SIGNED_OUT', user);
    };

    // Initial check
    checkAuth();

    // Listen for storage changes (when user logs in/out from another tab)
    const handleStorageChange = (e) => {
      if (e.key === 'user' || e.key === 'authToken') {
        checkAuth();
      }
    };

    window.addEventListener('storage', handleStorageChange);

    // Return cleanup function
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }
};

export default authHelpers;
