import React, { useEffect, useState } from 'react';
import Dashboard from './Dashboard';

export default function HomeView() {
  const [userLangs, setUserLangs] = useState([]);
  const [userName, setUserName] = useState('');
  
  useEffect(() => {
    try {
      const langs = JSON.parse(localStorage.getItem('user_preferred_langs') || '[]');
      setUserLangs(Array.isArray(langs) && langs.length ? langs : ['English']);
      
      const settings = JSON.parse(localStorage.getItem('hear_settings') || '{}');
      if (settings?.userName) setUserName(settings.userName);
    } catch (e) {
      setUserLangs(['English']);
    }
  }, []);

  return <Dashboard languages={userLangs} userName={userName} />;
}
