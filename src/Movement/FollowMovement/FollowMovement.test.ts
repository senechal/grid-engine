import {
  LayerVecPos,
  ShortestPathAlgorithmType,
} from "./../../Pathfinding/ShortestPathAlgorithm.js";
import { NumberOfDirections } from "./../../Direction/Direction.js";
import { FollowMovement } from "./FollowMovement.js";
import { TargetMovement } from "../TargetMovement/TargetMovement.js";
import { Subject } from "rxjs";
import { Vector2 } from "../../Utils/Vector2/Vector2.js";
import { NoPathFoundStrategy } from "../../Pathfinding/NoPathFoundStrategy.js";

const mockTargetMovement = {
  setCharacter: jest.fn(),
  update: jest.fn(),
};

jest.mock("../TargetMovement/TargetMovement", () => ({
  TargetMovement: jest.fn(function () {
    return mockTargetMovement;
  }),
}));

describe("FollowMovement", () => {
  let followMovement: FollowMovement;
  let gridTilemapMock;
  let mockChar;
  let targetCharPos: LayerVecPos;
  let targetChar;

  function createMockChar(id: string, pos: LayerVecPos) {
    return <any>{
      positionChangeStartedSubject$: new Subject(),
      autoMovementSetSubject$: new Subject(),
      getId: () => id,
      getTilePos: jest.fn(() => pos),
      move: jest.fn(),
      isMoving: () => false,
      positionChangeStarted: function () {
        return this.positionChangeStartedSubject$;
      },
      autoMovementSet: function () {
        return this.autoMovementSetSubject$;
      },
      getNumberOfDirections: jest.fn(() => NumberOfDirections.FOUR),
    };
  }

  beforeEach(() => {
    jest.clearAllMocks();
    gridTilemapMock = {
      hasBlockingTile: jest.fn(),
      hasNoTile: jest.fn(),
      hasBlockingChar: jest.fn().mockReturnValue(false),
      isBlocking: jest.fn(),
    };
    mockTargetMovement.setCharacter.mockReset();
    const charPos = { position: new Vector2(1, 1), layer: "layer1" };
    targetCharPos = { position: new Vector2(3, 1), layer: "layer1" };
    mockChar = createMockChar("char", charPos);
    targetChar = createMockChar("targetChar", targetCharPos);
    followMovement = new FollowMovement(mockChar, gridTilemapMock, targetChar);
  });

  it("should set character", () => {
    expect(TargetMovement).toHaveBeenCalledWith(
      mockChar,
      gridTilemapMock,
      targetCharPos,
      {
        distance: 1,
        config: {
          algorithm: "BIDIRECTIONAL_SEARCH",
          noPathFoundStrategy: NoPathFoundStrategy.STOP,
          maxPathLength: Infinity,
          ignoreLayers: false,
          considerCosts: false,
        },
        ignoreBlockedTarget: true,
      },
    );
  });

  it("should update added character", () => {
    followMovement.update(100);
    expect(mockTargetMovement.update).toHaveBeenCalledWith(100);
  });

  it("should update target on position change", () => {
    const enterTile = { position: new Vector2(7, 7), layer: "layer1" };
    mockTargetMovement.setCharacter.mockReset();

    targetChar.positionChangeStartedSubject$.next({
      enterTile: enterTile.position,
      enterLayer: enterTile.layer,
    });

    expect(TargetMovement).toHaveBeenCalledWith(
      mockChar,
      gridTilemapMock,
      enterTile,
      {
        distance: 1,
        config: {
          algorithm: "BIDIRECTIONAL_SEARCH",
          noPathFoundStrategy: NoPathFoundStrategy.STOP,
          maxPathLength: Infinity,
          ignoreLayers: false,
          considerCosts: false,
        },
        ignoreBlockedTarget: true,
      },
    );
  });

  it("should not update target on position change after autoMovementSet", () => {
    // @ts-ignore
    TargetMovement.mockClear();
    const enterTile = new Vector2(7, 7);
    mockTargetMovement.setCharacter.mockReset();

    mockChar.autoMovementSetSubject$.next(undefined);
    targetChar.positionChangeStartedSubject$.next({ enterTile });

    expect(TargetMovement).not.toHaveBeenCalled();
  });

  it("should update target on position change after autoMovementSet if movement is the same", () => {
    // @ts-ignore
    TargetMovement.mockClear();
    const enterTile = new Vector2(7, 7);
    mockTargetMovement.setCharacter.mockReset();

    mockChar.autoMovementSetSubject$.next(followMovement);
    targetChar.positionChangeStartedSubject$.next({ enterTile });

    expect(TargetMovement).toHaveBeenCalled();
  });

  it("should update added character with distance and maxPathLength", () => {
    followMovement = new FollowMovement(mockChar, gridTilemapMock, targetChar, {
      distance: 7,
      noPathFoundStrategy: NoPathFoundStrategy.STOP,
      maxPathLength: 100,
      ignoreLayers: true,
    });
    followMovement.update(100);
    expect(TargetMovement).toHaveBeenCalledWith(
      mockChar,
      gridTilemapMock,
      targetCharPos,
      {
        distance: 8,
        config: {
          algorithm: "BIDIRECTIONAL_SEARCH",
          noPathFoundStrategy: NoPathFoundStrategy.STOP,
          maxPathLength: 100,
          ignoreLayers: true,
          considerCosts: false,
        },
        ignoreBlockedTarget: true,
      },
    );
  });

  it("should update added character with distance and CLOSEST_REACHABLE", () => {
    followMovement = new FollowMovement(mockChar, gridTilemapMock, targetChar, {
      distance: 7,
      noPathFoundStrategy: NoPathFoundStrategy.CLOSEST_REACHABLE,
    });
    followMovement.update(100);
    expect(TargetMovement).toHaveBeenCalledWith(
      mockChar,
      gridTilemapMock,
      targetCharPos,
      {
        distance: 8,
        config: {
          algorithm: "BIDIRECTIONAL_SEARCH",
          noPathFoundStrategy: NoPathFoundStrategy.CLOSEST_REACHABLE,
          maxPathLength: Infinity,
          ignoreLayers: false,
          considerCosts: false,
        },
        ignoreBlockedTarget: true,
      },
    );
  });

  it("should update added character with considerCosts", () => {
    followMovement = new FollowMovement(mockChar, gridTilemapMock, targetChar, {
      shortestPathAlgorithm: "A_STAR",
      considerCosts: true,
    });
    followMovement.update(100);
    expect(TargetMovement).toHaveBeenCalledWith(
      mockChar,
      gridTilemapMock,
      targetCharPos,
      {
        distance: 1,
        config: {
          algorithm: "A_STAR",
          noPathFoundStrategy: NoPathFoundStrategy.STOP,
          maxPathLength: Infinity,
          ignoreLayers: false,
          considerCosts: true,
        },
        ignoreBlockedTarget: true,
      },
    );
  });

  it("should show movement information", () => {
    followMovement = new FollowMovement(mockChar, gridTilemapMock, targetChar, {
      distance: 7,
      noPathFoundStrategy: NoPathFoundStrategy.CLOSEST_REACHABLE,
    });
    expect(followMovement.getInfo()).toEqual({
      type: "Follow",
      config: {
        charToFollow: targetChar.getId(),
        distance: 7,
        noPathFoundStrategy: NoPathFoundStrategy.CLOSEST_REACHABLE,
        maxPathLength: Infinity,
        ignoreLayers: false,
      },
    });
  });

  test.each(["BFS", "BIDIRECTIONAL_SEARCH", "JPS"])(
    "should show a warning if considerCost pathfinding option is used with" +
      " algorithm different than A*",
    (algorithm: ShortestPathAlgorithmType) => {
      console.warn = jest.fn();
      followMovement = new FollowMovement(
        mockChar,
        gridTilemapMock,
        targetChar,
        {
          considerCosts: true,
          shortestPathAlgorithm: algorithm,
        },
      );

      expect(console.warn).toHaveBeenCalledWith(
        `GridEngine: Pathfinding option 'considerCosts' cannot be used with ` +
          `algorithm '${algorithm}'. It can only be used with A* algorithm.`,
      );
    },
  );

  it(
    "should not show a warning if considerCost pathfinding option is used " +
      "with A*",
    () => {
      console.warn = jest.fn();
      followMovement = new FollowMovement(
        mockChar,
        gridTilemapMock,
        targetChar,
        {
          considerCosts: true,
          shortestPathAlgorithm: "A_STAR",
        },
      );

      expect(console.warn).not.toHaveBeenCalledWith(
        `GridEngine: Pathfinding option 'considerCosts' cannot be used with ` +
          `algorithm 'A_STAR'. It can only be used with A* algorithm.`,
      );
    },
  );
});
