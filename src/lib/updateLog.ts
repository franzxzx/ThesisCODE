import { supabase } from '../lib/supabase';

export interface RoadStatusUpdate {
  id: string;
  segment_id: string;
  road_name: string;
  status: 'passable' | 'restricted' | 'blocked';
  updated_at: string;
  updated_by_email: string;
  coordinates?: [number, number][];
  previous_status?: string;
}

const STORAGE_KEY = 'road_status_updates';

// Helper functions for localStorage fallback
const getStoredUpdates = (): RoadStatusUpdate[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.warn('Error reading from localStorage:', error);
    return [];
  }
};

const storeUpdate = (update: Omit<RoadStatusUpdate, 'id'>) => {
  try {
    const updates = getStoredUpdates();
    const newUpdate: RoadStatusUpdate = {
      ...update,
      id: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };
    updates.push(newUpdate);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updates));
    return newUpdate;
  } catch (error) {
    console.warn('Error storing to localStorage:', error);
    return null;
  }
};

// Main function to log road status updates
export const logUpdate = async (
  segmentId: string,
  status: 'passable' | 'restricted' | 'blocked',
  roadName: string,
  coordinates?: [number, number][]
): Promise<void> => {
  // Get previous status for tracking changes
  const latestStatuses = await getLatestStatusBySegment();
  const previousStatus = latestStatuses[segmentId]?.status;
  
  const updateData = {
    segment_id: segmentId,
    road_name: roadName,
    status,
    previous_status: previousStatus,
    coordinates,
    updated_at: new Date().toISOString(),
    updated_by_email: 'anonymous@example.com', // This should be replaced with actual user email
  };

  try {
    // Try to log to database first
    const { error } = await supabase.rpc('log_road_status_update', {
      p_segment_id: segmentId,
      p_road_name: roadName,
      p_status: status,
    });

    if (error) {
      console.warn('Database logging failed, using localStorage fallback:', error);
      storeUpdate(updateData);
    } else {
      console.log('Successfully logged road status update to database');
    }
  } catch (error) {
    console.warn('Error logging to database, using localStorage fallback:', error);
    storeUpdate(updateData);
  }
};

// Function to get the latest status for each segment
export const getLatestStatusBySegment = async (): Promise<Record<string, RoadStatusUpdate>> => {
  const result: Record<string, RoadStatusUpdate> = {};

  try {
    // Try to fetch from database first
    const { data, error } = await supabase.rpc('get_latest_road_status');
    
    if (!error && data) {
      data.forEach((update: RoadStatusUpdate) => {
        result[update.segment_id] = update;
      });
    } else {
      console.warn('Database fetch failed, using localStorage fallback:', error);
    }
  } catch (error) {
    console.warn('Error fetching from database, using localStorage fallback:', error);
  }

  // Always merge with localStorage data for immediate updates
  const localUpdates = getLatestStatusBySegmentLocal();
  Object.assign(result, localUpdates);

  return result;
};

// Helper function to get latest status from localStorage
const getLatestStatusBySegmentLocal = (): Record<string, RoadStatusUpdate> => {
  const updates = getStoredUpdates();
  const result: Record<string, RoadStatusUpdate> = {};

  updates.forEach(update => {
    const existing = result[update.segment_id];
    if (!existing || new Date(update.updated_at) > new Date(existing.updated_at)) {
      result[update.segment_id] = update;
    }
  });

  return result;
};

// Function to query updates with filters
export const queryUpdates = async (
  timeframe?: { start: Date; end: Date },
  statuses?: ('passable' | 'restricted' | 'blocked')[],
  includeAllRoads: boolean = false
): Promise<RoadStatusUpdate[]> => {
  let updates: RoadStatusUpdate[] = [];
  
  try {
    // Try to fetch from database first
    let query = supabase
      .from('road_status_updates')
      .select('*');
    
    if (timeframe) {
      query = query
        .gte('updated_at', timeframe.start.toISOString())
        .lte('updated_at', timeframe.end.toISOString());
    }
    
    if (statuses && statuses.length > 0) {
      query = query.in('status', statuses);
    }
    
    const { data, error } = await query;
    
    if (!error && data) {
      updates = data as RoadStatusUpdate[];
    } else {
      console.warn('Database query failed, using localStorage fallback:', error);
      updates = getStoredUpdates();
    }
  } catch (error) {
    console.warn('Error querying database, using localStorage fallback:', error);
    updates = getStoredUpdates();
  }
  
  // Apply filters to localStorage data
  let filteredUpdates = updates.filter(update => {
    const updateDate = new Date(update.updated_at);
    
    if (timeframe) {
      if (updateDate < timeframe.start || updateDate > timeframe.end) {
        return false;
      }
    }
    
    if (statuses && statuses.length > 0 && !statuses.includes(update.status)) {
      return false;
    }
    
    return true;
  });
  
  // If includeAllRoads is true, ensure we have at least one entry for each road segment
  if (includeAllRoads) {
    const latestBySegment = await getLatestStatusBySegment();
    const segmentsInFiltered = new Set(filteredUpdates.map(u => u.segment_id));
    
    // Add missing segments
    Object.values(latestBySegment).forEach(update => {
      if (!segmentsInFiltered.has(update.segment_id)) {
        filteredUpdates.push(update);
      }
    });
  }
  
  return filteredUpdates;
};

// Function to clear stored updates
export const clearUpdates = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEY);
    console.log('Cleared stored road status updates');
  } catch (error) {
    console.warn('Error clearing stored updates:', error);
  }
};
