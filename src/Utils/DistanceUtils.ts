import { VectorUtils } from "./VectorUtils";
import { NumberOfDirections } from "./../Direction/Direction";
import { Vector2 } from "./Vector2/Vector2";

export class DistanceUtils {
  static distance(
    pos1: Vector2,
    pos2: Vector2,
    numberOfDirections: NumberOfDirections
  ): number {
    if (numberOfDirections === NumberOfDirections.EIGHT) {
      return VectorUtils.chebyshevDistance(pos1, pos2);
    }
    return VectorUtils.manhattanDistance(pos1, pos2);
  }
}