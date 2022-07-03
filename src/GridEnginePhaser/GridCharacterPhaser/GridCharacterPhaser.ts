import { GridTilemap, LayerName } from "./../../GridTilemap/GridTilemap";
import {
  CharConfig,
  GameObject,
  GridCharacter,
} from "../../GridCharacter/GridCharacter";
import { CharacterData } from "../../GridEngine";
import { Vector2 } from "../../Utils/Vector2/Vector2";
import { CharacterAnimation } from "../../GridCharacter/CharacterAnimation/CharacterAnimation";
import { LayerPosition } from "../../Pathfinding/ShortestPathAlgorithm";
import { Utils } from "../../Utils/Utils/Utils";
import { Subject } from "rxjs";
import { takeUntil } from "rxjs/operators";

export class GridCharacterPhaser {
  private sprite?: Phaser.GameObjects.Sprite;
  private layerOverlaySprite?: Phaser.GameObjects.Sprite;
  private container?: Phaser.GameObjects.Container;
  private newSpriteSet$ = new Subject<void>();
  private gridCharacter: GridCharacter = this.createChar(
    this.charData,
    this.layerOverlay
  );

  constructor(
    private charData: CharacterData,
    private scene: Phaser.Scene,
    private tilemap: GridTilemap,
    private layerOverlay: boolean
  ) {}

  getGridCharacter(): GridCharacter {
    return this.gridCharacter;
  }

  setSprite(sprite?: Phaser.GameObjects.Sprite): void {
    if (sprite) {
      if (this.sprite) {
        sprite.x = this.sprite.x;
        sprite.y = this.sprite.y;
      }
      this.sprite = sprite;
      this.newSpriteSet$.next();
      this.layerOverlaySprite = this.layerOverlaySprite
        ? this.scene.add.sprite(0, 0, this.sprite.texture)
        : undefined;
      this.updateOverlaySprite();
      this.resetAnimation(this.gridCharacter, this.sprite);
      this.updateDepth(this.gridCharacter);
    } else {
      this.layerOverlaySprite = undefined;
      this.sprite = undefined;
    }
  }

  getSprite(): Phaser.GameObjects.Sprite | undefined {
    return this.sprite;
  }

  getLayerOverlaySprite(): Phaser.GameObjects.Sprite | undefined {
    return this.layerOverlaySprite;
  }

  setContainer(container?: Phaser.GameObjects.Container): void {
    this.container = container;
  }

  getContainer(): Phaser.GameObjects.Container | undefined {
    return this.container;
  }

  private createChar(
    charData: CharacterData,
    layerOverlay: boolean
  ): GridCharacter {
    this.layerOverlaySprite =
      layerOverlay && charData.sprite
        ? this.scene.add.sprite(0, 0, charData.sprite.texture)
        : undefined;

    const charConfig: CharConfig = {
      speed: charData.speed || 4,
      tilemap: this.tilemap,
      walkingAnimationMapping: charData.walkingAnimationMapping,
      offsetX: charData.offsetX,
      offsetY: charData.offsetY,
      collidesWithTiles: true,
      collisionGroups: ["geDefault"],
      charLayer: charData.charLayer,
      facingDirection: charData.facingDirection,
    };

    if (typeof charData.collides === "boolean") {
      if (charData.collides === false) {
        charConfig.collidesWithTiles = false;
        charConfig.collisionGroups = [];
      }
    } else if (charData.collides !== undefined) {
      if (charData.collides.collidesWithTiles === false) {
        charConfig.collidesWithTiles = false;
      }
      if (charData.collides.collisionGroups) {
        charConfig.collisionGroups = charData.collides.collisionGroups;
      }
    }

    this.sprite = charData.sprite;
    this.container = charData.container;

    const gridChar = new GridCharacter(charData.id, charConfig);

    gridChar.pixelPositionChanged().subscribe((pixelPos: Vector2) => {
      const gameObj = this.container || this.sprite;
      if (gameObj) {
        gameObj.x = pixelPos.x;
        gameObj.y = pixelPos.y;
      }

      if (this.sprite && gridChar.isMoving()) {
        gridChar
          .getAnimation()
          ?.updateCharacterFrame(
            gridChar.getMovementDirection(),
            gridChar.hasWalkedHalfATile(),
            Number(this.sprite.frame.name)
          );
      }

      this.updateDepth(gridChar);
    });

    if (this.sprite) {
      this.sprite.setOrigin(0, 0);

      const offsetX =
        this.tilemap.getTileWidth() / 2 -
        Math.floor((this.sprite.displayWidth ?? 0) / 2);
      const offsetY =
        -(this.sprite.displayHeight ?? 0) + this.tilemap.getTileHeight();
      gridChar.engineOffset = new Vector2(offsetX, offsetY);

      this.resetAnimation(gridChar, this.sprite);

      this.updateOverlaySprite();

      if (charData.startPosition) {
        gridChar.setTilePosition({
          position: new Vector2(charData.startPosition),
          layer: gridChar.getTilePos().layer,
        });
      }
    }

    // TODO: check for memory leak

    return gridChar;
  }

  private resetAnimation(
    gridChar: GridCharacter,
    sprite: Phaser.GameObjects.Sprite
  ) {
    const animation = new CharacterAnimation(
      gridChar.getWalkingAnimationMapping(),
      gridChar.getCharacterIndex(),
      sprite.texture.source[0].width /
        sprite.width /
        CharacterAnimation.FRAMES_CHAR_ROW
    );
    gridChar.setAnimation(animation);
    animation
      .frameChange()
      .pipe(takeUntil(this.newSpriteSet$))
      .subscribe((frameNo) => {
        sprite?.setFrame(frameNo);
      });

    animation.setIsEnabled(
      gridChar.getWalkingAnimationMapping() !== undefined ||
        gridChar.getCharacterIndex() !== -1
    );
    animation.setStandingFrame(gridChar.getFacingDirection());
  }

  private updateOverlaySprite() {
    if (!this.layerOverlaySprite || !this.sprite) return;

    this.layerOverlaySprite.scale = this.sprite.scale;
    const scaledTileHeight =
      this.tilemap.getTileHeight() / this.layerOverlaySprite.scale;
    this.layerOverlaySprite.setCrop(
      0,
      0,
      this.layerOverlaySprite.displayWidth,
      this.sprite.height - scaledTileHeight
    );
    this.layerOverlaySprite.setOrigin(0, 0);
  }

  private updateDepth(gridChar: GridCharacter) {
    const gameObject = this.container || this.sprite;

    if (!gameObject) return;
    this.setDepth(gameObject, gridChar.getNextTilePos());
    const layerOverlaySprite = this.getLayerOverlaySprite();

    if (layerOverlaySprite) {
      const posAbove = new Vector2({
        ...gridChar.getNextTilePos().position,
        y: gridChar.getNextTilePos().position.y - 1,
      });
      this.setDepth(layerOverlaySprite, {
        position: posAbove,
        layer: gridChar.getNextTilePos().layer,
      });
    }
  }

  private setDepth(gameObject: GameObject, position: LayerPosition): void {
    gameObject.setDepth(
      this.tilemap.getDepthOfCharLayer(this.getTransitionLayer(position)) +
        this.getPaddedPixelDepth(gameObject)
    );
  }

  private getPaddedPixelDepth(gameObject: GameObject): number {
    return Utils.shiftPad(gameObject.y + gameObject.displayHeight, 7);
  }

  private getTransitionLayer(position: LayerPosition): LayerName {
    return (
      this.tilemap.getTransition(position.position, position.layer) ||
      position.layer
    );
  }
}
