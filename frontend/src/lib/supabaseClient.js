// This file is deprecated - using MongoDB Atlas through backend API
// Import the new auth helpers instead
import { authHelpers } from './authHelpers';

// Re-export for backward compatibility
export { authHelpers };

// Placeholder for any remaining supabase references
export const supabase = {
  auth: {
    signOut: authHelpers.signOut,
    getUser: () => Promise.resolve({ data: { user: authHelpers.getCurrentUser() } })
  }
};
