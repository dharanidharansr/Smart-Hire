// Debug helper to check authentication state
export const debugAuth = () => {
  const token = localStorage.getItem('authToken');
  const user = localStorage.getItem('user');
  
  console.log('=== Authentication Debug Info ===');
  console.log('Token:', token ? 'Present' : 'Missing');
  console.log('Token value:', token);
  console.log('User data:', user ? JSON.parse(user) : 'Missing');
  
  if (!token) {
    console.log('❌ No auth token found. Please sign in again.');
    return false;
  }
  
  if (!user) {
    console.log('❌ No user data found. Please sign in again.');
    return false;
  }
  
  console.log('✅ Authentication data appears valid');
  return true;
};

// Clear authentication data
export const clearAuth = () => {
  localStorage.removeItem('authToken');
  localStorage.removeItem('user');
  console.log('Authentication data cleared');
};

// Add to window for easy access in dev tools
if (typeof window !== 'undefined') {
  window.debugAuth = debugAuth;
  window.clearAuth = clearAuth;
}
