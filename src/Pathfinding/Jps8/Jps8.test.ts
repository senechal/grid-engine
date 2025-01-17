import { Jps8 } from "./Jps8.js";
import { CollisionStrategy } from "../../Collisions/CollisionStrategy.js";
import { NumberOfDirections } from "../../Direction/Direction.js";
import { GridTilemap } from "../../GridTilemap/GridTilemap.js";
import {
  COLLISION_GROUP,
  createAllowedFn,
  layerPos,
  LOWER_CHAR_LAYER,
  mockCharMap,
  mockLayeredBlockMap,
  mockRandomMap,
} from "../../Utils/MockFactory/MockFactory.js";
import { Vector2 } from "../../Utils/Vector2/Vector2.js";

function createTilemap(
  layers: Array<{ blockMap: string[]; layer: string | undefined }>,
) {
  const tm = mockLayeredBlockMap(layers);
  const gridTilemap = new GridTilemap(
    tm,
    "ge_collide",
    CollisionStrategy.BLOCK_TWO_TILES,
  );
  mockCharMap(gridTilemap, layers);
  return gridTilemap;
}

describe("Jps8", () => {
  it("should find blocked path", () => {
    const gridTilemap = createTilemap([
      {
        layer: LOWER_CHAR_LAYER,
        blockMap: [
          // prettier-ignore
          ".s..",
          "####",
          ".t..",
        ],
      },
    ]);
    const algo = new Jps8(gridTilemap, {
      numberOfDirections: NumberOfDirections.EIGHT,
    });

    const shortestPath = algo.findShortestPath(
      layerPos(new Vector2(1, 0)),
      layerPos(new Vector2(1, 2)),
    );

    expect(shortestPath.path).toEqual([]);
  });

  it("should find the shortest path", () => {
    const gridTilemap = createTilemap([
      {
        layer: LOWER_CHAR_LAYER,
        blockMap: [
          // prettier-ignore
          ".s..",
          "##.#",
          ".t..",
        ],
      },
    ]);
    const algo = new Jps8(gridTilemap, {
      numberOfDirections: NumberOfDirections.EIGHT,
    });

    const shortestPath = algo.findShortestPath(
      layerPos(new Vector2(1, 0)),
      layerPos(new Vector2(1, 2)),
    );

    expect(shortestPath.path).toEqual([
      layerPos(new Vector2(1, 0)),
      layerPos(new Vector2(2, 1)),
      layerPos(new Vector2(1, 2)),
    ]);
  });

  it("should use Chebyshev distance for 8 directions", () => {
    const gridTilemap = createTilemap([
      {
        layer: LOWER_CHAR_LAYER,
        blockMap: [
          // prettier-ignore
          "#####",
          "#s..#",
          "#####",
          "#..t#",
          "#####",
        ],
      },
    ]);

    const algo = new Jps8(gridTilemap, {
      numberOfDirections: NumberOfDirections.EIGHT,
    });

    const shortestPath = algo.findShortestPath(
      layerPos(new Vector2(1, 1)),
      layerPos(new Vector2(3, 3)),
    );

    expect(shortestPath.closestToTarget).toEqual(layerPos(new Vector2(1, 1)));
  });

  it("should not find path for larger tile size", () => {
    const gridTilemap = createTilemap([
      {
        layer: LOWER_CHAR_LAYER,
        blockMap: [
          // prettier-ignore
          ".ss.",
          ".ss.",
          "#.##",
          ".t..",
          "....",
        ],
      },
    ]);
    const algo = new Jps8(gridTilemap, {
      numberOfDirections: NumberOfDirections.EIGHT,
      pathWidth: 2,
      pathHeight: 2,
    });

    const shortestPath = algo.findShortestPath(
      layerPos(new Vector2(1, 0)),
      layerPos(new Vector2(1, 3)),
    );

    expect(shortestPath.path).toEqual([]);
  });

  it("should find path for larger tile size", () => {
    const gridTilemap = createTilemap([
      {
        layer: LOWER_CHAR_LAYER,
        blockMap: [
          // prettier-ignore
          ".ss.",
          ".ss.",
          "##..",
          ".t..",
          "....",
        ],
      },
    ]);
    const algo = new Jps8(gridTilemap, {
      numberOfDirections: NumberOfDirections.EIGHT,
      pathWidth: 2,
      pathHeight: 2,
    });

    const shortestPath = algo.findShortestPath(
      layerPos(new Vector2(1, 0)),
      layerPos(new Vector2(1, 3)),
    );

    expect(shortestPath.path).toEqual([
      layerPos(new Vector2(1, 0)),
      layerPos(new Vector2(2, 1)),
      layerPos(new Vector2(2, 2)),
      layerPos(new Vector2(1, 3)),
    ]);
  });

  it("should find the shortest path for transition", () => {
    const gridTilemap = createTilemap([
      {
        layer: "lowerCharLayer",
        blockMap: [
          // prettier-ignore
          ".s#.",
          "####",
          "....",
        ],
      },
      {
        layer: "testCharLayer",
        blockMap: [
          // prettier-ignore
          "..*.",
          "##.#",
          ".t..",
        ],
      },
    ]);
    const algo = new Jps8(gridTilemap, {
      numberOfDirections: NumberOfDirections.EIGHT,
    });

    gridTilemap.setTransition(
      new Vector2(2, 0),
      "lowerCharLayer",
      "testCharLayer",
    );

    const shortestPath = algo.findShortestPath(
      layerPos(new Vector2(1, 0)),
      layerPos(new Vector2(1, 2), "testCharLayer"),
    );

    expect(shortestPath.path).toEqual([
      layerPos(new Vector2(1, 0)),
      layerPos(new Vector2(2, 0), "testCharLayer"),
      layerPos(new Vector2(2, 1), "testCharLayer"),
      // layerPos(new Vector2(2, 2), "testCharLayer"),
      layerPos(new Vector2(1, 2), "testCharLayer"),
    ]);
  });

  it("should find the shortest path for unidirectional blocking", () => {
    const gridTilemap = createTilemap([
      {
        layer: LOWER_CHAR_LAYER,
        blockMap: [
          // prettier-ignore
          "↑s→→",
          "↑↑#↓",
          "←t←↓",
        ],
      },
    ]);
    const algo = new Jps8(gridTilemap, {
      numberOfDirections: NumberOfDirections.EIGHT,
    });

    const shortestPath = algo.findShortestPath(
      layerPos(new Vector2(1, 0)),
      layerPos(new Vector2(1, 2)),
    );

    expect(shortestPath.path).toEqual([
      layerPos(new Vector2(1, 0)),
      layerPos(new Vector2(2, 0)),
      layerPos(new Vector2(3, 0)),
      layerPos(new Vector2(3, 1)),
      layerPos(new Vector2(3, 2)),
      layerPos(new Vector2(2, 2)),
      layerPos(new Vector2(1, 2)),
    ]);
  });

  it("should find the shortest path for allowed positions", () => {
    const gridTilemap = createTilemap([
      {
        layer: LOWER_CHAR_LAYER,
        blockMap: [
          // prettier-ignore
          "....",
          "....",
          "....",
          "....",
        ],
      },
    ]);
    // prettier-ignore
    const allowedFn = createAllowedFn([
      ".s..",
      "###.",
      ".t..",
    ]);

    const algo = new Jps8(gridTilemap, {
      numberOfDirections: NumberOfDirections.EIGHT,
      isPositionAllowed: allowedFn,
    });

    const shortestPath = algo.findShortestPath(
      layerPos(new Vector2(1, 0)),
      layerPos(new Vector2(1, 2)),
    );

    expect(shortestPath.path).toEqual([
      layerPos(new Vector2(1, 0)),
      layerPos(new Vector2(2, 0)),
      layerPos(new Vector2(3, 1)),
      layerPos(new Vector2(2, 2)),
      layerPos(new Vector2(1, 2)),
    ]);
  });

  it("should consider blocking chars", () => {
    const gridTilemap = createTilemap([
      {
        layer: LOWER_CHAR_LAYER,
        blockMap: [
          // prettier-ignore
          ".s..",
          "ccc.",
          ".t..",
        ],
      },
    ]);
    const algo = new Jps8(gridTilemap, {
      numberOfDirections: NumberOfDirections.EIGHT,
      collisionGroups: [COLLISION_GROUP],
    });

    const shortestPath = algo.findShortestPath(
      layerPos(new Vector2(1, 0)),
      layerPos(new Vector2(1, 2)),
    );

    expect(shortestPath.path).toEqual([
      layerPos(new Vector2(1, 0)),
      layerPos(new Vector2(2, 0)),
      layerPos(new Vector2(3, 1)),
      layerPos(new Vector2(2, 2)),
      layerPos(new Vector2(1, 2)),
    ]);
  });

  it("should not consider blocking chars when no collision group is given", () => {
    const gridTilemap = createTilemap([
      {
        layer: LOWER_CHAR_LAYER,
        blockMap: [
          // prettier-ignore
          ".s..",
          "ccc.",
          ".t..",
        ],
      },
    ]);
    const algo = new Jps8(gridTilemap, {
      numberOfDirections: NumberOfDirections.EIGHT,
    });

    const shortestPath = algo.findShortestPath(
      layerPos(new Vector2(1, 0)),
      layerPos(new Vector2(1, 2)),
    );

    expect(shortestPath.path).toEqual([
      layerPos(new Vector2(1, 0)),
      layerPos(new Vector2(1, 1)),
      layerPos(new Vector2(1, 2)),
    ]);
  });

  it("should not consider blocking chars of different collision groups", () => {
    const gridTilemap = createTilemap([
      {
        layer: LOWER_CHAR_LAYER,
        blockMap: [
          // prettier-ignore
          ".s..",
          "ccc.",
          ".t..",
        ],
      },
    ]);
    const algo = new Jps8(gridTilemap, {
      numberOfDirections: NumberOfDirections.EIGHT,
      collisionGroups: ["someOtherCollisionGroup"],
    });

    const shortestPath = algo.findShortestPath(
      layerPos(new Vector2(1, 0)),
      layerPos(new Vector2(1, 2)),
    );

    expect(shortestPath.path).toEqual([
      layerPos(new Vector2(1, 0)),
      layerPos(new Vector2(1, 1)),
      layerPos(new Vector2(1, 2)),
    ]);
  });

  it("should not consider chars in ignoreList", () => {
    const gridTilemap = createTilemap([
      {
        layer: LOWER_CHAR_LAYER,
        blockMap: [
          // prettier-ignore
          ".s..",
          "ccc.",
          ".t..",
        ],
      },
    ]);
    const algo = new Jps8(gridTilemap, {
      numberOfDirections: NumberOfDirections.EIGHT,
      collisionGroups: [COLLISION_GROUP],
      ignoredChars: ["mock_char_1"],
    });

    const shortestPath = algo.findShortestPath(
      layerPos(new Vector2(1, 0)),
      layerPos(new Vector2(1, 2)),
    );

    expect(shortestPath.path).toEqual([
      layerPos(new Vector2(1, 0)),
      layerPos(new Vector2(1, 1)),
      layerPos(new Vector2(1, 2)),
    ]);
  });

  it("should ignore tiles", () => {
    const gridTilemap = createTilemap([
      {
        layer: LOWER_CHAR_LAYER,
        blockMap: [
          // prettier-ignore
          ".s..",
          "###.",
          ".t..",
        ],
      },
    ]);
    const algo = new Jps8(gridTilemap, {
      numberOfDirections: NumberOfDirections.EIGHT,
      ignoreTiles: true,
    });

    const shortestPath = algo.findShortestPath(
      layerPos(new Vector2(1, 0)),
      layerPos(new Vector2(1, 2)),
    );

    expect(shortestPath.path.length).toEqual(3);
  });

  it("should ignore map bounds", () => {
    const gridTilemap = createTilemap([
      {
        layer: LOWER_CHAR_LAYER,
        blockMap: [
          // prettier-ignore
          ".s..",
          "####",
          ".t..",
        ],
      },
    ]);
    const algo = new Jps8(gridTilemap, {
      numberOfDirections: NumberOfDirections.EIGHT,
      ignoreMapBounds: true,
    });

    const shortestPath = algo.findShortestPath(
      layerPos(new Vector2(1, 0)),
      layerPos(new Vector2(1, 2)),
    );

    expect(shortestPath.path.length).toEqual(5);
  });

  it("should terminate on infinite maps", () => {
    const gridTilemap = createTilemap([
      {
        layer: LOWER_CHAR_LAYER,
        blockMap: [
          // prettier-ignore
          ".s..",
          "####",
          "#t#.",
          "###.",
        ],
      },
    ]);
    const algo = new Jps8(gridTilemap, {
      numberOfDirections: NumberOfDirections.EIGHT,
      ignoreMapBounds: true,
      maxPathLength: 10,
    });

    const shortestPath = algo.findShortestPath(
      layerPos(new Vector2(1, 0)),
      layerPos(new Vector2(1, 2)),
    );

    expect(shortestPath.path.length).toEqual(0);
    expect(shortestPath.maxPathLengthReached).toBe(true);
  });

  it("should ignore blocked target", () => {
    const gridTilemap = createTilemap([
      {
        layer: LOWER_CHAR_LAYER,
        blockMap: [
          // prettier-ignore
          ".s..",
          "....",
          ".#..",
        ],
      },
    ]);
    const algo = new Jps8(gridTilemap, {
      numberOfDirections: NumberOfDirections.EIGHT,
      ignoreBlockedTarget: true,
    });

    const shortestPath = algo.findShortestPath(
      layerPos(new Vector2(1, 0)),
      layerPos(new Vector2(1, 2)),
    );

    expect(shortestPath.path.length).toEqual(3);
  });

  it("should keep expansion count", () => {
    const tilemap = mockRandomMap(LOWER_CHAR_LAYER, 500, 500, 0.3, 12323);

    const gridTilemap = new GridTilemap(
      tilemap,
      "ge_collide",
      CollisionStrategy.BLOCK_TWO_TILES,
    );
    const algo = new Jps8(gridTilemap, {
      numberOfDirections: NumberOfDirections.EIGHT,
    });

    const shortestPath = algo.findShortestPath(
      layerPos(new Vector2(150, 150)),
      layerPos(new Vector2(250, 250)),
    );

    expect(shortestPath.steps).toEqual(1163);
    expect(shortestPath.path.length).toEqual(114);
  });

  it("should find the shortest path for transition edge case", () => {
    const gridTilemap = createTilemap([
      {
        layer: "lowerCharLayer",
        blockMap: [
          // prettier-ignore
          "......",
          "#.*...",
          "#.....",
          "#.....",
          "#...s.",
          "#.....",
          "#.....",
          "######",
        ],
      },
      {
        layer: "testCharLayer",
        blockMap: [
          // prettier-ignore
          "#.....",
          "#.*...",
          "#.....",
          "#.....",
          "......",
          "#.....",
          "#...t.",
          "######",
        ],
      },
    ]);
    const algo = new Jps8(gridTilemap, {
      numberOfDirections: NumberOfDirections.EIGHT,
    });

    gridTilemap.setTransition(
      new Vector2(2, 1),
      "lowerCharLayer",
      "testCharLayer",
    );

    const shortestPath = algo.findShortestPath(
      layerPos(new Vector2(4, 4)),
      layerPos(new Vector2(4, 6), "testCharLayer"),
    );

    expect(shortestPath.path.length).toBe(9);
  });
});
