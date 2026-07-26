import { supabase } from './supabase';

const getDeviceId = () => {
  return localStorage.getItem('hear_device_id') || 'unknown';
};

export const logUserSessionStart = async () => {
  if (!supabase) return; // Fail silently if no env variables
  
  try {
    const deviceId = getDeviceId();
    
    // Upsert a record for this device, updating the last_active timestamp
    const { error } = await supabase
      .from('user_sessions')
      .upsert(
        { 
          device_id: deviceId, 
          last_active: new Date().toISOString(),
          platform: navigator.userAgent
        }, 
        { onConflict: 'device_id' }
      );
      
    if (error) console.error('Supabase session log error:', error);
  } catch (err) {
    // Ignore analytics errors to not disrupt user experience
  }
};

export const logTrackPlayed = async (songId, songName, artist) => {
  if (!supabase) return;
  
  try {
    const { error } = await supabase
      .from('track_plays')
      .insert([
        {
          device_id: getDeviceId(),
          song_id: songId,
          song_name: songName,
          artist_name: artist,
          played_at: new Date().toISOString()
        }
      ]);
      
    if (error) console.error('Supabase track log error:', error);
  } catch (err) {
    // Ignore
  }
};
