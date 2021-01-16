import * as Phaser from "phaser";
import { VectorUtils } from "./VectorUtils";
describe("VectorUtils", () => {
  beforeEach(() => {});

  describe("vec2str", () => {
    it("should transform a vector into a string", () => {
      const vector = new Phaser.Math.Vector2(3, -1);
      expect(VectorUtils.vec2str(vector)).toEqual("3#-1");
    });
  });

  describe("equal", () => {
    it("should detect equal vectors", () => {
      const vector = new Phaser.Math.Vector2(3, -1);
      const vector2 = new Phaser.Math.Vector2(3, -1);
      expect(VectorUtils.equal(vector, vector2)).toBe(true);
      expect(VectorUtils.equal(vector2, vector)).toBe(true);
    });

    it("should detect unequal vectors", () => {
      const vector = new Phaser.Math.Vector2(3, -1);
      const vector2 = new Phaser.Math.Vector2(2, 1);
      expect(VectorUtils.equal(vector, vector2)).toBe(false);
      expect(VectorUtils.equal(vector2, vector)).toBe(false);
    });
  });
});
