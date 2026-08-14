// ============================================================
// MOMTV Studio - Character Navigator
// ============================================================
// Waypoint-graph pathfinding (A*) and smooth character movement
// with Rive animation state transitions.
// ============================================================

import type {
  CharacterProfile,
  Waypoint,
  StudioZone,
  Vector2,
  PathfindingResult,
  Direction,
  CharacterActivity,
} from "@momtv/shared";

interface NavNode {
  waypoint: Waypoint;
  g: number;  // cost from start
  h: number;  // heuristic to goal
  f: number;  // g + h
  parent: NavNode | null;
}

/** Speed in pixels per second at 1x multiplier */
const BASE_WALK_SPEED = 120;

export class CharacterNavigator {
  private waypoints: Map<string, Waypoint> = new Map();
  private zones: StudioZone[] = [];
  private activePaths: Map<string, {
    path: Vector2[];
    currentIndex: number;
    startTime: number;
    estimatedDuration: number;
    animation: string;
    onComplete?: () => void;
  }> = new Map();

  constructor(zones: StudioZone[]) {
    this.zones = zones;
    this.buildWaypointMap();
  }

  // --- Setup ---

  private buildWaypointMap(): void {
    this.waypoints.clear();
    for (const zone of this.zones) {
      for (const wp of zone.waypoints) {
        this.waypoints.set(wp.id, wp);
      }
    }
  }

  updateZones(zones: StudioZone[]): void {
    this.zones = zones;
    this.buildWaypointMap();
  }

  // --- Pathfinding (A*) ---

  findPath(fromWaypointId: string, toWaypointId: string): PathfindingResult | null {
    if (fromWaypointId === toWaypointId) {
      const wp = this.waypoints.get(fromWaypointId);
      if (!wp) return null;
      return {
        waypoints: [wp],
        totalCost: 0,
        estimatedDuration: 0,
        path: [wp.position],
      };
    }

    const startNode = this.waypoints.get(fromWaypointId);
    const goalNode = this.waypoints.get(toWaypointId);
    if (!startNode || !goalNode) return null;

    const openSet: NavNode[] = [];
    const closedSet = new Set<string>();

    const start: NavNode = {
      waypoint: startNode,
      g: 0,
      h: this.heuristic(startNode.position, goalNode.position),
      f: 0,
      parent: null,
    };
    start.f = start.g + start.h;
    openSet.push(start);

    while (openSet.length > 0) {
      // Pick node with lowest f
      openSet.sort((a, b) => a.f - b.f);
      const current = openSet.shift()!;

      if (current.waypoint.id === toWaypointId) {
        return this.reconstructPath(current);
      }

      closedSet.add(current.waypoint.id);

      for (const neighborId of current.waypoint.connections) {
        if (closedSet.has(neighborId)) continue;

        const neighborWp = this.waypoints.get(neighborId);
        if (!neighborWp) continue;

        const moveCost = this.heuristic(current.waypoint.position, neighborWp.position);
        const speedMult = neighborWp.speed ?? 1.0;
        const g = current.g + moveCost / speedMult;

        const existing = openSet.find(n => n.waypoint.id === neighborId);
        if (existing) {
          if (g < existing.g) {
            existing.g = g;
            existing.f = g + existing.h;
            existing.parent = current;
          }
        } else {
          const h = this.heuristic(neighborWp.position, goalNode.position);
          openSet.push({
            waypoint: neighborWp,
            g,
            h,
            f: g + h,
            parent: current,
          });
        }
      }
    }

    return null; // No path found
  }

  /** Find path from arbitrary position to a zone (finds nearest waypoint in zone) */
  findPathToZone(fromPosition: Vector2, toZoneId: string): PathfindingResult | null {
    const targetZone = this.zones.find(z => z.id === toZoneId);
    if (!targetZone || targetZone.waypoints.length === 0) return null;

    // Find nearest waypoint to current position
    const nearestFrom = this.findNearestWaypoint(fromPosition);
    if (!nearestFrom) return null;

    // Find nearest waypoint in target zone
    let bestTarget: Waypoint | null = null;
    let bestDist = Infinity;
    for (const wp of targetZone.waypoints) {
      const d = this.heuristic(fromPosition, wp.position);
      if (d < bestDist) {
        bestDist = d;
        bestTarget = wp;
      }
    }
    if (!bestTarget) return null;

    return this.findPath(nearestFrom.id, bestTarget.id);
  }

  /** Find the nearest waypoint to an arbitrary position */
  findNearestWaypoint(position: Vector2): Waypoint | null {
    let best: Waypoint | null = null;
    let bestDist = Infinity;
    for (const wp of this.waypoints.values()) {
      const d = this.heuristic(position, wp.position);
      if (d < bestDist) {
        bestDist = d;
        best = wp;
      }
    }
    return best;
  }

  /** Find which zone a position is in */
  findZoneAtPosition(position: Vector2): StudioZone | null {
    for (const zone of this.zones) {
      const b = zone.bounds;
      if (
        position.x >= b.x && position.x <= b.x + b.w &&
        position.y >= b.y && position.y <= b.y + b.h
      ) {
        return zone;
      }
    }
    return null;
  }

  // --- Movement ---

  /** Start walking a character along a path */
  startWalk(
    characterId: string,
    pathResult: PathfindingResult,
    onComplete?: () => void,
  ): void {
    const speedMult = 1.0; // Could be per-character
    const duration = this.calculateDuration(pathResult.path, speedMult);

    this.activePaths.set(characterId, {
      path: pathResult.path,
      currentIndex: 0,
      startTime: Date.now(),
      estimatedDuration: duration,
      animation: "walking",
      onComplete,
    });
  }

  /** Get current interpolated position for a walking character */
  getPosition(characterId: string): { position: Vector2; direction: Direction; animation: string } | null {
    const walk = this.activePaths.get(characterId);
    if (!walk) return null;

    const elapsed = Date.now() - walk.startTime;
    const progress = Math.min(elapsed / walk.estimatedDuration, 1);

    if (progress >= 1) {
      // Walk complete
      const finalPos = walk.path[walk.path.length - 1];
      const callback = walk.onComplete;
      this.activePaths.delete(characterId);
      if (callback) callback();
      return { position: finalPos, direction: "south", animation: "idle" };
    }

    // Interpolate between path points
    const totalSegments = walk.path.length - 1;
    const segmentProgress = progress * totalSegments;
    const segIndex = Math.floor(segmentProgress);
    const segFraction = segmentProgress - segIndex;

    const from = walk.path[Math.min(segIndex, walk.path.length - 1)];
    const to = walk.path[Math.min(segIndex + 1, walk.path.length - 1)];

    const position: Vector2 = {
      x: from.x + (to.x - from.x) * segFraction,
      y: from.y + (to.y - from.y) * segFraction,
    };

    const direction = this.calculateDirection(from, to);
    return { position, direction, animation: walk.animation };
  }

  /** Check if a character is currently walking */
  isWalking(characterId: string): boolean {
    return this.activePaths.has(characterId);
  }

  /** Cancel an active walk */
  cancelWalk(characterId: string): void {
    this.activePaths.delete(characterId);
  }

  /** Get all currently active walks (for rendering loop) */
  getAllActivePositions(): Map<string, { position: Vector2; direction: Direction; animation: string }> {
    const result = new Map<string, { position: Vector2; direction: Direction; animation: string }>();
    for (const characterId of this.activePaths.keys()) {
      const pos = this.getPosition(characterId);
      if (pos) {
        result.set(characterId, pos);
      }
    }
    return result;
  }

  // --- Utilities ---

  private heuristic(a: Vector2, b: Vector2): number {
    return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
  }

  private reconstructPath(node: NavNode): PathfindingResult {
    const waypoints: Waypoint[] = [];
    let current: NavNode | null = node;
    let totalCost = 0;

    while (current) {
      waypoints.unshift(current.waypoint);
      totalCost = current.g;
      current = current.parent;
    }

    const path = this.interpolatePath(waypoints.map(wp => wp.position));
    const duration = this.calculateDuration(path, 1.0);

    return {
      waypoints,
      totalCost,
      estimatedDuration: duration,
      path,
    };
  }

  /** Interpolate between waypoints to create smooth path segments */
  private interpolatePath(positions: Vector2[]): Vector2[] {
    if (positions.length < 2) return positions;

    const result: Vector2[] = [positions[0]];
    const stepSize = 10; // pixels between interpolated points

    for (let i = 0; i < positions.length - 1; i++) {
      const from = positions[i];
      const to = positions[i + 1];
      const dist = this.heuristic(from, to);
      const steps = Math.max(1, Math.ceil(dist / stepSize));

      for (let s = 1; s <= steps; s++) {
        const t = s / steps;
        result.push({
          x: from.x + (to.x - from.x) * t,
          y: from.y + (to.y - from.y) * t,
        });
      }
    }

    return result;
  }

  private calculateDuration(path: Vector2[], speedMult: number): number {
    let totalDist = 0;
    for (let i = 0; i < path.length - 1; i++) {
      totalDist += this.heuristic(path[i], path[i + 1]);
    }
    return (totalDist / (BASE_WALK_SPEED * speedMult)) * 1000; // ms
  }

  private calculateDirection(from: Vector2, to: Vector2): Direction {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);

    if (angle >= -22.5 && angle < 22.5) return "east";
    if (angle >= 22.5 && angle < 67.5) return "se";
    if (angle >= 67.5 && angle < 112.5) return "south";
    if (angle >= 112.5 && angle < 157.5) return "sw";
    if (angle >= 157.5 || angle < -157.5) return "west";
    if (angle >= -157.5 && angle < -112.5) return "nw";
    if (angle >= -112.5 && angle < -67.5) return "north";
    return "ne";
  }
}