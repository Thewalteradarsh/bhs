import React, { createContext, useContext, useEffect, useState } from 'react';

const UserContext = createContext();

export const useUser = () => {
  return useContext(UserContext);
};

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Generate or retrieve an anonymous device ID for tracking
    let deviceId = localStorage.getItem('hear_device_id');
    if (!deviceId) {
      // Simple random ID generator for anonymous tracking
      deviceId = 'anon_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      localStorage.setItem('hear_device_id', deviceId);
    }

    setUser({ uid: deviceId });
    setUserData({
      uid: deviceId,
      preferredLanguages: ['Mal', 'Tam'],
      recentTracks: []
    });
    setLoading(false);
  }, []);

  const value = {
    user,
    userData,
    loading
  };

  return (
    <UserContext.Provider value={value}>
      {!loading && children}
    </UserContext.Provider>
  );
};
