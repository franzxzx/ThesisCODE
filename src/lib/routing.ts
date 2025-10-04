// src/lib/routing.ts

export type GraphNode = {
  id: number;
  lat: number;
  lng: number;
  edges: { to: number; cost: number }[];
};

export type Graph = {
  nodes: GraphNode[];
};

/**
 * Build a graph from road segments:
 * - Blocked (red) segments are skipped entirely.
 * - For tall vehicles: yellow segments are preferred (lower cost), passable segments have penalty
 * - For regular vehicles: yellow segments have penalty, passable segments are preferred
 */
export function buildGraph(roadSegments: any[], tallVehicleMode = false): Graph {
  const nodes: GraphNode[] = [];
  const nodeIndexMap = new Map<string, number>();

  function getOrCreateNode(lat: number, lng: number) {
    const key = `${lat.toFixed(9)},${lng.toFixed(9)}`;
    if (!nodeIndexMap.has(key)) {
      const node = { id: nodes.length, lat, lng, edges: [] };
      nodeIndexMap.set(key, node.id);
      nodes.push(node);
    }
    return nodeIndexMap.get(key)!;
  }

  for (const seg of roadSegments) {
    if (seg.status === 'blocked') continue; // Skip completely

    const coords = seg.coordinates;
    
    // Cost calculation based on vehicle type and segment status
    let baseCost: number;
    if (tallVehicleMode) {
      // Tall vehicles prefer yellow (restricted) segments
      baseCost = seg.status === 'restricted' ? 0.5 : 1; // Yellow segments are preferred (lower cost)
    } else {
      // Regular vehicles prefer passable segments
      baseCost = seg.status === 'restricted' ? 3 : 1; // Yellow segments have penalty
    }

    for (let i = 0; i < coords.length - 1; i++) {
      const [lat1, lng1] = coords[i];
      const [lat2, lng2] = coords[i + 1];

      const idx1 = getOrCreateNode(lat1, lng1);
      const idx2 = getOrCreateNode(lat2, lng2);

      const dist = haversineDistance(lat1, lng1, lat2, lng2) * baseCost;
      nodes[idx1].edges.push({ to: idx2, cost: dist });
      nodes[idx2].edges.push({ to: idx1, cost: dist }); // bidirectional
    }
  }

  return { nodes };
}

// Haversine distance in meters
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Find the nearest node index to a given lat/lng.
 */
export function findNearestNode(graph: Graph, lat: number, lng: number): number {
  let bestIdx = -1;
  let bestDist = Infinity;

  graph.nodes.forEach((node, idx) => {
    const d = haversineDistance(lat, lng, node.lat, node.lng);
    if (d < bestDist) {
      bestDist = d;
      bestIdx = idx;
    }
  });

  return bestIdx;
}

/**
 * A* algorithm
 */
export function astar(graph: Graph, startIdx: number, goalIdx: number): number[] | null {
  const openSet = new Set<number>([startIdx]);
  const cameFrom = new Map<number, number>();

  const gScore = new Map<number, number>();
  const fScore = new Map<number, number>();

  graph.nodes.forEach(node => {
    gScore.set(node.id, Infinity);
    fScore.set(node.id, Infinity);
  });
  gScore.set(startIdx, 0);
  fScore.set(startIdx, heuristic(graph.nodes[startIdx], graph.nodes[goalIdx]));

  function heuristic(a: GraphNode, b: GraphNode) {
    return haversineDistance(a.lat, a.lng, b.lat, b.lng);
  }

  while (openSet.size > 0) {
    let current = -1;
    let currentF = Infinity;

    openSet.forEach(idx => {
      const score = fScore.get(idx)!;
      if (score < currentF) {
        currentF = score;
        current = idx;
      }
    });

    if (current === goalIdx) {
      const path = [current];
      while (cameFrom.has(current)) {
        current = cameFrom.get(current)!;
        path.unshift(current);
      }
      return path;
    }

    openSet.delete(current);

    for (const edge of graph.nodes[current].edges) {
      const tentativeG = gScore.get(current)! + edge.cost;
      if (tentativeG < gScore.get(edge.to)!) {
        cameFrom.set(edge.to, current);
        gScore.set(edge.to, tentativeG);
        fScore.set(edge.to, tentativeG + heuristic(graph.nodes[edge.to], graph.nodes[goalIdx]));
        openSet.add(edge.to);
      }
    }
  }

  return null; // no route found
}

/**
 * Convert node index path to lat/lng array
 */
export function nodesToLatLng(graph: Graph, pathIdxs: number[]): [number, number][] {
  return pathIdxs.map(idx => [graph.nodes[idx].lat, graph.nodes[idx].lng]);
}

/**
 * Calculate total distance of a route path
 */
export function calculateRouteDistance(graph: Graph, pathIdxs: number[]): number {
  if (pathIdxs.length < 2) return 0;
  
  let totalDistance = 0;
  for (let i = 0; i < pathIdxs.length - 1; i++) {
    const currentNode = graph.nodes[pathIdxs[i]];
    const nextNode = graph.nodes[pathIdxs[i + 1]];
    
    // Calculate actual distance between consecutive nodes
    const distance = haversineDistance(currentNode.lat, currentNode.lng, nextNode.lat, nextNode.lng);
    totalDistance += distance;
  }
  
  return totalDistance;
}

/**
 * Calculate ETA based on distance and average speed
 */
export function calculateETA(distanceMeters: number, avgSpeedKmh: number = 30): number {
  const distanceKm = distanceMeters / 1000;
  const timeHours = distanceKm / avgSpeedKmh;
  return timeHours * 60; // Return minutes
}
