import { CharLayer, Direction } from "../GridEngine";
import { GridTilemap } from "../GridTilemap/GridTilemap";
import { DistanceUtilsFactory } from "../Utils/DistanceUtilsFactory/DistanceUtilsFactory";
import { Vector2 } from "../Utils/Vector2/Vector2";
import { PathfindingOptions } from "./Pathfinding";
import { directionFromPos, NumberOfDirections } from "../Direction/Direction";
import { Concrete } from "../Utils/TypeUtils";
import { LayerPositionUtils } from "../Utils/LayerPositionUtils/LayerPositionUtils";
import { CharId } from "../GridCharacter/GridCharacter";
import { VectorUtils } from "../Utils/VectorUtils";

export interface LayerVecPos {
  position: Vector2;
  layer: CharLayer;
}

/**
 * BFS: (Breadth first search) Simple algorithm. It can find the shortest path
 * in O(4ᵈ) (resp O(8ᵈ) for 8 directions). d is the length of the shortest path.
 *
 * BIDIRECTIONAL_SEARCH: This algorithm starts 2 BFS, one from the start and
 * one from the end position. It has a performance of O(4^(d/2))
 * (resp O(8^(d/2))).
 */
export type ShortestPathAlgorithmType =
  | "BFS"
  | "BIDIRECTIONAL_SEARCH"
  | "A_STAR"
  | "JPS";

export interface ShortestPath {
  path: LayerVecPos[];
  distOffset: number;
}

export interface ShortestPathResult {
  path: LayerVecPos[];
  closestToTarget: LayerVecPos;
  steps: number;
  maxPathLengthReached: boolean;
  algorithmUsed: ShortestPathAlgorithmType;
}

export abstract class ShortestPathAlgorithm {
  protected options: Concrete<PathfindingOptions>;

  findShortestPath(
    startPos: LayerVecPos,
    targetPos: LayerVecPos
  ): ShortestPathResult {
    if (this.options.ignoreLayers) {
      this.gridTilemap.fixCacheLayer(startPos.layer);
      targetPos.layer = startPos.layer;
    }
    const res = this.findShortestPathImpl(startPos, targetPos);
    this.gridTilemap.unfixCacheLayers();

    return res;
  }

  abstract findShortestPathImpl(
    startPos: LayerVecPos,
    targetPos: LayerVecPos
  ): ShortestPathResult;

  constructor(
    protected gridTilemap: GridTilemap,
    {
      shortestPathAlgorithm = "BFS",
      pathWidth = 1,
      pathHeight = 1,
      numberOfDirections = NumberOfDirections.FOUR,
      isPositionAllowed = (_pos, _charLayer) => true,
      collisionGroups = [],
      ignoredChars = [],
      ignoreTiles = false,
      ignoreMapBounds = false,
      ignoreBlockedTarget = false,
      maxPathLength = Infinity,
      ignoreLayers = false,
    }: PathfindingOptions = {}
  ) {
    this.options = {
      shortestPathAlgorithm,
      pathWidth,
      pathHeight,
      numberOfDirections,
      isPositionAllowed,
      collisionGroups,
      ignoredChars,
      ignoreTiles,
      ignoreMapBounds,
      ignoreBlockedTarget,
      maxPathLength,
      ignoreLayers,
    };
  }

  getNeighbors(pos: LayerVecPos, dest: LayerVecPos): LayerVecPos[] {
    const distanceUtils = DistanceUtilsFactory.create(
      this.options.numberOfDirections ?? NumberOfDirections.FOUR
    );
    const neighbours = distanceUtils.neighbors(pos.position);
    const transitionMappedNeighbors = neighbours.map((unblockedNeighbor) => {
      let transition = pos.layer;
      if (!this.options.ignoreLayers) {
        transition = this.gridTilemap.getTransition(
          unblockedNeighbor,
          pos.layer
        );
      }

      return {
        position: unblockedNeighbor,
        layer: transition || pos.layer,
      };
    });

    return transitionMappedNeighbors.filter((neighborPos) => {
      return (
        !this.isBlocking(pos, neighborPos) ||
        (this.options.ignoreBlockedTarget &&
          LayerPositionUtils.equal(neighborPos, dest))
      );
    });
  }

  getTransition(pos: Vector2, fromLayer?: string): string | undefined {
    if (this.options.ignoreLayers) return undefined;
    return this.gridTilemap.getTransition(pos, fromLayer);
  }

  isBlocking(src: LayerVecPos, dest: LayerVecPos): boolean {
    // All the early returns are for performance.

    const inRange =
      this.options.ignoreMapBounds || this.gridTilemap.isInRange(dest.position);

    if (!inRange) return true;

    const positionAllowed = this.options.isPositionAllowed(
      dest.position,
      dest.layer
    );

    if (!positionAllowed) return true;

    const tileBlocking =
      !this.options.ignoreTiles &&
      this.hasBlockingTileFrom(
        src,
        dest,
        this.options.pathWidth,
        this.options.pathHeight,
        this.options.ignoreMapBounds,
        this.gridTilemap
      );

    if (tileBlocking) return true;

    const charBlocking = this.hasBlockingCharFrom(
      dest,
      this.options.pathWidth,
      this.options.pathHeight,
      this.options.collisionGroups,
      this.options.ignoredChars,
      this.gridTilemap
    );

    return charBlocking;
  }

  distance(fromNode: Vector2, toNode: Vector2): number {
    const distance =
      this.options.numberOfDirections === NumberOfDirections.FOUR
        ? VectorUtils.manhattanDistance
        : VectorUtils.chebyshevDistance;
    return distance(fromNode, toNode);
  }

  getTilePosInDir(pos: LayerVecPos, dir: Direction): LayerVecPos {
    return this.gridTilemap.getTilePosInDirection(pos, dir);
  }

  getReverseNeighbors(pos: LayerVecPos, dest: LayerVecPos): LayerVecPos[] {
    const distanceUtils = DistanceUtilsFactory.create(
      this.options.numberOfDirections ?? NumberOfDirections.FOUR
    );
    const neighbors = distanceUtils.neighbors(pos.position);

    let toCurrentLayerArr: CharLayer[] | undefined = undefined;
    if (!this.options.ignoreLayers) {
      const toCurrentLayer = this.gridTilemap.getReverseTransitions(
        pos.position,
        pos.layer
      );
      toCurrentLayerArr = toCurrentLayer ? [...toCurrentLayer] : undefined;
    }

    const transitionMappedNeighbors = neighbors
      .map((neighbor) => {
        if (!toCurrentLayerArr) {
          return [
            {
              position: neighbor,
              layer: pos.layer,
            },
          ];
        }
        return toCurrentLayerArr.map((lay) => {
          return {
            position: neighbor,
            layer: lay || pos.layer,
          };
        });
      })
      .flat();

    return transitionMappedNeighbors.filter((neighborPos) => {
      return (
        !this.isBlocking(neighborPos, pos) ||
        (this.options.ignoreBlockedTarget &&
          LayerPositionUtils.equal(pos, dest))
      );
    });
  }

  private hasBlockingCharFrom(
    pos: LayerVecPos,
    pathWidth: number,
    pathHeight: number,
    collisionGroups: string[],
    ignoredChars: CharId[],
    gridTilemap: GridTilemap
  ): boolean {
    for (let x = pos.position.x; x < pos.position.x + pathWidth; x++) {
      for (let y = pos.position.y; y < pos.position.y + pathHeight; y++) {
        const res = gridTilemap.hasBlockingChar(
          new Vector2(x, y),
          pos.layer,
          collisionGroups,
          new Set(ignoredChars)
        );

        if (res) return true;
      }
    }
    return false;
  }

  private hasBlockingTileFrom(
    src: LayerVecPos,
    dest: LayerVecPos,
    pathWidth: number,
    pathHeight: number,
    ignoreMapBounds: boolean,
    gridTilemap: GridTilemap
  ): boolean {
    for (let x = dest.position.x; x < dest.position.x + pathWidth; x++) {
      for (let y = dest.position.y; y < dest.position.y + pathHeight; y++) {
        const res = gridTilemap.hasBlockingTile(
          new Vector2(x, y),
          dest.layer,
          directionFromPos(dest.position, src.position),
          ignoreMapBounds
        );

        if (res) return true;
      }
    }
    return false;
  }
}
