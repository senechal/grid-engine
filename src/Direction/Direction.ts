import { Position } from "../GridEngine.js";
import { Vector2 } from "../Utils/Vector2/Vector2.js";
export enum Direction {
  NONE = "none",
  LEFT = "left",
  UP_LEFT = "up-left",
  UP = "up",
  UP_RIGHT = "up-right",
  RIGHT = "right",
  DOWN_RIGHT = "down-right",
  DOWN = "down",
  DOWN_LEFT = "down-left",
}

const oppositeDirections = {
  [Direction.UP]: Direction.DOWN,
  [Direction.DOWN]: Direction.UP,
  [Direction.LEFT]: Direction.RIGHT,
  [Direction.RIGHT]: Direction.LEFT,
  [Direction.NONE]: Direction.NONE,
  [Direction.UP_LEFT]: Direction.DOWN_RIGHT,
  [Direction.UP_RIGHT]: Direction.DOWN_LEFT,
  [Direction.DOWN_RIGHT]: Direction.UP_LEFT,
  [Direction.DOWN_LEFT]: Direction.UP_RIGHT,
};

const directionVectors = {
  [Direction.UP]: Vector2.UP,
  [Direction.DOWN]: Vector2.DOWN,
  [Direction.LEFT]: Vector2.LEFT,
  [Direction.RIGHT]: Vector2.RIGHT,
  [Direction.NONE]: Vector2.ZERO,
  [Direction.UP_LEFT]: Vector2.UP_LEFT,
  [Direction.UP_RIGHT]: Vector2.UP_RIGHT,
  [Direction.DOWN_RIGHT]: Vector2.DOWN_RIGHT,
  [Direction.DOWN_LEFT]: Vector2.DOWN_LEFT,
};

const clockwiseMapping = {
  [Direction.LEFT]: Direction.UP_LEFT,
  [Direction.UP_LEFT]: Direction.UP,
  [Direction.UP]: Direction.UP_RIGHT,
  [Direction.UP_RIGHT]: Direction.RIGHT,
  [Direction.RIGHT]: Direction.DOWN_RIGHT,
  [Direction.DOWN_RIGHT]: Direction.DOWN,
  [Direction.DOWN]: Direction.DOWN_LEFT,
  [Direction.DOWN_LEFT]: Direction.LEFT,
  [Direction.NONE]: Direction.NONE,
};

const counterClockwiseMapping = {
  [Direction.LEFT]: Direction.DOWN_LEFT,
  [Direction.UP_LEFT]: Direction.LEFT,
  [Direction.UP]: Direction.UP_LEFT,
  [Direction.UP_RIGHT]: Direction.UP,
  [Direction.RIGHT]: Direction.UP_RIGHT,
  [Direction.DOWN_RIGHT]: Direction.RIGHT,
  [Direction.DOWN]: Direction.DOWN_RIGHT,
  [Direction.DOWN_LEFT]: Direction.DOWN,
  [Direction.NONE]: Direction.NONE,
};

const diagonals = [
  Direction.DOWN_LEFT,
  Direction.DOWN_RIGHT,
  Direction.UP_RIGHT,
  Direction.UP_LEFT,
];

export function directions(): Direction[] {
  return [
    Direction.UP,
    Direction.DOWN,
    Direction.LEFT,
    Direction.RIGHT,
    Direction.NONE,
    Direction.UP_LEFT,
    Direction.UP_RIGHT,
    Direction.DOWN_RIGHT,
    Direction.DOWN_LEFT,
  ];
}

export function isDiagonal(direction: Direction): boolean {
  return diagonals.includes(direction);
}

export function isHorizontal(direction: Direction): boolean {
  const horizontals = [Direction.LEFT, Direction.RIGHT];
  return horizontals.includes(direction);
}

export function isVertical(direction: Direction): boolean {
  const verticals = [Direction.UP, Direction.DOWN];
  return verticals.includes(direction);
}

export function turnCounterClockwise(direction: Direction): Direction {
  return counterClockwiseMapping[direction];
}

export function turnClockwise(direction: Direction): Direction {
  return clockwiseMapping[direction];
}

export function directionVector(direction: Direction): Vector2 {
  return directionVectors[direction];
}

export function oppositeDirection(direction: Direction): Direction {
  return oppositeDirections[direction];
}

/**
 * Helper function that returns the direction from a source to a target
 * position.
 *
 * For example:
 * `directionFromPos({x:1, y:1}, {{x:2, y:1}}) = Direction.RIGHT`
 *
 * @category Helpers
 */
export function directionFromPos(src: Position, dest: Position): Direction {
  if (src.x === dest.x) {
    if (src.y > dest.y) return Direction.UP;
    if (src.y < dest.y) return Direction.DOWN;
  } else if (src.y === dest.y) {
    if (src.x > dest.x) return Direction.LEFT;
    if (src.x < dest.x) return Direction.RIGHT;
  } else if (src.x > dest.x) {
    if (src.y < dest.y) return Direction.DOWN_LEFT;
    if (src.y > dest.y) return Direction.UP_LEFT;
  } else if (src.x < dest.x) {
    if (src.y < dest.y) return Direction.DOWN_RIGHT;
    if (src.y > dest.y) return Direction.UP_RIGHT;
  }
  return Direction.NONE;
}

export enum NumberOfDirections {
  FOUR = 4,
  EIGHT = 8,
}

export function isDirection(val: any): val is Direction {
  return typeof val === "string" && directions().includes(val as Direction);
}
