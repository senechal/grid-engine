import {
  LayerVecPos,
  ShortestPathAlgorithm,
  ShortestPathResult,
} from "../ShortestPathAlgorithm";
import { VectorUtils } from "../../Utils/VectorUtils";
import { MinFibonacciHeap } from "mnemonist/fibonacci-heap";
import { LayerPositionUtils } from "../../Utils/LayerPositionUtils/LayerPositionUtils";

interface ShortestPathTuple {
  previous: Map<string, LayerVecPos>;
  closestToTarget: LayerVecPos;
  steps: number;
  maxPathLengthReached: boolean;
}

export class AStar extends ShortestPathAlgorithm {
  findShortestPath(
    startPos: LayerVecPos,
    targetPos: LayerVecPos
  ): ShortestPathResult {
    const shortestPath = this.shortestPathBfs(startPos, targetPos);
    return {
      path: this.returnPath(shortestPath.previous, startPos, targetPos),
      closestToTarget: shortestPath.closestToTarget,
      steps: shortestPath.steps,
      maxPathLengthReached: shortestPath.maxPathLengthReached,
      algorithmUsed: "A_STAR",
    };
  }

  private shortestPathBfs(
    startNode: LayerVecPos,
    stopNode: LayerVecPos
  ): ShortestPathTuple {
    const previous = new Map<string, LayerVecPos>();
    const g = new Map<string, number>();
    const f = new Map<string, number>();
    const openSet = new MinFibonacciHeap<LayerVecPos>(
      (a, b) => safeGet(f, a) - safeGet(f, b)
    );
    let closestToTarget: LayerVecPos = startNode;
    let smallestDistToTarget: number = this.distance(
      startNode.position,
      stopNode.position
    );
    let steps = 0;
    openSet.push(startNode);
    g.set(LayerPositionUtils.toString(startNode), 0);
    f.set(LayerPositionUtils.toString(startNode), h(startNode, stopNode));

    // 9

    while (openSet.size > 0) {
      const current = openSet.pop();
      if (!current) break;
      steps++;

      const distToTarget = h(current, stopNode);
      if (distToTarget < smallestDistToTarget) {
        smallestDistToTarget = distToTarget;
        closestToTarget = current;
      }

      if (equal(current, stopNode)) {
        return {
          previous,
          closestToTarget,
          steps,
          maxPathLengthReached: false,
        };
      }

      if (safeGet(g, current) + 1 > this.options.maxPathLength) {
        return {
          previous: new Map(),
          closestToTarget,
          steps,
          maxPathLengthReached: true,
        };
      }

      for (const neighbor of this.getNeighbors(current, stopNode)) {
        const tentativeG = safeGet(g, current) + 1;
        const neighborStr = LayerPositionUtils.toString(neighbor);
        if (!g.has(neighborStr) || tentativeG < safeGet(g, neighbor)) {
          previous.set(neighborStr, current);
          g.set(neighborStr, tentativeG);
          f.set(neighborStr, tentativeG + h(neighbor, stopNode));
          openSet.push(neighbor);
        }
      }
    }
    return { previous, closestToTarget, steps, maxPathLengthReached: false };
  }

  private returnPath(
    previous: Map<string, LayerVecPos>,
    startNode: LayerVecPos,
    stopNode: LayerVecPos
  ): LayerVecPos[] {
    const ret: LayerVecPos[] = [];
    let currentNode: LayerVecPos | undefined = stopNode;
    ret.push(currentNode);
    while (!equal(currentNode, startNode)) {
      currentNode = previous.get(LayerPositionUtils.toString(currentNode));
      if (!currentNode) return [];
      ret.push(currentNode);
    }
    return ret.reverse();
  }
}

function h(src: LayerVecPos, dest: LayerVecPos) {
  return VectorUtils.manhattanDistance(src.position, dest.position);
}

function safeGet(map: Map<string, number>, position: LayerVecPos): number {
  return map.get(LayerPositionUtils.toString(position)) ?? Number.MAX_VALUE;
}

function equal(layerPos1: LayerVecPos, layerPos2: LayerVecPos): boolean {
  if (!VectorUtils.equal(layerPos1.position, layerPos2.position)) return false;
  return layerPos1.layer === layerPos2.layer;
}
