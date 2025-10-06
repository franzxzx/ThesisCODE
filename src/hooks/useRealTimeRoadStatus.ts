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
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Fetch initial road status data
  const fetchRoadStatus = async (isReconnection = false) => {
    try {
      // Only show loading state on initial load, not on reconnections
      if (!isReconnection) {
        setLoading(true);
      }
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
      if (!isReconnection) {
        setLoading(false);
      }
      if (isInitialLoad) {
        setIsInitialLoad(false);
        setLoading(false);
      }
    }
  };

  // Set up real-time subscription
  useEffect(() => {
    let subscription: any = null;
    let intervalId: NodeJS.Timeout | null = null;
    let reconnectTimeoutId: NodeJS.Timeout | null = null;
    let isComponentMounted = true;

    // Initial fetch
    fetchRoadStatus();

    const setupSubscription = () => {
      if (!isComponentMounted) return;

      // Create a unique channel name to avoid conflicts
      const channelName = `road_status_updates_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Subscribe to real-time changes with better error handling
      subscription = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
            schema: 'public',
            table: 'road_status_updates'
          },
          (payload) => {
            if (!isComponentMounted) return;
            console.log('Real-time road status update received:', payload);
            
            // Only refetch if this is an actual data change, not a reconnection
            if (payload.eventType !== 'SYSTEM') {
              fetchRoadStatus(true); // Pass true to indicate this is a reconnection fetch
            }
          }
        )
        .subscribe((status) => {
          if (!isComponentMounted) return;
          console.log('Subscription status:', status);
          
          if (status === 'SUBSCRIBED') {
            console.log('Successfully subscribed to road status updates');
            // Clear any pending reconnection attempts
            if (reconnectTimeoutId) {
              clearTimeout(reconnectTimeoutId);
              reconnectTimeoutId = null;
            }
          } else if (status === 'CHANNEL_ERROR' || status === 'CLOSED') {
            console.warn(`Subscription ${status} - attempting reconnection in 3 seconds`);
            // Attempt to reconnect after a delay
            reconnectTimeoutId = setTimeout(() => {
              if (isComponentMounted) {
                console.log('Attempting to reconnect subscription...');
                if (subscription) {
                  subscription.unsubscribe();
                }
                setupSubscription();
              }
            }, 3000);
          } else if (status === 'TIMED_OUT') {
            console.warn('Subscription timed out - reconnecting immediately');
            if (subscription) {
              subscription.unsubscribe();
            }
            setupSubscription();
          }
        });
    };

    // Initial subscription setup
    setupSubscription();

    // Set up periodic refresh as fallback (every 30 seconds)
    intervalId = setInterval(() => {
      if (isComponentMounted) {
        fetchRoadStatus(true); // Pass true to indicate this is a background refresh
      }
    }, 30000);

    // Cleanup subscription and interval on unmount
    return () => {
      isComponentMounted = false;
      
      if (subscription) {
        subscription.unsubscribe();
      }
      
      if (intervalId) {
        clearInterval(intervalId);
      }
      
      if (reconnectTimeoutId) {
        clearTimeout(reconnectTimeoutId);
      }
    };
  }, []);

  // Manual refresh function
  const refreshRoadStatus = () => {
    fetchRoadStatus(true); // Manual refresh should not show loading state
  };

  return {
    roadStatusUpdates,
    loading,
    error,
    refreshRoadStatus
  };
};