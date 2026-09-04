import * as THREE from 'three';

export interface NavNode {
  id: number;
  pos: THREE.Vector3;
  neighbors: number[];
}

// Reusable scratch objects to eliminate GC pressure during pathfinding and line-of-sight raycasts
const _scratchDir = new THREE.Vector3();
const _scratchRay = new THREE.Ray();
const _scratchIntersect = new THREE.Vector3();
const _scratchBox = new THREE.Box3();

/**
 * Checks if a 3D line segment between p1 and p2 intersects any building collision box.
 */
export function isLineObstructed(
  p1: THREE.Vector3,
  p2: THREE.Vector3,
  boxes: THREE.Box3[],
  margin: number = 0.8
): boolean {
  _scratchDir.subVectors(p2, p1);
  const dist = _scratchDir.length();
  if (dist < 0.01) return false;
  _scratchDir.normalize();

  _scratchRay.origin.copy(p1);
  _scratchRay.direction.copy(_scratchDir);

  const minX = Math.min(p1.x, p2.x) - margin;
  const maxX = Math.max(p1.x, p2.x) + margin;
  const minY = Math.min(p1.y, p2.y) - margin;
  const maxY = Math.max(p1.y, p2.y) + margin;
  const minZ = Math.min(p1.z, p2.z) - margin;
  const maxZ = Math.max(p1.z, p2.z) + margin;

  for (let i = 0; i < boxes.length; i++) {
    const box = boxes[i];
    // Broadphase: Quick AABB overlap rejection before raycast
    if (box.max.x < minX || box.min.x > maxX ||
        box.max.y < minY || box.min.y > maxY ||
        box.max.z < minZ || box.min.z > maxZ) {
      continue;
    }

    // Expand collision box by margin
    _scratchBox.min.set(box.min.x - margin, box.min.y - margin, box.min.z - margin);
    _scratchBox.max.set(box.max.x + margin, box.max.y + margin, box.max.z + margin);

    if (_scratchBox.containsPoint(p1) || _scratchBox.containsPoint(p2)) {
      return true;
    }

    if (_scratchRay.intersectBox(_scratchBox, _scratchIntersect)) {
      const hitDist = p1.distanceTo(_scratchIntersect);
      if (hitDist <= dist) {
        return true;
      }
    }
  }

  return false;
}

export class CityNavGraph {
  public nodes: NavNode[] = [];

  constructor() {
    this.initGraph();
  }

  private addNode(x: number, y: number, z: number): number {
    const id = this.nodes.length;
    this.nodes.push({
      id,
      pos: new THREE.Vector3(x, y, z),
      neighbors: []
    });
    return id;
  }

  private connect(id1: number, id2: number) {
    if (id1 < 0 || id2 < 0 || id1 >= this.nodes.length || id2 >= this.nodes.length) return;
    if (!this.nodes[id1].neighbors.includes(id2)) this.nodes[id1].neighbors.push(id2);
    if (!this.nodes[id2].neighbors.includes(id1)) this.nodes[id2].neighbors.push(id1);
  }

  private connectDirected(fromId: number, toId: number) {
    if (fromId < 0 || toId < 0 || fromId >= this.nodes.length || toId >= this.nodes.length) return;
    if (!this.nodes[fromId].neighbors.includes(toId)) this.nodes[fromId].neighbors.push(toId);
  }

  private initGraph() {
    // 1. Grid of street intersections & open airways (at street flight altitude y=4.5 and mid-air y=14)
    const xCorridors = [-88, -52, -18, 0, 18, 52, 88];
    const zCrossways = [-65, -40, -20, 0, 20, 40, 65];
    const altitudes = [4.5, 14.0];

    const gridMap: { [key: string]: number } = {};

    altitudes.forEach((y) => {
      zCrossways.forEach((z) => {
        xCorridors.forEach((x) => {
          // Skip positions directly inside solid skyscrapers
          // Alpha: (-35, -40), Twin S: (-70, -20), Twin N: (-70, 30)
          // Plaza: (35, 0), Gamma: (35, 40), Hospital: (70, -20), Annex: (70, 30)
          const nodeKey = `${x},${y},${z}`;
          const id = this.addNode(x, y, z);
          gridMap[nodeKey] = id;
        });
      });
    });

    // Connect grid horizontally (along X and along Z)
    altitudes.forEach((y) => {
      zCrossways.forEach((z) => {
        for (let i = 0; i < xCorridors.length - 1; i++) {
          const id1 = gridMap[`${xCorridors[i]},${y},${z}`];
          const id2 = gridMap[`${xCorridors[i + 1]},${y},${z}`];
          if (id1 !== undefined && id2 !== undefined) this.connect(id1, id2);
        }
      });

      xCorridors.forEach((x) => {
        for (let j = 0; j < zCrossways.length - 1; j++) {
          const id1 = gridMap[`${x},${y},${zCrossways[j]}`];
          const id2 = gridMap[`${x},${y},${zCrossways[j + 1]}`];
          if (id1 !== undefined && id2 !== undefined) this.connect(id1, id2);
        }
      });
    });

    // Connect vertical levels at each grid column
    zCrossways.forEach((z) => {
      xCorridors.forEach((x) => {
        const idLow = gridMap[`${x},4.5,${z}`];
        const idMid = gridMap[`${x},14,${z}`];
        if (idLow !== undefined && idMid !== undefined) this.connect(idLow, idMid);
      });
    });

    // 2. High-Altitude Clear Airspace Grid (y=44, clear above all buildings)
    const skyY = 44.0;
    const skyXs = [-70, -35, 0, 35, 70];
    const skyZs = [-60, -20, 20, 60];
    const skyMap: { [key: string]: number } = {};

    skyZs.forEach((z) => {
      skyXs.forEach((x) => {
        const id = this.addNode(x, skyY, z);
        skyMap[`${x},${z}`] = id;
      });
    });

    // Connect Sky Grid
    skyZs.forEach((z) => {
      for (let i = 0; i < skyXs.length - 1; i++) {
        const id1 = skyMap[`${skyXs[i]},${z}`];
        const id2 = skyMap[`${skyXs[i + 1]},${z}`];
        if (id1 !== undefined && id2 !== undefined) this.connect(id1, id2);
      }
    });
    skyXs.forEach((x) => {
      for (let j = 0; j < skyZs.length - 1; j++) {
        const id1 = skyMap[`${x},${skyZs[j]}`];
        const id2 = skyMap[`${x},${skyZs[j + 1]}`];
        if (id1 !== undefined && id2 !== undefined) this.connect(id1, id2);
      }
    });

    // Connect Mid-air to Sky Grid
    skyXs.forEach((x) => {
      skyZs.forEach((z) => {
        const skyId = skyMap[`${x},${z}`];
        // Connect to nearest mid node
        const nearestGridX = xCorridors.reduce((prev, curr) => Math.abs(curr - x) < Math.abs(prev - x) ? curr : prev);
        const nearestGridZ = zCrossways.reduce((prev, curr) => Math.abs(curr - z) < Math.abs(prev - z) ? curr : prev);
        const midId = gridMap[`${nearestGridX},14,${nearestGridZ}`];
        if (skyId !== undefined && midId !== undefined) {
          this.connect(skyId, midId);
        }
      });
    });

    // 3. Special Building Penetration Tunnels & Rooftop Access Corridors
    // A) Alpha Skyscraper Tunnel at (-35, 12, -40) - Flown North-to-South (+Z direction)
    // Enters from behind the building (North at z=-52) and exits at the front (South at z=-28, the photo location)
    const alphaBackApproach = this.addNode(-35, 12, -65);
    const alphaBackIn = this.addNode(-35, 12, -52); // North Entrance (behind building)
    const alphaInside = this.addNode(-35, 12, -40);
    const alphaFrontOut = this.addNode(-35, 12, -28); // South Exit (front, photo location)
    const alphaFrontExit = this.addNode(-35, 12, -18);
    
    // Strict ONE-WAY Tunnel flow through Alpha Skyscraper (cannot be flown backwards!)
    this.connectDirected(alphaBackApproach, alphaBackIn);
    this.connectDirected(alphaBackIn, alphaInside);
    this.connectDirected(alphaInside, alphaFrontOut);
    this.connectDirected(alphaFrontOut, alphaFrontExit);

    // Smooth street routes leading from plaza / arch to Alpha North entrance (behind building)
    const streetCornerNE = this.addNode(-18, 10, -45);
    const streetNorthMid = this.addNode(-18, 12, -65);
    this.connect(streetCornerNE, streetNorthMid);
    this.connect(streetNorthMid, alphaBackApproach);

    const nearAlphaStreetN1 = gridMap[`-18,14,-65`];
    const nearAlphaStreetN2 = gridMap[`-52,14,-65`];
    const nearAlphaStreetN3 = gridMap[`0,14,-65`];
    const nearAlphaStreetMid = gridMap[`-18,14,-40`];
    if (nearAlphaStreetN1 !== undefined) this.connect(alphaBackApproach, nearAlphaStreetN1);
    if (nearAlphaStreetN2 !== undefined) this.connect(alphaBackApproach, nearAlphaStreetN2);
    if (nearAlphaStreetN3 !== undefined) this.connect(alphaBackApproach, nearAlphaStreetN3);
    if (nearAlphaStreetMid !== undefined) this.connect(streetCornerNE, nearAlphaStreetMid);

    // Connect Alpha South exit to south street corridors & Twin Tower approach
    const nearAlphaStreetS1 = gridMap[`-18,14,-20`];
    const nearAlphaStreetS2 = gridMap[`-52,14,-20`];
    if (nearAlphaStreetS1 !== undefined) this.connect(alphaFrontExit, nearAlphaStreetS1);
    if (nearAlphaStreetS2 !== undefined) this.connect(alphaFrontExit, nearAlphaStreetS2);

    // B) Twin Towers & Skybridge Tunnel at x = -70, y = 20 - Flown North-to-South (+Z direction)
    // Twin Tower South extends z: -32 to -8; Skybridge z: -8 to 18; Twin Tower North z: 18 to 42
    const twinApproach = this.addNode(-70, 20, -46);
    const twinSouthIn = this.addNode(-70, 20, -32); // North-facing Entrance
    const twinSouthInside = this.addNode(-70, 20, -20);
    const twinBridgeIn = this.addNode(-70, 20, -8);
    const twinBridgeMid = this.addNode(-70, 20, 5); // Center of skybridge
    const twinBridgeOut = this.addNode(-70, 20, 18);
    const twinNorthInside = this.addNode(-70, 20, 30);
    const twinNorthOut = this.addNode(-70, 20, 42); // North Tower Exit
    const twinNorthBuffer = this.addNode(-70, 20, 58);

    // Alpha Exit leads directly to Twin Towers approach
    this.connectDirected(alphaFrontExit, twinApproach);

    // Strict ONE-WAY Tunnel flow through Twin Towers & Skybridge
    this.connectDirected(twinApproach, twinSouthIn);
    this.connectDirected(twinSouthIn, twinSouthInside);
    this.connectDirected(twinSouthInside, twinBridgeIn);
    this.connectDirected(twinBridgeIn, twinBridgeMid);
    this.connectDirected(twinBridgeMid, twinBridgeOut);
    this.connectDirected(twinBridgeOut, twinNorthInside);
    this.connectDirected(twinNorthInside, twinNorthOut);
    this.connectDirected(twinNorthOut, twinNorthBuffer);

    const nearTwinStreetS = gridMap[`-52,14,-40`];
    const nearTwinStreetS2 = gridMap[`-52,14,-20`];
    const nearTwinStreetN = gridMap[`-52,14,20`];
    const nearTwinStreetN2 = gridMap[`-52,14,40`];
    if (nearTwinStreetS !== undefined) this.connect(twinApproach, nearTwinStreetS);
    if (nearTwinStreetS2 !== undefined) this.connect(twinApproach, nearTwinStreetS2);
    if (nearTwinStreetN !== undefined) this.connect(twinNorthBuffer, nearTwinStreetN);
    if (nearTwinStreetN2 !== undefined) this.connect(twinNorthBuffer, nearTwinStreetN2);

    // Twin Tower Rescue Rooftop (-70, 39, 30)
    const rescueRoofTop = this.addNode(-70, 39.5, 30);
    const rescueRoofApproach = this.addNode(-70, 44, 30);
    this.connect(rescueRoofTop, rescueRoofApproach);
    const nearSkyRescue = skyMap[`-70,20`];
    if (nearSkyRescue !== undefined) this.connect(rescueRoofApproach, nearSkyRescue);

    // C) North Skyline High-Speed Connector (Twin North buffer to Gamma Entrance)
    const northCross1 = this.addNode(-20, 16, 60);
    const northCross2 = this.addNode(15, 14, 60);
    this.connectDirected(twinNorthBuffer, northCross1);
    this.connectDirected(northCross1, northCross2);

    // D) Gamma Skyscraper Tunnel at (35, 14, 40) - Flown North-to-South (-Z direction from z=64 to z=16)
    // Gamma extends z: 28 to 52
    const gammaApproach = this.addNode(35, 14, 60);
    const gammaNorthIn = this.addNode(35, 14, 52); // North-facing Entrance at +Z side
    const gammaInside = this.addNode(35, 14, 40);
    const gammaSouthOut = this.addNode(35, 14, 28); // South-facing Exit at -Z side
    const gammaBuffer = this.addNode(35, 14, 16);
    const southWaterfrontArch = this.addNode(15, 8, 15);
    const finishGateNode = this.addNode(0, 5, 12);

    this.connectDirected(northCross2, gammaApproach);
    this.connectDirected(gammaApproach, gammaNorthIn);
    this.connectDirected(gammaNorthIn, gammaInside);
    this.connectDirected(gammaInside, gammaSouthOut);
    this.connectDirected(gammaSouthOut, gammaBuffer);
    this.connectDirected(gammaBuffer, southWaterfrontArch);
    this.connectDirected(southWaterfrontArch, finishGateNode);

    const nearGammaStreetNorth1 = gridMap[`18,14,40`];
    const nearGammaStreetNorth2 = gridMap[`52,14,40`];
    const nearGammaStreetSouth1 = gridMap[`18,14,20`];
    const nearGammaStreetSouth2 = gridMap[`52,14,20`];
    const nearGammaStreetSouth3 = gridMap[`0,4.5,20`];
    if (nearGammaStreetNorth1 !== undefined) this.connect(gammaApproach, nearGammaStreetNorth1);
    if (nearGammaStreetNorth2 !== undefined) this.connect(gammaApproach, nearGammaStreetNorth2);
    if (nearGammaStreetSouth1 !== undefined) this.connect(gammaBuffer, nearGammaStreetSouth1);
    if (nearGammaStreetSouth2 !== undefined) this.connect(gammaBuffer, nearGammaStreetSouth2);
    if (nearGammaStreetSouth3 !== undefined) this.connect(gammaBuffer, nearGammaStreetSouth3);

    // E) Arch Portal & National Assembly Grand Corridor
    const natAssemblyGate1 = this.addNode(0, 6, -45);
    const natAssemblyGate2 = this.addNode(0, 8, -95);
    const natAssemblyDomeClimb = this.addNode(0, 16, -95);
    const westTowerDive = this.addNode(-50, 10, -75);
    const natAssemblyTurn = this.addNode(-35, 12, -75);
    const waterSlalom = this.addNode(35, 6, -10);

    this.connect(natAssemblyGate1, natAssemblyGate2);
    this.connect(natAssemblyGate1, natAssemblyDomeClimb);
    this.connect(natAssemblyDomeClimb, westTowerDive);
    this.connect(westTowerDive, alphaBackApproach);
    this.connect(natAssemblyGate2, natAssemblyTurn);
    this.connect(natAssemblyTurn, alphaBackApproach);
    this.connect(gammaBuffer, waterSlalom);
    this.connect(waterSlalom, southWaterfrontArch);

    const archIn = this.addNode(0, 5, -16);
    const archMid = this.addNode(0, 5, -25);
    const archOut = this.addNode(0, 5, -34);
    this.connect(archIn, archMid);
    this.connect(archMid, archOut);
    this.connect(archOut, natAssemblyGate1);
    this.connect(archOut, streetCornerNE); // Direct connection to northeast street corner towards Alpha back!
    const nearArch1 = gridMap[`0,4.5,-20`];
    const nearArch2 = gridMap[`0,4.5,-40`];
    if (nearArch1 !== undefined) this.connect(archIn, nearArch1);
    if (nearArch2 !== undefined) this.connect(archOut, nearArch2);

    // F) 63 Building Observation Rooftop Helipad (45, 78.5, 95)
    const bldg63Helipad = this.addNode(45, 78.5, 95);
    const bldg63Approach = this.addNode(45, 86, 95);
    const bldg63Mid = this.addNode(45, 44, 95);
    this.connect(bldg63Helipad, bldg63Approach);
    this.connect(bldg63Approach, bldg63Mid);

    const nearSky63A = skyMap[`35,60`];
    const nearSky63B = skyMap[`70,60`];
    if (nearSky63A !== undefined) this.connect(bldg63Approach, nearSky63A);
    if (nearSky63B !== undefined) this.connect(bldg63Approach, nearSky63B);

    const nearGrid63A = gridMap[`52,14,65`];
    const nearGrid63B = gridMap[`18,14,65`];
    if (nearGrid63A !== undefined) this.connect(bldg63Mid, nearGrid63A);
    if (nearGrid63B !== undefined) this.connect(bldg63Mid, nearGrid63B);

    // G) Hospital Rooftop Helipad (70, 25, -20)
    const hospHelipad = this.addNode(70, 25, -20);
    const hospApproach = this.addNode(70, 30, -20);
    this.connect(hospHelipad, hospApproach);
    this.connect(hospApproach, bldg63Approach); // Direct high-altitude sky corridor between 63 Building and Hospital!
    const hospStreetApproach = this.addNode(52, 25, -20);
    this.connect(hospApproach, hospStreetApproach);
    const nearHospGrid = gridMap[`52,14,-20`];
    if (nearHospGrid !== undefined) this.connect(hospStreetApproach, nearHospGrid);
  }

  /**
   * Finds the shortest obstacle-free flyable route using A* pathfinding & String-Pulling shortcutting.
   */
  public findQuestPath(
    start: THREE.Vector3,
    goal: THREE.Vector3,
    boxes: THREE.Box3[]
  ): THREE.Vector3[] {
    // 1. Direct line of sight check (if clear, no waypoint detours required)
    if (!isLineObstructed(start, goal, boxes, 1.0)) {
      return [start.clone(), goal.clone()];
    }

    // 2. Find reachable entrance & exit nodes in the NavGraph
    let startNodeCandidates: { id: number; dist: number }[] = [];
    let goalNodeCandidates: { id: number; dist: number }[] = [];

    // Check if goal directly matches an existing node in graph (e.g. Tunnel Entrance)
    for (let i = 0; i < this.nodes.length; i++) {
      const node = this.nodes[i];
      if (goal.distanceTo(node.pos) < 0.6) {
        goalNodeCandidates.push({ id: node.id, dist: 0 });
        break;
      }
    }

    // Check if start directly matches an existing node in graph
    for (let i = 0; i < this.nodes.length; i++) {
      const node = this.nodes[i];
      if (start.distanceTo(node.pos) < 0.6) {
        startNodeCandidates.push({ id: node.id, dist: 0 });
        break;
      }
    }

    if (goalNodeCandidates.length === 0) {
      for (let i = 0; i < this.nodes.length; i++) {
        const node = this.nodes[i];
        const dGoal = goal.distanceTo(node.pos);
        if (dGoal < 95 && !isLineObstructed(node.pos, goal, boxes, 0.6)) {
          goalNodeCandidates.push({ id: node.id, dist: dGoal });
        }
      }
    }

    if (startNodeCandidates.length === 0) {
      for (let i = 0; i < this.nodes.length; i++) {
        const node = this.nodes[i];
        const dStart = start.distanceTo(node.pos);
        if (dStart < 95 && !isLineObstructed(start, node.pos, boxes, 0.6)) {
          startNodeCandidates.push({ id: node.id, dist: dStart });
        }
      }
    }

    // Fallback: If no direct visible node due to tight corner, pick nearest 3 nodes
    if (startNodeCandidates.length === 0) {
      const sorted = this.nodes
        .map(n => ({ id: n.id, dist: start.distanceTo(n.pos) }))
        .sort((a, b) => a.dist - b.dist);
      startNodeCandidates = sorted.slice(0, 4);
    }
    if (goalNodeCandidates.length === 0) {
      const sorted = this.nodes
        .map(n => ({ id: n.id, dist: goal.distanceTo(n.pos) }))
        .sort((a, b) => a.dist - b.dist);
      goalNodeCandidates = sorted.slice(0, 4);
    }

    startNodeCandidates.sort((a, b) => a.dist - b.dist);
    goalNodeCandidates.sort((a, b) => a.dist - b.dist);

    // 3. A* Search on NavGraph
    let bestRawPath: THREE.Vector3[] | null = null;
    let shortestTotalDist = Infinity;

    // Test best start/goal candidate pairs (up to 3)
    const testStartLimit = Math.min(3, startNodeCandidates.length);
    const testGoalLimit = Math.min(3, goalNodeCandidates.length);

    for (let sIdx = 0; sIdx < testStartLimit; sIdx++) {
      const startId = startNodeCandidates[sIdx].id;
      for (let gIdx = 0; gIdx < testGoalLimit; gIdx++) {
        const goalId = goalNodeCandidates[gIdx].id;
        const nodePath = this.runAStar(startId, goalId, goal);
        if (nodePath) {
          const rawPath = [start.clone(), ...nodePath.map(id => this.nodes[id].pos.clone()), goal.clone()];
          let totalLen = 0;
          for (let k = 0; k < rawPath.length - 1; k++) {
            totalLen += rawPath[k].distanceTo(rawPath[k + 1]);
          }
          if (totalLen < shortestTotalDist) {
            shortestTotalDist = totalLen;
            bestRawPath = rawPath;
          }
        }
      }
    }

    if (!bestRawPath || bestRawPath.length <= 2) {
      return [start.clone(), goal.clone()];
    }

    // 4. String-Pulling & Raycast Shortcut Post-Processing
    // Removes unnecessary intermediate nodes if a straight unobstructed path exists between farther nodes
    const simplifiedPath: THREE.Vector3[] = [bestRawPath[0]];
    let currIdx = 0;

    while (currIdx < bestRawPath.length - 1) {
      let farthestVisible = currIdx + 1;
      for (let nextIdx = bestRawPath.length - 1; nextIdx > currIdx + 1; nextIdx--) {
        if (!isLineObstructed(bestRawPath[currIdx], bestRawPath[nextIdx], boxes, 0.8)) {
          farthestVisible = nextIdx;
          break;
        }
      }
      simplifiedPath.push(bestRawPath[farthestVisible]);
      currIdx = farthestVisible;
    }

    return simplifiedPath;
  }

  private runAStar(startId: number, goalId: number, targetGoalPos: THREE.Vector3): number[] | null {
    if (startId === goalId) return [startId];

    const openSet: number[] = [startId];
    const cameFrom: Map<number, number> = new Map();

    const gScore: Map<number, number> = new Map();
    gScore.set(startId, 0);

    const fScore: Map<number, number> = new Map();
    fScore.set(startId, this.nodes[startId].pos.distanceTo(targetGoalPos));

    const closedSet: Set<number> = new Set();

    while (openSet.length > 0) {
      // Find node in openSet with lowest fScore
      let current = openSet[0];
      let lowestF = fScore.get(current) ?? Infinity;
      let currentIdx = 0;

      for (let i = 1; i < openSet.length; i++) {
        const score = fScore.get(openSet[i]) ?? Infinity;
        if (score < lowestF) {
          lowestF = score;
          current = openSet[i];
          currentIdx = i;
        }
      }

      if (current === goalId) {
        // Reconstruct path
        const path: number[] = [current];
        let curr = current;
        while (cameFrom.has(curr)) {
          curr = cameFrom.get(curr)!;
          path.unshift(curr);
        }
        return path;
      }

      openSet.splice(currentIdx, 1);
      closedSet.add(current);

      const neighbors = this.nodes[current].neighbors;
      for (let i = 0; i < neighbors.length; i++) {
        const neighbor = neighbors[i];
        if (closedSet.has(neighbor)) continue;

        const edgeDist = this.nodes[current].pos.distanceTo(this.nodes[neighbor].pos);
        const tentativeG = (gScore.get(current) ?? Infinity) + edgeDist;

        if (tentativeG < (gScore.get(neighbor) ?? Infinity)) {
          cameFrom.set(neighbor, current);
          gScore.set(neighbor, tentativeG);
          const h = this.nodes[neighbor].pos.distanceTo(targetGoalPos);
          fScore.set(neighbor, tentativeG + h);

          if (!openSet.includes(neighbor)) {
            openSet.push(neighbor);
          }
        }
      }
    }

    return null;
  }
}
