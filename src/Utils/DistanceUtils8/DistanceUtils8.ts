import { VectorUtils } from "../VectorUtils.js";
import { Direction } from "../../Direction/Direction.js";
import { Vector2 } from "../Vector2/Vector2.js";
import { DistanceUtils } from "../DistanceUtils.js";

export class DistanceUtils8 implements DistanceUtils {
  distance(pos1: Vector2, pos2: Vector2): number {
    return VectorUtils.chebyshevDistance(pos1, pos2);
  }

  neighbors(pos: Vector2): Vector2[] {

    const diagonalNeighbors = [
      new Vector2(pos.x + 1, pos.y + 1),
      new Vector2(pos.x + 1, pos.y - 1),
      new Vector2(pos.x - 1, pos.y + 1),
      new Vector2(pos.x - 1, pos.y - 1),
    ];

    return [...diagonalNeighbors];
  }

  direction(from: Vector2, to: Vector2): Direction {
    if (to.x > from.x) {
      if (to.y > from.y) {
        return Direction.DOWN_RIGHT;
      } else if (to.y < from.y) {
        return Direction.UP_RIGHT;
      }
    } else if (to.x < from.x) {
      if (to.y > from.y) {
        return Direction.DOWN_LEFT;
      } else if (to.y < from.y) {
        return Direction.UP_LEFT;
      }
    }
    return Direction.NONE;
  }

  getDirections(): Direction[] {
    return [
      Direction.DOWN_LEFT,
      Direction.DOWN_RIGHT,
      Direction.UP_RIGHT,
      Direction.UP_LEFT,
    ];
  }
}
