import { useState } from 'react';
import { Users } from 'lucide-react';
import Avatar from './Avatar';

const Header = ({ username, setUsername, isConnected, connect, activeUsers, onNotification }) => {
  const [showLogin, setShowLogin] = useState(false);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-purple-600">🎯 Task Board</h1>

        <div className="flex items-center gap-4">
          {!isConnected ? (
            <>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your name"
                className="px-4 py-2 border-2 border-purple-300 rounded-lg focus:outline-none focus:border-purple-500"
                onKeyPress={(e) => e.key === 'Enter' && connect()}
              />
              <button onClick={connect} className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-semibold">Connect</button>
              {/* <button onClick={() => setShowLogin(s => !s)} className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200">Login</button> */}
            </>
          ) : (
            <div className="flex items-center gap-3">
              <Avatar name={username} size="md" />
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-gray-600 font-medium">{username}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {isConnected && activeUsers && activeUsers.size > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center gap-2 mb-3">
            <Users size={16} className="text-gray-600" />
            <span className="text-sm font-semibold text-gray-700">Active Users ({activeUsers.size}):</span>
          </div>
          <div className="flex flex-wrap gap-3">
            {Array.from(activeUsers).map(user => (
              <div key={user} className="flex items-center gap-2 bg-purple-50 px-3 py-2 rounded-lg">
                <Avatar name={user} size="sm" />
                <span className="text-sm font-medium text-purple-700">{user}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Inline Login Form
      {!isConnected && showLogin && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Username</label>
              <input value={username} onChange={(e) => setUsername(e.target.value)} className="w-full px-3 py-2 border rounded" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-3 py-2 border rounded" />
            </div>
            <div>
              <button
                onClick={async () => {
                  setLoading(true);
                  try {
                    // Use Spring Security form login endpoint
                    const res = await fetch('http://localhost:8080/login', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                      body: new URLSearchParams({ username, password }).toString(),
                      credentials: 'include'
                    });
                    if (!res.ok) {
                      onNotification?.('Login failed', 'error');
                      setLoading(false);
                      return;
                    }
                    // Success: session cookie is now stored by browser
                    setPassword('');
                    setShowLogin(false);
                    onNotification?.('Login successful. Session started.', 'success');
                    // auto-connect websocket with username
                    connect();
                  } catch (err) {
                    console.error('Login error', err);
                    onNotification?.('Login error', 'error');
                  } finally {
                    setLoading(false);
                  }
                }}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                disabled={loading}
              >
                {loading ? 'Logging in...' : 'Login & Connect'}
              </button>
            </div>
          </div>
        </div>
      )} */}
    </div>
  );
};

export default Header;
