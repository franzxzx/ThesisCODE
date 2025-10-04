import { logUpdate, getLatestStatusBySegment } from '../lib/updateLog';
import { buildGraph, findNearestNode, astar, nodesToLatLng, calculateRouteDistance, calculateETA } from '../lib/routing';
import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import legazpiBoundary from '../data/legazpi_boundary.json';
import roadData from '../data/LegRoadData.json';
import { useRealTimeRoadStatus } from '../hooks/useRealTimeRoadStatus';
import { useTheme } from '../lib/ThemeContext';
import { Notification, useNotification } from './Notification';
import { SegmentStatusSelector } from './SegmentStatusSelector';

// Type definitions
type GeoJSONLineFeature = {
  type: 'Feature';
  properties: any;
  geometry: { type: 'LineString'; coordinates: [number, number][] };
  id?: string;
};

type RoadSegment = {
  id: string;
  coordinates: [number, number][];
  properties: any;
  status: 'passable' | 'restricted' | 'blocked';
};

type RoadStatus = 'passable' | 'restricted' | 'blocked';

// Component props interface
interface MapContainerProps {
  onSegmentUpdate?: (segmentId: string, status: 'passable' | 'restricted' | 'blocked') => void;
  editable?: boolean;
  onRouteCalculated?: (distance: number, eta: number) => void;
  routingEnabled?: boolean;
  tallVehicleRouting?: boolean;
  onRoutingToggle?: (enabled: boolean) => void;
}

// Utility functions
const makeId = (() => {
  let counter = 0;
  return () => `segment_${++counter}`;
})();

// Create a deterministic ID generator based on coordinates
const createDeterministicId = (coordinates: [number, number][], lineId?: string, segmentIndex?: number): string => {
  if (lineId && segmentIndex !== undefined) {
    return `${lineId}_seg_${segmentIndex}`;
  }
  
  // Create hash from coordinates
  const coordString = coordinates.map(coord => `${coord[0].toFixed(6)},${coord[1].toFixed(6)}`).join('|');
  let hash = 0;
  for (let i = 0; i < coordString.length; i++) {
    const char = coordString.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return `seg_${Math.abs(hash)}`;
};

// Point-in-polygon check using ray casting algorithm
const isPointInPolygon = (point: [number, number], polygon: [number, number][]): boolean => {
  const [x, y] = point;
  let inside = false;
  
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    
    if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
      inside = !inside;
    }
  }
  
  return inside;
};

// Check if a line segment intersects with any polygon
const lineIntersectsPolygons = (line: [number, number][], polygonRings: [number, number][][][]): boolean => {
  for (const rings of polygonRings) {
    for (const ring of rings) {
      // Check if any point of the line is inside the polygon
      for (const point of line) {
        if (isPointInPolygon(point, ring)) {
          return true;
        }
      }
    }
  }
  return false;
};

// Find intersections between two line segments
const findIntersections = (line1: [number, number][], line2: [number, number][]): [number, number][] => {
  const intersections: [number, number][] = [];
  
  for (let i = 0; i < line1.length - 1; i++) {
    for (let j = 0; j < line2.length - 1; j++) {
      const intersection = getLineIntersection(
        line1[i], line1[i + 1],
        line2[j], line2[j + 1]
      );
      if (intersection) {
        intersections.push(intersection);
      }
    }
  }
  
  return intersections;
};

// Get intersection point between two line segments
const getLineIntersection = (
  p1: [number, number], p2: [number, number],
  p3: [number, number], p4: [number, number]
): [number, number] | null => {
  const x1 = p1[0], y1 = p1[1];
  const x2 = p2[0], y2 = p2[1];
  const x3 = p3[0], y3 = p3[1];
  const x4 = p4[0], y4 = p4[1];
  
  const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
  if (Math.abs(denom) < 1e-10) return null;
  
  const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
  const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;
  
  if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
    return [x1 + t * (x2 - x1), y1 + t * (y2 - y1)];
  }
  
  return null;
};

// Split line at intersection points
const splitLineAtIntersections = (
  line: [number, number][],
  intersections: [number, number][],
  lineId?: string
): RoadSegment[] => {
  if (intersections.length === 0) {
    const segmentId = createDeterministicId(line, lineId, 0);
    return [{
      id: segmentId,
      coordinates: line,
      properties: {},
      status: 'passable' as const
    }];
  }
  
  // Sort intersections by distance along the line
  const sortedIntersections = intersections
    .map(intersection => ({
      point: intersection,
      distance: getDistanceAlongLine(line, intersection)
    }))
    .sort((a, b) => a.distance - b.distance)
    .map(item => item.point);
  
  const segments: RoadSegment[] = [];
  let currentStart = 0;
  
  for (let i = 0; i < sortedIntersections.length; i++) {
    const intersection = sortedIntersections[i];
    const intersectionIndex = findNearestPointIndex(line, intersection);
    
    if (intersectionIndex > currentStart) {
      const segmentCoords = line.slice(currentStart, intersectionIndex + 1);
      if (segmentCoords.length > 1) {
        const segmentId = createDeterministicId(segmentCoords, lineId, segments.length);
        segments.push({
          id: segmentId,
          coordinates: segmentCoords,
          properties: {},
          status: 'passable' as const
        });
      }
    }
    
    currentStart = intersectionIndex;
  }
  
  // Add final segment
  if (currentStart < line.length - 1) {
    const segmentCoords = line.slice(currentStart);
    if (segmentCoords.length > 1) {
      const segmentId = createDeterministicId(segmentCoords, lineId, segments.length);
      segments.push({
        id: segmentId,
        coordinates: segmentCoords,
        properties: {},
        status: 'passable' as const
      });
    }
  }
  
  return segments;
};

// Get distance along line to a point
const getDistanceAlongLine = (line: [number, number][], point: [number, number]): number => {
  let minDistance = Infinity;
  let bestDistance = 0;
  let accumulatedDistance = 0;
  
  for (let i = 0; i < line.length - 1; i++) {
    const segmentStart = line[i];
    const segmentEnd = line[i + 1];
    const segmentLength = Math.sqrt(
      Math.pow(segmentEnd[0] - segmentStart[0], 2) + 
      Math.pow(segmentEnd[1] - segmentStart[1], 2)
    );
    
    const distanceToSegment = pointToLineDistance(point, segmentStart, segmentEnd);
    if (distanceToSegment < minDistance) {
      minDistance = distanceToSegment;
      bestDistance = accumulatedDistance + getProjectionDistance(point, segmentStart, segmentEnd);
    }
    
    accumulatedDistance += segmentLength;
  }
  
  return bestDistance;
};

// Get projection distance of point onto line segment
const getProjectionDistance = (
  point: [number, number],
  lineStart: [number, number],
  lineEnd: [number, number]
): number => {
  const dx = lineEnd[0] - lineStart[0];
  const dy = lineEnd[1] - lineStart[1];
  const length = Math.sqrt(dx * dx + dy * dy);
  
  if (length === 0) return 0;
  
  const t = Math.max(0, Math.min(1, 
    ((point[0] - lineStart[0]) * dx + (point[1] - lineStart[1]) * dy) / (length * length)
  ));
  
  return t * length;
};

// Point to line distance
const pointToLineDistance = (
  point: [number, number],
  lineStart: [number, number],
  lineEnd: [number, number]
): number => {
  const dx = lineEnd[0] - lineStart[0];
  const dy = lineEnd[1] - lineStart[1];
  const length = Math.sqrt(dx * dx + dy * dy);
  
  if (length === 0) {
    return Math.sqrt(
      Math.pow(point[0] - lineStart[0], 2) + 
      Math.pow(point[1] - lineStart[1], 2)
    );
  }
  
  const t = Math.max(0, Math.min(1, 
    ((point[0] - lineStart[0]) * dx + (point[1] - lineStart[1]) * dy) / (length * length)
  ));
  
  const projection: [number, number] = [
    lineStart[0] + t * dx,
    lineStart[1] + t * dy
  ];
  
  return Math.sqrt(
    Math.pow(point[0] - projection[0], 2) + 
    Math.pow(point[1] - projection[1], 2)
  );
};

// Find nearest point index in line
const findNearestPointIndex = (line: [number, number][], point: [number, number]): number => {
  let minDistance = Infinity;
  let nearestIndex = 0;
  
  for (let i = 0; i < line.length; i++) {
    const distance = Math.sqrt(
      Math.pow(line[i][0] - point[0], 2) + 
      Math.pow(line[i][1] - point[1], 2)
    );
    
    if (distance < minDistance) {
      minDistance = distance;
      nearestIndex = i;
    }
  }
  
  return nearestIndex;
};

// Main component
export const MapContainer: React.FC<MapContainerProps> = React.memo(({
  editable = true,
  routingEnabled = true,
  tallVehicleRouting = false,
  onRouteCalculated,
  onRoutingToggle,
}) => {
  const { theme } = useTheme();
  const { notification, showNotification, hideNotification } = useNotification();
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const boundaryLayerRef = useRef<L.GeoJSON | null>(null);
  const roadLayerRef = useRef<L.GeoJSON | null>(null);
  const routeLayerRef = useRef<L.GeoJSON | null>(null);
  const startMarkerRef = useRef<L.Marker | null>(null);
  const endMarkerRef = useRef<L.Marker | null>(null);
  const arrowMarkersRef = useRef<L.Marker[]>([]);
  
  // Add real-time road status hook
  const { roadStatusUpdates } = useRealTimeRoadStatus();
  
  // Routing graph reference
  const routingGraphRef = useRef<ReturnType<typeof buildGraph> | null>(null);
  
  // State for routing
  const [startPoint, setStartPoint] = useState<[number,number] | null>(null);
  const [endPoint, setEndPoint] = useState<[number,number] | null>(null);
  

  
  // Road segments state
  const [roadSegments, setRoadSegments] = useState<RoadSegment[]>([]);

  // Format distance with automatic unit conversion
  const formatDistance = (distanceInMeters: number): string => {
    if (distanceInMeters >= 1000) {
      const distanceInKm = distanceInMeters / 1000;
      return `${distanceInKm.toFixed(2)} km`;
    } else {
      return `${Math.round(distanceInMeters)} m`;
    }
  };

  // Calculate estimated speed based on distance and ETA (default 30kph)
  const calculateSpeed = (distanceInMeters: number, etaInMinutes: number): number => {
    if (etaInMinutes <= 0) return 30; // Default speed
    const distanceInKm = distanceInMeters / 1000;
    const etaInHours = etaInMinutes / 60;
    const speed = distanceInKm / etaInHours;
    return Math.round(speed);
  };
  
  // Route information state
  const [routeInfo, setRouteInfo] = useState<{ distance: number; eta: number } | null>(null);
  
  // Segment selector popup state
  const [segmentSelector, setSegmentSelector] = useState<{
    isOpen: boolean;
    segment: RoadSegment | null;
    position: { x: number; y: number };
  }>({
    isOpen: false,
    segment: null,
    position: { x: 0, y: 0 }
  });
  
  // Refs to track current values for event handlers
  const startRef = useRef(startPoint);
  const endRef = useRef(endPoint);
  startRef.current = startPoint;
  endRef.current = endPoint;
  
  const roadSegmentsRef = useRef<RoadSegment[]>([]);
  roadSegmentsRef.current = roadSegments;
  
  const routingEnabledRef = useRef<boolean>(!!routingEnabled);
  useEffect(() => {
    routingEnabledRef.current = !!routingEnabled;
  }, [routingEnabled]);
  
  // for polygon containment check
  const polygonRingsRef = useRef<[number, number][][][]>([]);

  // Track segments that have been locally updated to prevent overriding immediate changes
  const locallyUpdatedSegments = useRef<Set<string>>(new Set());

  // Real-time road status updates - Update segments when real-time data changes
  useEffect(() => {
    console.log('Real-time updates received:', roadStatusUpdates);
    
    if (roadStatusUpdates.length === 0 || roadSegments.length === 0) return;

    // Create a map of latest statuses from real-time updates
    const latestStatusMap: Record<string, RoadStatus> = {};
    roadStatusUpdates.forEach(update => {
      latestStatusMap[update.segment_id] = update.status;
    });

    console.log('Latest status map:', latestStatusMap);

    // Update road segments with latest statuses, but respect local changes
    const updatedSegments = roadSegments.map(segment => {
      const latestStatus = latestStatusMap[segment.id];
      
      // Skip updating if this segment was recently updated locally
      if (locallyUpdatedSegments.current.has(segment.id)) {
        // Clear the local update flag after a short delay to allow future real-time updates
        setTimeout(() => {
          locallyUpdatedSegments.current.delete(segment.id);
        }, 2000);
        return segment;
      }
      
      if (latestStatus && latestStatus !== segment.status) {
        console.log(`Updating segment ${segment.id} from ${segment.status} to ${latestStatus}`);
        return { ...segment, status: latestStatus };
      }
      return segment;
    });

    // Check if any segments were actually updated
    const hasChanges = updatedSegments.some((segment, index) => 
      segment.status !== roadSegments[index].status
    );

    if (hasChanges) {
      console.log('Updating road segments with new statuses');
      setRoadSegments(updatedSegments);
    }
  }, [roadStatusUpdates, roadSegments]);

  // Initialize road segments from GeoJSON data
  const initializeSegments = async () => {
    try {
      console.log('Initializing road segments...');
      
      // Filter out pedestrian infrastructure
      const roadFeatures = (roadData as any).features.filter((feature: GeoJSONLineFeature) => {
        const highway = feature.properties?.highway;
        return highway && !['footway', 'cycleway', 'path', 'steps'].includes(highway);
      });

      console.log(`Processing ${roadFeatures.length} road features`);

      // Find all intersections
      const allIntersections: [number, number][] = [];
      for (let i = 0; i < roadFeatures.length; i++) {
        for (let j = i + 1; j < roadFeatures.length; j++) {
          const line1 = roadFeatures[i].geometry.coordinates.map(coord => [coord[1], coord[0]] as [number, number]);
          const line2 = roadFeatures[j].geometry.coordinates.map(coord => [coord[1], coord[0]] as [number, number]);
          const intersections = findIntersections(line1, line2);
          allIntersections.push(...intersections);
        }
      }

      console.log(`Found ${allIntersections.length} intersections`);

      // Get latest status from database for all segments
      const latestStatusMap = await getLatestStatusBySegment();
      console.log('Latest status from database:', latestStatusMap);

      // Process each road feature
      const allSegments: RoadSegment[] = [];
      
      for (const feature of roadFeatures) {
        const line = feature.geometry.coordinates.map(coord => [coord[1], coord[0]] as [number, number]);
        const lineId = feature.properties?.['@id'] || feature.properties?.id;
        
        // Find intersections for this line
        const lineIntersections = allIntersections.filter(intersection => {
          return line.some(point => 
            Math.abs(point[0] - intersection[0]) < 0.0001 && 
            Math.abs(point[1] - intersection[1]) < 0.0001
          );
        });

        // Split line into segments at intersections
        const segments = splitLineAtIntersections(line, lineIntersections, lineId);
        
        // Set status from database or default to 'passable'
        segments.forEach(segment => {
          const dbStatus = latestStatusMap[segment.id];
          if (dbStatus) {
            segment.status = dbStatus;
            console.log(`Setting segment ${segment.id} status to ${dbStatus} from database`);
          }
          segment.properties = feature.properties;
        });

        allSegments.push(...segments);
      }

      console.log(`Created ${allSegments.length} road segments`);
      setRoadSegments(allSegments);
    } catch (error) {
      console.error('Error initializing segments:', error);
    }
  };

  // Initialize segments on mount
  useEffect(() => {
    initializeSegments();
  }, []);
  
  // Initialize map
  useEffect(() => {
    if (!mapRef.current) return;
    
    const map = L.map(mapRef.current, {
      center: [13.1391, 123.7403], // Legazpi City center
      zoom: 13,
      zoomControl: false,
      // Removed preferCanvas to prevent clearRect errors
      fadeAnimation: false, // Disable fade animation to prevent _leaflet_pos issues
      zoomAnimation: false, // Disable zoom animation to prevent _leaflet_pos issues
      renderer: L.svg(), // Use SVG renderer instead of canvas to avoid clearRect issues
    });
    
    mapInstanceRef.current = map;
    
    // Add tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);
    
    // Set default icon paths
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
      iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    });
    
    return () => {
      if (map) {
        map.off(); // Remove all event listeners
        map.remove();
      }
    };
  }, []);
  
  // Add boundary layer
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    
    const map = mapInstanceRef.current;
    
    // Clear existing boundary layer
    if (boundaryLayerRef.current) {
      map.removeLayer(boundaryLayerRef.current);
    }
    
    // Add boundary layer
    const boundaryFeatures = legazpiBoundary.features.filter(
      (feature: any) => feature.geometry.type === 'Polygon'
    );
    
    // Store polygon rings for point-in-polygon checks
    polygonRingsRef.current = boundaryFeatures.map((feature: any) => feature.geometry.coordinates);
    
    const boundaryLayer = L.geoJSON(boundaryFeatures, {
      style: {
        color: '#3b82f6',
        weight: 3,
        opacity: 0.8,
        fillOpacity: 0
      }
    });
    
    boundaryLayerRef.current = boundaryLayer;
    boundaryLayer.addTo(map);
    
    // Set map bounds to boundary
    if (boundaryFeatures.length > 0) {
      const bounds = boundaryLayer.getBounds();
      map.fitBounds(bounds);
    }
    
    // Add scale control
    L.control.scale({ position: 'bottomleft' }).addTo(map);
    
    return () => {
      if (boundaryLayerRef.current) {
        map.removeLayer(boundaryLayerRef.current);
      }
    };
  }, []);
  
  // Add road layer
  useEffect(() => {
    if (!mapInstanceRef.current || !roadSegments.length) return;
    
    const map = mapInstanceRef.current;
    
    // Clear existing road layers
    if (roadLayerRef.current) {
      map.removeLayer(roadLayerRef.current);
    }
    
    // Create road layer
    const roadLayer = L.layerGroup();
    
    roadSegments.forEach((segment) => {
      const coords = segment.coordinates;
      
      let color = '#22c55e'; // Green for passable
      let weight = 8; // Increased for better clickability
      let opacity = 0.8;
      
      if (segment.status === 'restricted') {
        color = '#f59e0b'; // Yellow for restricted
        weight = 10; // Increased for better clickability
      } else if (segment.status === 'blocked') {
        color = '#ef4444'; // Red for blocked
        weight = 12; // Increased for better clickability
        opacity = 0.9;
      }
      
      const polyline = L.polyline(coords, {
        color,
        weight,
        opacity,
        smoothFactor: 1
      });
      
      if (editable) {
        polyline.on('click', (e: L.LeafletMouseEvent) => {
          // Prevent event from bubbling to map
          L.DomEvent.stopPropagation(e);
          
          // Get click position in screen coordinates
          const containerPoint = mapInstanceRef.current?.latLngToContainerPoint(e.latlng);
          if (!containerPoint) return;
          
          // Show segment selector popup
          setSegmentSelector({
            isOpen: true,
            segment: segment,
            position: { x: containerPoint.x, y: containerPoint.y }
          });
        });
      }
      
      roadLayer.addLayer(polyline);
    });
    
    roadLayerRef.current = roadLayer;
    roadLayer.addTo(map);
    
    return () => {
      if (roadLayerRef.current) {
        map.removeLayer(roadLayerRef.current);
      }
    };
  }, [roadSegments, editable]);
  
  // Handle routing
  useEffect(() => {
    if (!startPoint || !endPoint || !roadSegments.length || !routingEnabled) {
      setRouteInfo(null);
      if (routeLayerRef.current && mapInstanceRef.current) {
        mapInstanceRef.current.removeLayer(routeLayerRef.current);
        routeLayerRef.current = null;
      }
      // Remove arrow markers when routing is disabled or no route exists
      if (mapInstanceRef.current && arrowMarkersRef.current.length > 0) {
        arrowMarkersRef.current.forEach(marker => {
          mapInstanceRef.current!.removeLayer(marker);
        });
        arrowMarkersRef.current = [];
      }
      return;
    }
    
    const map = mapInstanceRef.current;
    if (!map) return;
    
    try {
      // Build routing graph - filter segments based on vehicle type
      const filteredSegments = tallVehicleRouting 
        ? roadSegments.filter(s => s.status === 'restricted' || s.status === 'passable') // Tall vehicles can use yellow (restricted) and passable segments
        : roadSegments.filter(s => s.status === 'passable'); // Regular vehicles only use passable segments (no yellow/restricted)
      const graph = buildGraph(filteredSegments, tallVehicleRouting);
      
      // Find nearest nodes
      const startNodeIdx = findNearestNode(graph, startPoint[0], startPoint[1]);
      const endNodeIdx = findNearestNode(graph, endPoint[0], endPoint[1]);
      
      if (startNodeIdx === -1 || endNodeIdx === -1) {
        console.warn('Could not find nearest nodes for routing');
        return;
      }
      
      // Find route using A* Algorithm
      const routeNodes = astar(graph, startNodeIdx, endNodeIdx);
      
      if (!routeNodes || routeNodes.length === 0) {
        console.warn('No route found');
        showNotification('No available route found', 'warning');
        setRouteInfo(null);
        return;
      }
      
      // Convert nodes to coordinates - this gives us the actual road path
      const routeCoords = nodesToLatLng(graph, routeNodes);
      
      // Use ONLY the calculated route coordinates that follow roads
      // Remove the direct connections to start/end points that cut across buildings
      const roadFollowingCoords: [number, number][] = routeCoords;
      
      // Calculate distance and ETA
      const distance = calculateRouteDistance(graph, routeNodes);
      const eta = calculateETA(distance);
      
      // Update route info
      setRouteInfo({ distance, eta });
      if (onRouteCalculated) {
        onRouteCalculated(distance, eta);
      }
      
      // Remove existing route and arrows
      if (routeLayerRef.current) {
        map.removeLayer(routeLayerRef.current);
      }
      if (arrowMarkersRef.current.length > 0) {
        arrowMarkersRef.current.forEach(marker => {
          map.removeLayer(marker);
        });
        arrowMarkersRef.current = [];
      }

      // Display route on map
      routeLayerRef.current = L.polyline(roadFollowingCoords, {
        color: '#3b82f6',
        weight: 5,
        opacity: 0.8,
        dashArray: '10, 5',
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(map);

      // Add directional arrow markers along the route
      const routeLength = roadFollowingCoords.length;
      if (routeLength > 1) {
        const arrowInterval = Math.max(2, Math.floor(routeLength / 8)); // Show ~8 arrows with better spacing
        for (let i = arrowInterval; i < routeLength - 1; i += arrowInterval) {
          const coord = roadFollowingCoords[i];
          const nextCoord = roadFollowingCoords[i + 1];
          
          // Calculate arrow rotation based on direction to next point (more accurate)
          const deltaLat = nextCoord[0] - coord[0];
          const deltaLng = nextCoord[1] - coord[1];
          const angle = Math.atan2(deltaLng, deltaLat) * 180 / Math.PI;
          
          const arrowIcon = L.divIcon({
            html: `<div style="transform: rotate(${angle}deg); color: #3b82f6; font-size: 18px; text-shadow: 1px 1px 2px rgba(0,0,0,0.3);">▲</div>`,
            className: 'route-arrow',
            iconSize: [18, 18],
            iconAnchor: [9, 9]
          });
          
          const arrowMarker = L.marker([coord[0], coord[1]], { icon: arrowIcon }).addTo(map);
          arrowMarkersRef.current.push(arrowMarker);
        }
      }
      
    } catch (error) {
      console.error('Error calculating route:', error);
      setRouteInfo(null);
    }
  }, [startPoint, endPoint, roadSegments, routingEnabled, tallVehicleRouting]);

  // Handle start and end point markers
  useEffect(() => {
    if (!mapInstanceRef.current || !routingEnabled) return;

    const map = mapInstanceRef.current;

    // Remove existing markers
    if (startMarkerRef.current) {
      map.removeLayer(startMarkerRef.current);
      startMarkerRef.current = null;
    }
    if (endMarkerRef.current) {
      map.removeLayer(endMarkerRef.current);
      endMarkerRef.current = null;
    }

    const createCustomIcon = (label: string, color: string) => {
      return L.divIcon({
        html: `<div style="background-color: ${color}; color: white; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 14px; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">${label}</div>`,
        className: 'custom-marker',
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });
    };

    // Add start point marker (A)
    if (startPoint) {
      startMarkerRef.current = L.marker([startPoint[0], startPoint[1]], {
        icon: createCustomIcon('A', '#22c55e') // Green
      }).addTo(map);
    }

    // Add end point marker (B)
    if (endPoint) {
      endMarkerRef.current = L.marker([endPoint[0], endPoint[1]], {
        icon: createCustomIcon('B', '#ef4444') // Red
      }).addTo(map);
    }

  }, [startPoint, endPoint, routingEnabled]);

  // Handle segment status selection
  const handleSegmentStatusSelect = (newStatus: 'passable' | 'restricted' | 'blocked') => {
    if (!segmentSelector.segment) return;
    
    const segment = segmentSelector.segment;
    
    // Mark this segment as locally updated to prevent real-time override
    locallyUpdatedSegments.current.add(segment.id);
    
    // Update state immediately for consistency
    const updatedSegments = roadSegments.map(s =>
      s.id === segment.id ? { ...s, status: newStatus } : s
    );
    setRoadSegments(updatedSegments);
    
    // Show notification for immediate feedback
    const statusLabels = {
      'passable': 'Open (Green)',
      'restricted': 'Restricted (Yellow)', 
      'blocked': 'Blocked (Red)'
    };
    showNotification(
      `Road status updated to: ${statusLabels[newStatus]}`, 
      'success'
    );
    
    // Log the update asynchronously
    logUpdate(segment.id, newStatus, segment.properties?.name || 'Unknown Road').catch(error => {
      console.warn('Failed to log update:', error);
    });
    
    // Close the selector
    setSegmentSelector(prev => ({ ...prev, isOpen: false }));
  };

  // Handle closing the segment selector
  const handleSegmentSelectorClose = () => {
    setSegmentSelector(prev => ({ ...prev, isOpen: false }));
  };
  const findNearestRoadPoint = (clickLat: number, clickLng: number): [number, number] | null => {
    let nearestPoint: [number, number] | null = null;
    let minDistance = Infinity;
    const maxDistance = 100; // Maximum distance in meters to consider a point valid

    for (const segment of roadSegments) {
      // Skip blocked segments for routing points
      if (segment.status === 'blocked') continue;

      const coords = segment.coordinates;
      for (let i = 0; i < coords.length - 1; i++) {
        const [lat1, lng1] = coords[i];
        const [lat2, lng2] = coords[i + 1];

        // Find the closest point on this line segment to the click point
        const distance = pointToLineDistance([clickLat, clickLng], [lat1, lng1], [lat2, lng2]);
        
        if (distance < minDistance && distance <= maxDistance) {
          minDistance = distance;
          
          // Calculate the projection point on the line segment
          const projectionDistance = getProjectionDistance([clickLat, clickLng], [lat1, lng1], [lat2, lng2]);
          const segmentLength = Math.sqrt(Math.pow(lat2 - lat1, 2) + Math.pow(lng2 - lng1, 2));
          
          // Clamp the projection to the line segment
          const t = Math.max(0, Math.min(1, projectionDistance / segmentLength));
          const projectedLat = lat1 + t * (lat2 - lat1);
          const projectedLng = lng1 + t * (lng2 - lng1);
          
          nearestPoint = [projectedLat, projectedLng];
        }
      }
    }

    return nearestPoint;
  };

  // Handle map clicks for routing
  useEffect(() => {
    if (!mapInstanceRef.current || !routingEnabled) return;

    const map = mapInstanceRef.current;

    const handleMapClick = (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      
      // Find the nearest valid road point
      const nearestRoadPoint = findNearestRoadPoint(lat, lng);
      
      if (!nearestRoadPoint) {
        // Show notification if click is not near a valid road
        showNotification('Please click on or near a road segment to place routing points.', 'warning');
        return;
      }
      
      if (!startPoint) {
        setStartPoint(nearestRoadPoint);
      } else if (!endPoint) {
        setEndPoint(nearestRoadPoint);
      } else {
        // Reset and start new route
        setStartPoint(nearestRoadPoint);
        setEndPoint(null);
      }
    };

    // Handle drag and drop on map
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.dataTransfer!.dropEffect = 'move';
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      const dragData = e.dataTransfer!.getData('text/plain');
      
      // Get the map container bounds
      const mapContainer = mapRef.current;
      if (!mapContainer) return;
      
      const rect = mapContainer.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      // Convert pixel coordinates to lat/lng
      const point = map.containerPointToLatLng([x, y]);
      const lat = point.lat;
      const lng = point.lng;
      
      // Find the nearest valid road point for drag and drop
      const nearestRoadPoint = findNearestRoadPoint(lat, lng);
      
      if (!nearestRoadPoint) {
        // Show notification if drop is not near a valid road
        showNotification('Please drop routing points on or near a road segment.', 'warning');
        return;
      }
      
      if (dragData === 'point-a') {
        setStartPoint(nearestRoadPoint);
        // Auto-enable routing when points are set via drag and drop
        if (!routingEnabled && onRoutingToggle) {
          onRoutingToggle(true);
        }
      } else if (dragData === 'point-b') {
        setEndPoint(nearestRoadPoint);
        // Auto-enable routing when points are set via drag and drop
        if (!routingEnabled && onRoutingToggle) {
          onRoutingToggle(true);
        }
      }
      
      // Add visual feedback
      const dropIndicator = document.createElement('div');
      dropIndicator.innerHTML = `<div style="
        position: absolute;
        left: ${x}px;
        top: ${y}px;
        background: ${dragData === 'point-a' ? '#10b981' : '#3b82f6'};
        color: white;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 12px;
        font-weight: bold;
        z-index: 1000;
        pointer-events: none;
        animation: fadeOut 2s forwards;
      ">${dragData === 'point-a' ? 'Point A Set!' : 'Point B Set!'}</div>`;
      
      mapContainer.appendChild(dropIndicator);
      
      // Remove the indicator after animation
      setTimeout(() => {
        if (dropIndicator.parentNode) {
          dropIndicator.parentNode.removeChild(dropIndicator);
        }
      }, 2000);
    };

    // Add event listeners to map container
    const mapContainer = mapRef.current;
    if (mapContainer) {
      mapContainer.addEventListener('dragover', handleDragOver);
      mapContainer.addEventListener('drop', handleDrop);
    }

    map.on('click', handleMapClick);

    return () => {
      map.off('click', handleMapClick);
      if (mapContainer) {
        mapContainer.removeEventListener('dragover', handleDragOver);
        mapContainer.removeEventListener('drop', handleDrop);
      }
    };
  }, [startPoint, endPoint, routingEnabled]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapRef} className="w-full h-full" />
      
      {routingEnabled && (
        <>
          {routeInfo && (
            <div className={`absolute top-2 sm:top-4 right-2 sm:right-4 p-3 sm:p-4 rounded-xl shadow-xl border z-[1000] min-w-[180px] sm:min-w-[200px] max-w-[280px] sm:max-w-none transition-colors duration-200 ${
              theme === 'dark' 
                ? 'bg-gradient-to-br from-gray-800 to-gray-900 border-gray-600' 
                : 'bg-gradient-to-br from-blue-50 to-indigo-100 border-blue-200'
            }`}>
              <div className="flex items-center mb-2 sm:mb-3">
                <div className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full mr-2 ${
                  theme === 'dark' ? 'bg-blue-400' : 'bg-blue-500'
                }`}></div>
                <h3 className={`text-xs sm:text-sm font-semibold ${
                  theme === 'dark' ? 'text-gray-100' : 'text-gray-800'
                }`}>Route Information</h3>
              </div>
              
              <div className="space-y-2 sm:space-y-3">
                {/* Distance */}
                <div className={`flex items-center justify-between rounded-lg p-1.5 sm:p-2 ${
                  theme === 'dark' ? 'bg-gray-700/70' : 'bg-white/70'
                }`}>
                  <div className="flex items-center">
                    <svg className={`w-3 h-3 sm:w-4 sm:h-4 mr-1.5 sm:mr-2 ${
                      theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
                    }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                    <span className={`text-xs font-medium ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                    }`}>Distance</span>
                  </div>
                  <span className={`text-xs sm:text-sm font-bold ${
                    theme === 'dark' ? 'text-gray-100' : 'text-gray-800'
                  }`}>{formatDistance(routeInfo.distance)}</span>
                </div>

                {/* ETA */}
                <div className={`flex items-center justify-between rounded-lg p-1.5 sm:p-2 ${
                  theme === 'dark' ? 'bg-gray-700/70' : 'bg-white/70'
                }`}>
                  <div className="flex items-center">
                    <svg className={`w-3 h-3 sm:w-4 sm:h-4 mr-1.5 sm:mr-2 ${
                      theme === 'dark' ? 'text-green-400' : 'text-green-600'
                    }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className={`text-xs font-medium ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                    }`}>ETA</span>
                  </div>
                  <span className={`text-xs sm:text-sm font-bold ${
                    theme === 'dark' ? 'text-gray-100' : 'text-gray-800'
                  }`}>{routeInfo.eta.toFixed(0)} min</span>
                </div>

                {/* Speed */}
                <div className={`flex items-center justify-between rounded-lg p-1.5 sm:p-2 ${
                  theme === 'dark' ? 'bg-gray-700/70' : 'bg-white/70'
                }`}>
                  <div className="flex items-center">
                    <svg className={`w-3 h-3 sm:w-4 sm:h-4 mr-1.5 sm:mr-2 ${
                      theme === 'dark' ? 'text-orange-400' : 'text-orange-600'
                    }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <span className={`text-xs font-medium ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                    }`}>Avg Speed</span>
                  </div>
                  <span className={`text-xs sm:text-sm font-bold ${
                    theme === 'dark' ? 'text-gray-100' : 'text-gray-800'
                  }`}>{calculateSpeed(routeInfo.distance, routeInfo.eta)} kph</span>
                </div>
              </div>
            </div>
          )}
          
          {/* Clear route button - Responsive positioning */}
          {(startPoint || endPoint) && (
            <button
              onClick={() => {
                setStartPoint(null);
                setEndPoint(null);
                setRouteInfo(null);
                if (routeLayerRef.current && mapInstanceRef.current) {
                  mapInstanceRef.current.removeLayer(routeLayerRef.current);
                  routeLayerRef.current = null;
                }
                // Also remove markers
                if (startMarkerRef.current && mapInstanceRef.current) {
                  mapInstanceRef.current.removeLayer(startMarkerRef.current);
                  startMarkerRef.current = null;
                }
                if (endMarkerRef.current && mapInstanceRef.current) {
                  mapInstanceRef.current.removeLayer(endMarkerRef.current);
                  endMarkerRef.current = null;
                }
              }}
              className={`absolute top-2 sm:top-4 left-2 sm:left-4 px-2 sm:px-3 py-1 rounded shadow-lg z-[1000] transition-colors duration-200 text-xs sm:text-sm ${
                theme === 'dark' 
                  ? 'bg-red-600 hover:bg-red-700 text-white' 
                  : 'bg-red-500 hover:bg-red-600 text-white'
              }`}
            >
              Clear Route
            </button>
          )}
        </>
      )}
      
      {/* Notification Component */}
      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          show={notification.show}
          onClose={hideNotification}
        />
      )}
      
      {/* Segment Status Selector */}
      <SegmentStatusSelector
        isOpen={segmentSelector.isOpen}
        onClose={handleSegmentSelectorClose}
        onStatusSelect={handleSegmentStatusSelect}
        currentStatus={segmentSelector.segment?.status || 'passable'}
        segmentName={segmentSelector.segment?.properties?.name || 'Road Segment'}
        position={segmentSelector.position}
      />
    </div>
  );
});

MapContainer.displayName = 'MapContainer';
