import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface RoadStatusUpdate {
  id: string;
  segment_id: string;
  road_name: string;
  status: 'passable' | 'restricted' | 'blocked';
  updated_at: string;
  updated_by_email: string;
}

export const useRealTimeRoadStatus = () => {
  const [roadStatusUpdates, setRoadStatusUpdates] = useState<RoadStatusUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch initial road status data
  const fetchRoadStatus = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_latest_road_status');
      
      if (error) {
        console.warn('Database fetch failed:', error);
        setRoadStatusUpdates([]);
      } else {
        console.log('Fetched road status data:', data);
        setRoadStatusUpdates(data || []);
      }
      setError(null);
    } catch (err: any) {
      console.warn('Error fetching road status:', err);
      setRoadStatusUpdates([]);
      setError(null);
    } finally {
      setLoading(false);
    }
  };

  // Set up real-time subscription
  useEffect(() => {
    // Initial fetch
    fetchRoadStatus();

    // Create a unique channel name to avoid conflicts
    const channelName = `road_status_updates_${Date.now()}`;
    
    // Subscribe to real-time changes with better error handling
    const subscription = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'road_status_updates'
        },
        (payload) => {
          console.log('Real-time road status update received:', payload);
          
          // Refetch all data to ensure consistency
          fetchRoadStatus();
        }
      )
      .subscribe((status) => {
        console.log('Subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('Successfully subscribed to road status updates');
        } else if (status === 'CHANNEL_ERROR') {
          console.warn('Channel error - retrying subscription in 5 seconds');
          // Retry subscription after a delay
          setTimeout(() => {
            fetchRoadStatus();
          }, 5000);
        } else if (status === 'TIMED_OUT') {
          console.warn('Subscription timed out - retrying');
          fetchRoadStatus();
        }
      });

    // Set up periodic refresh as fallback (every 30 seconds)
    const intervalId = setInterval(() => {
      fetchRoadStatus();
    }, 30000);

    // Cleanup subscription and interval on unmount
    return () => {
      subscription.unsubscribe();
      clearInterval(intervalId);
    };
  }, []);

  // Manual refresh function
  const refreshRoadStatus = () => {
    fetchRoadStatus();
  };

  return {
    roadStatusUpdates,
    loading,
    error,
    refreshRoadStatus
  };
};