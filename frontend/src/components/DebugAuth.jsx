import React from 'react';
import { useNavigate } from 'react-router-dom';

const DebugAuth = () => {
  const navigate = useNavigate();
  
  const user = localStorage.getItem('user');
  const token = localStorage.getItem('authToken');
  
  const handleSignIn = () => {
    // Set test user data
    const testUser = {
      id: '6da51550-7b9f-46e5-bf27-69c660a03fa2',
      email: 'hr@test.com',
      first_name: 'HR',
      last_name: 'User',
      role: 'hr_user',
      created_at: '2025-07-14T23:01:38.354475'
    };
    
    const testToken = 'SA0xr7yM9dbYLXSADnHUjex2wAt1wjr7BQ5k0fNP5_Y';
    
    localStorage.setItem('user', JSON.stringify(testUser));
    localStorage.setItem('authToken', testToken);
    
    navigate('/hr/dashboard');
  };
  
  const handleSignOut = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('authToken');
    navigate('/signin');
  };
  
  return (
    <div className="min-h-screen bg-black text-white p-8">
      <h1 className="text-3xl font-bold mb-8">Debug Authentication</h1>
      
      <div className="space-y-6">
        <div className="bg-zinc-900 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Current Auth State</h2>
          <p><strong>User:</strong> {user ? '✅ Present' : '❌ Missing'}</p>
          <p><strong>Token:</strong> {token ? '✅ Present' : '❌ Missing'}</p>
          
          {user && (
            <div className="mt-4">
              <h3 className="font-semibold mb-2">User Data:</h3>
              <pre className="bg-black p-4 rounded text-sm overflow-x-auto">
                {JSON.stringify(JSON.parse(user), null, 2)}
              </pre>
            </div>
          )}
        </div>
        
        <div className="space-x-4">
          <button
            onClick={handleSignIn}
            className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded"
          >
            Set Test User & Go to HR Dashboard
          </button>
          
          <button
            onClick={handleSignOut}
            className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded"
          >
            Sign Out
          </button>
          
          <button
            onClick={() => navigate('/hr/dashboard')}
            className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded"
          >
            Go to HR Dashboard
          </button>
          
          <button
            onClick={() => navigate('/hr/jobs/new')}
            className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded"
          >
            Go to Add Job
          </button>
        </div>
      </div>
    </div>
  );
};

export default DebugAuth;
