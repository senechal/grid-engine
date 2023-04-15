import { NoPathFoundStrategy } from "./../../Pathfinding/NoPathFoundStrategy";
import { DistanceUtilsFactory } from "./../../Utils/DistanceUtilsFactory/DistanceUtilsFactory";
import {
  LayerVecPos,
  ShortestPath,
  ShortestPathAlgorithmType,
} from "./../../Pathfinding/ShortestPathAlgorithm";
import { DistanceUtils } from "./../../Utils/DistanceUtils";
import { GridTilemap } from "../../GridTilemap/GridTilemap";
import { GridCharacter } from "../../GridCharacter/GridCharacter";
import { Direction } from "../../Direction/Direction";
import { Movement, MovementInfo } from "../Movement";
import { Vector2 } from "../../Utils/Vector2/Vector2";
import { Retryable } from "./Retryable/Retryable";
import { PathBlockedStrategy } from "../../Pathfinding/PathBlockedStrategy";
import { CharLayer, Position } from "../../GridEngine";
import { filter, Subject, take } from "rxjs";
import {
  IsPositionAllowedFn,
  Pathfinding,
  PathfindingOptions,
} from "../../Pathfinding/Pathfinding";
import { Concrete } from "../../Utils/TypeUtils";
import { Bfs } from "../../Pathfinding/Bfs/Bfs";

export interface MoveToConfig {
  /**
   * Determines what happens if no path could be found. For the different
   * strategies see {@link NoPathFoundStrategy}.
   */
  noPathFoundStrategy?: NoPathFoundStrategy;

  /**
   * Determines what happens if a previously calculated path is suddenly
   * blocked. This can happen if a path existed and while the character was
   * moving along that path, it got suddenly blocked.
   *
   * For the different strategies see {@link PathBlockedStrategy}.
   */
  pathBlockedStrategy?: PathBlockedStrategy;

  /**
   * Only relevant if {@link MoveToConfig.noPathFoundStrategy} is set to {@link NoPathFoundStrategy.RETRY}.
   *
   * It sets the time in milliseconds that the pathfinding algorithm will wait
   * until the next retry.
   */
  noPathFoundRetryBackoffMs?: number;

  /**
   * Only relevant if {@link MoveToConfig.noPathFoundStrategy} is set to {@link NoPathFoundStrategy.RETRY}.
   *
   * It sets the maximum amount of retries before giving up.
   */
  noPathFoundMaxRetries?: number;

  /**
   * Only relevant if {@link MoveToConfig.pathBlockedStrategy} is set to {@link PathBlockedStrategy.RETRY}.
   *
   * It sets the maximum amount of retries before giving up.
   */
  pathBlockedMaxRetries?: number;

  /**
   * Only relevant if {@link MoveToConfig.pathBlockedStrategy} is set to {@link PathBlockedStrategy.RETRY}.
   *
   * It sets the time in milliseconds that the pathfinding algorithm will wait
   * until the next retry.
   */
  pathBlockedRetryBackoffMs?: number;

  /**
   * Only relevant if {@link MoveToConfig.pathBlockedStrategy} is set to {@link PathBlockedStrategy.WAIT}.
   *
   * It sets the number of milliseconds that the pathfinding algorithm will wait
   * for the path to become unblocked again before stopping the movement.
   */
  pathBlockedWaitTimeoutMs?: number;

  /**
   * Char layer of the movement target. If there is no `targetLayer` provided,
   * the current char layer of the moving character is used.
   */
  targetLayer?: string;

  /**
   * Function to specify whether a certain position is allowed for pathfinding.
   * If the function returns false, the tile will be consindered as blocked.
   *
   * It can be used to restrict pathfinding to specific regions.
   *
   * Beware that this method can become a performance bottleneck easily. So be
   * careful and keep it as efficient as possible. An asymptotic runtime
   * complexity of O(1) is recommended.
   */
  isPositionAllowedFn?: IsPositionAllowedFn;

  /**
   * Algorithm to use for pathfinding.
   */
  algorithm?: ShortestPathAlgorithmType;

  /**
   * If this is set, the algorithm will stop once it reaches a path length of
   * this value. This is useful to avoid running out of memory on large or
   * infinite maps.
   */
  maxPathLength?: number | undefined;

  /**
   * If set to `true`, pathfinding will only be performed on the char layer of
   * the start position. If you don't use char layers, activating this setting
   * can improve pathfinding performance.
   *
   * @default false
   */
  ignoreLayers?: boolean;
}

export enum MoveToResult {
  SUCCESS = "SUCCESS",
  NO_PATH_FOUND_MAX_RETRIES_EXCEEDED = "NO_PATH_FOUND_MAX_RETRIES_EXCEEDED",
  PATH_BLOCKED_MAX_RETRIES_EXCEEDED = "PATH_BLOCKED_MAX_RETRIES_EXCEEDED",
  PATH_BLOCKED = "PATH_BLOCKED",
  NO_PATH_FOUND = "NO_PATH_FOUND",
  PATH_BLOCKED_WAIT_TIMEOUT = "PATH_BLOCKED_WAIT_TIMEOUT",
  MOVEMENT_TERMINATED = "MOVEMENT_TERMINATED",
  MAX_PATH_LENGTH_REACHED = "MAX_PATH_LENGTH_REACHED",
}

export interface Finished {
  position: Position;
  result?: MoveToResult;
  description?: string;
  layer: CharLayer;
}

export interface Options {
  distance?: number;
  config?: MoveToConfig;
  ignoreBlockedTarget?: boolean;
}

export class TargetMovement implements Movement {
  private shortestPath: LayerVecPos[] = [];
  private distOffset = 0;
  private posOnPath = 0;
  private pathBlockedStrategy: PathBlockedStrategy;
  private noPathFoundStrategy: NoPathFoundStrategy;
  private stopped = false;
  private noPathFoundRetryable: Retryable;
  private pathBlockedRetryable: Retryable;
  private pathBlockedWaitTimeoutMs: number;
  private pathBlockedWaitElapsed = 0;
  private distanceUtils: DistanceUtils;
  private finished$: Subject<Finished>;
  private ignoreBlockedTarget: boolean;
  private ignoreLayers: boolean;
  private distance: number;
  private isPositionAllowed: IsPositionAllowedFn = () => true;
  private shortestPathAlgorithm: ShortestPathAlgorithmType =
    "BIDIRECTIONAL_SEARCH";
  private maxPathLength = Infinity;

  constructor(
    private character: GridCharacter,
    private tilemap: GridTilemap,
    private targetPos: LayerVecPos,
    { config, ignoreBlockedTarget = false, distance = 0 }: Options = {}
  ) {
    this.shortestPathAlgorithm =
      config?.algorithm ?? this.shortestPathAlgorithm;
    this.ignoreBlockedTarget = ignoreBlockedTarget;
    this.distance = distance;
    this.noPathFoundStrategy =
      config?.noPathFoundStrategy || NoPathFoundStrategy.STOP;
    this.pathBlockedStrategy =
      config?.pathBlockedStrategy || PathBlockedStrategy.WAIT;
    this.noPathFoundRetryable = new Retryable(
      config?.noPathFoundRetryBackoffMs || 200,
      config?.noPathFoundMaxRetries || -1,
      () => {
        this.stop(MoveToResult.NO_PATH_FOUND_MAX_RETRIES_EXCEEDED);
      }
    );
    this.pathBlockedRetryable = new Retryable(
      config?.pathBlockedRetryBackoffMs || 200,
      config?.pathBlockedMaxRetries || -1,
      () => {
        this.stop(MoveToResult.PATH_BLOCKED_MAX_RETRIES_EXCEEDED);
      }
    );

    if (config?.isPositionAllowedFn) {
      this.isPositionAllowed = config.isPositionAllowedFn;
    }

    if (config?.maxPathLength) {
      this.maxPathLength = config.maxPathLength;
    }

    this.ignoreLayers = !!config?.ignoreLayers;

    this.distanceUtils = DistanceUtilsFactory.create(
      character.getNumberOfDirections()
    );
    this.pathBlockedWaitTimeoutMs = config?.pathBlockedWaitTimeoutMs || -1;
    this.finished$ = new Subject<Finished>();
    this.setCharacter(character);
  }

  setPathBlockedStrategy(pathBlockedStrategy: PathBlockedStrategy): void {
    this.pathBlockedStrategy = pathBlockedStrategy;
  }

  getPathBlockedStrategy(): PathBlockedStrategy {
    return this.pathBlockedStrategy;
  }

  private setCharacter(character: GridCharacter): void {
    this.character = character;
    this.noPathFoundRetryable.reset();
    this.pathBlockedRetryable.reset();
    this.pathBlockedWaitElapsed = 0;
    this.calcShortestPath();
    this.character
      .autoMovementSet()
      .pipe(
        filter((movement) => movement !== this),
        take(1)
      )
      .subscribe(() => {
        this.stop(MoveToResult.MOVEMENT_TERMINATED);
      });
  }

  private getPathfindingOptions(): Concrete<PathfindingOptions> {
    return {
      shortestPathAlgorithm: this.shortestPathAlgorithm,
      pathWidth: this.character.getTileWidth(),
      pathHeight: this.character.getTileHeight(),
      numberOfDirections: this.character.getNumberOfDirections(),
      isPositionAllowed: this.isPositionAllowed,
      collisionGroups: this.character.getCollisionGroups(),
      ignoredChars: [this.character.getId()],
      ignoreTiles: !this.character.collidesWithTiles(),
      ignoreMapBounds: this.character.getIgnoreMissingTiles(),
      ignoreBlockedTarget: this.ignoreBlockedTarget,
      maxPathLength: this.maxPathLength,
      ignoreLayers: this.ignoreLayers,
    };
  }

  update(delta: number): void {
    if (this.stopped) return;

    if (this.noPathFound()) {
      if (this.noPathFoundStrategy === NoPathFoundStrategy.RETRY) {
        this.noPathFoundRetryable.retry(delta, () => this.calcShortestPath());
      } else if (this.noPathFoundStrategy === NoPathFoundStrategy.STOP) {
        this.stop(MoveToResult.NO_PATH_FOUND);
      }
    }

    this.updatePosOnPath();
    if (
      this.isBlocking(
        this.nextTileOnPath()?.position,
        this.character?.getNextTilePos().layer
      )
    ) {
      this.applyPathBlockedStrategy(delta);
    } else {
      this.pathBlockedWaitElapsed = 0;
    }

    if (this.hasArrived()) {
      this.stop(MoveToResult.SUCCESS);
      if (this.existsDistToTarget()) {
        this.turnTowardsTarget();
      }
    } else if (
      !this.isBlocking(
        this.nextTileOnPath()?.position,
        this.character?.getNextTilePos().layer
      )
    ) {
      this.moveCharOnPath();
    }
  }

  finishedObs(): Subject<Finished> {
    return this.finished$;
  }

  getInfo(): MovementInfo {
    return {
      type: "Target",
      config: {
        algorithm: this.shortestPathAlgorithm,
        ignoreBlockedTarget: this.ignoreBlockedTarget,
        distance: this.distance,
        targetPos: this.targetPos,
        noPathFoundStrategy: this.noPathFoundStrategy,
        pathBlockedStrategy: this.pathBlockedStrategy,
        noPathFoundRetryBackoffMs: this.noPathFoundRetryable.getBackoffMs(),
        noPathFoundMaxRetries: this.noPathFoundRetryable.getMaxRetries(),
      },
    };
  }

  private resultToReason(result?: MoveToResult): string | undefined {
    switch (result) {
      case MoveToResult.SUCCESS:
        return "Successfully arrived.";
      case MoveToResult.MOVEMENT_TERMINATED:
        return "Movement of character has been replaced before destination was reached.";
      case MoveToResult.PATH_BLOCKED:
        return "PathBlockedStrategy STOP: Path blocked.";
      case MoveToResult.NO_PATH_FOUND_MAX_RETRIES_EXCEEDED:
        return `NoPathFoundStrategy RETRY: Maximum retries of ${this.noPathFoundRetryable.getMaxRetries()} exceeded.`;
      case MoveToResult.NO_PATH_FOUND:
        return "NoPathFoundStrategy STOP: No path found.";
      case MoveToResult.PATH_BLOCKED_MAX_RETRIES_EXCEEDED:
        return `PathBlockedStrategy RETRY: Maximum retries of ${this.pathBlockedRetryable.getMaxRetries()} exceeded.`;
      case MoveToResult.PATH_BLOCKED_WAIT_TIMEOUT:
        return `PathBlockedStrategy WAIT: Wait timeout of ${this.pathBlockedWaitTimeoutMs}ms exceeded.`;
    }
  }

  private applyPathBlockedStrategy(delta: number): void {
    if (this.pathBlockedStrategy === PathBlockedStrategy.RETRY) {
      this.pathBlockedRetryable.retry(delta, () => {
        const shortestPath = this.getShortestPath();
        if (shortestPath.path.length > 0) {
          this.calcShortestPath(shortestPath);
        }
      });
    } else if (this.pathBlockedStrategy === PathBlockedStrategy.STOP) {
      this.stop(MoveToResult.PATH_BLOCKED);
    } else if (this.pathBlockedStrategy === PathBlockedStrategy.WAIT) {
      if (this.pathBlockedWaitTimeoutMs > -1) {
        this.pathBlockedWaitElapsed += delta;
        if (this.pathBlockedWaitElapsed >= this.pathBlockedWaitTimeoutMs) {
          this.stop(MoveToResult.PATH_BLOCKED_WAIT_TIMEOUT);
        }
      }
    }
  }

  private moveCharOnPath(): void {
    const nextTilePosOnPath = this.nextTileOnPath();
    if (!nextTilePosOnPath) return;
    const dir = this.getDir(
      this.character.getNextTilePos().position,
      nextTilePosOnPath.position
    );
    this.character.move(dir);
  }

  private nextTileOnPath(): LayerVecPos | undefined {
    return this.shortestPath[this.posOnPath + 1];
  }

  private stop(result?: MoveToResult): void {
    this.finished$.next({
      position: this.character.getTilePos().position,
      result,
      description: this.resultToReason(result),
      layer: this.character.getTilePos().layer,
    });
    this.finished$.complete();
    this.stopped = true;
  }

  private turnTowardsTarget(): void {
    const nextTile = this.shortestPath[this.posOnPath + 1];
    const dir = this.getDir(
      this.character.getNextTilePos().position,
      nextTile.position
    );
    this.character.turnTowards(dir);
  }

  private existsDistToTarget(): boolean {
    return this.posOnPath < this.shortestPath.length - 1;
  }

  private hasArrived(): boolean {
    return (
      !this.noPathFound() &&
      this.posOnPath + Math.max(0, this.distance - this.distOffset) >=
        this.shortestPath.length - 1
    );
  }

  private updatePosOnPath(): void {
    let currentTile = this.shortestPath[this.posOnPath];
    while (
      this.posOnPath < this.shortestPath.length - 1 &&
      (this.character.getNextTilePos().position.x != currentTile.position.x ||
        this.character.getNextTilePos().position.y != currentTile.position.y)
    ) {
      this.posOnPath++;
      currentTile = this.shortestPath[this.posOnPath];
    }
  }

  private noPathFound(): boolean {
    return this.shortestPath.length === 0;
  }

  private calcShortestPath(shortestPath?: ShortestPath): void {
    shortestPath = shortestPath ?? this.getShortestPath();
    this.posOnPath = 0;
    this.shortestPath = shortestPath.path;
    this.distOffset = shortestPath.distOffset;
  }

  private isBlocking = (pos?: Vector2, charLayer?: string): boolean => {
    // TODO: why do a BFS here?
    if (!pos) return true;

    const bfs = new Bfs(this.tilemap, this.getPathfindingOptions());

    return bfs.isBlocking(this.character.getTilePos(), {
      position: pos,
      layer: charLayer,
    });
  };

  private getShortestPath(): ShortestPath {
    const pathfinding = new Pathfinding(this.tilemap);
    const { path: shortestPath, closestToTarget } =
      pathfinding.findShortestPath(
        this.character.getNextTilePos(),
        this.targetPos,
        this.getPathfindingOptions()
      );

    const noPathFound = shortestPath.length == 0;

    if (
      noPathFound &&
      this.noPathFoundStrategy === NoPathFoundStrategy.CLOSEST_REACHABLE
    ) {
      const shortestPathToClosestPoint = pathfinding.findShortestPath(
        this.character.getNextTilePos(),
        closestToTarget,
        this.getPathfindingOptions()
      ).path;
      const distOffset = this.distanceUtils.distance(
        closestToTarget.position,
        this.targetPos.position
      );
      return { path: shortestPathToClosestPoint, distOffset };
    }

    return { path: shortestPath, distOffset: 0 };
  }

  private getDir(from: Vector2, to: Vector2): Direction {
    return this.tilemap.fromMapDirection(
      this.distanceUtils.direction(from, to)
    );
  }
}
