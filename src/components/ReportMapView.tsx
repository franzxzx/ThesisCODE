// src/components/ReportMapView.tsx
import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { X } from 'lucide-react';

type RoadStatus = 'passable' | 'restricted' | 'blocked';

type ReportRoad = {
  id: string;
  segment_id: string;
  road_name: string;
  status: RoadStatus;
  updated_at: string;
  coordinates?: [number, number][];
};

interface ReportMapViewProps {
  roads: ReportRoad[];
  onClose: () => void;
}

export const ReportMapView: React.FC<ReportMapViewProps> = ({ roads, onClose }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current) return;

    // Initialize map
    const map = L.map(mapRef.current).setView([13.1391, 123.7438], 13); // Legazpi City coordinates
    leafletMap.current = map;

    // Add OpenStreetMap tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    // Define colors for different road statuses
    const statusColors = {
      passable: '#4ade80', // green
      restricted: '#facc15', // yellow
      blocked: '#ef4444', // red
    };

    // Add roads to the map
    const roadLayers: L.Polyline[] = [];
    roads.forEach(road => {
      if (road.coordinates && road.coordinates.length > 0) {
        // Convert coordinates to LatLng format
        const latLngs = road.coordinates.map(coord => L.latLng(coord[1], coord[0]));
        
        // Create polyline with color based on status
        const polyline = L.polyline(latLngs, {
          color: statusColors[road.status] || '#6b7280', // gray as fallback
          weight: 5,
          opacity: 0.8
        }).addTo(map);
        
        // Add popup with road information
        const formattedDate = new Date(road.updated_at).toLocaleString();
        polyline.bindPopup(`
          <div class="font-medium">${road.road_name || 'Unnamed Road'}</div>
          <div>Status: ${road.status}</div>
          <div>Updated: ${formattedDate}</div>
          <div>ID: ${road.segment_id}</div>
        `);
        
        roadLayers.push(polyline);
      }
    });

    // Fit map bounds to show all roads
    if (roadLayers.length > 0) {
      const group = new L.FeatureGroup(roadLayers);
      map.fitBounds(group.getBounds(), { padding: [50, 50] });
    }

    // Cleanup on unmount
    return () => {
      if (map) {
        map.remove();
        leafletMap.current = null;
      }
    };
  }, [roads]);

  return (
    <div className="fixed inset-0 z-[3000] bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-900">Road Status Map</h2>
          <button 
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100"
            aria-label="Close map"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="flex-1 relative">
          <div ref={mapRef} className="absolute inset-0"></div>
        </div>
        
        <div className="px-6 py-3 border-t bg-gray-50">
          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-[#4ade80]"></div>
              <span>Passable</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-[#facc15]"></div>
              <span>Restricted</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-[#ef4444]"></div>
              <span>Blocked</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};