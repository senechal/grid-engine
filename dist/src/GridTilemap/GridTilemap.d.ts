import { Direction } from "./../Direction/Direction";
import { Vector2 } from "../Utils/Vector2/Vector2";
import { GridCharacter } from "../GridCharacter/GridCharacter";
export declare type LayerName = string | undefined;
export declare class GridTilemap {
    private tilemap;
    private static readonly ALWAYS_TOP_PROP_NAME;
    private static readonly CHAR_LAYER_PROP_NAME;
    private static readonly HEIGHT_SHIFT_PROP_NAME;
    private static readonly ONE_WAY_COLLIDE_PROP_PREFIX;
    private static readonly Z_INDEX_PADDING;
    private characters;
    private charBlockCache;
    private charLayerDepths;
    private transitions;
    constructor(tilemap: Phaser.Tilemaps.Tilemap);
    addCharacter(character: GridCharacter): void;
    removeCharacter(charId: string): void;
    getCharacters(): GridCharacter[];
    getCharactersAt(position: Vector2, layer: string): Set<GridCharacter>;
    hasBlockingTile(pos: Vector2, charLayer: string | undefined, direction?: Direction): boolean;
    getTransition(pos: Vector2, fromLayer?: string): string | undefined;
    setTransition(pos: Vector2, fromLayer: LayerName, toLayer: LayerName): void;
    getTransitions(): Map<LayerName, Map<LayerName, LayerName>>;
    hasNoTile(pos: Vector2, charLayer?: string): boolean;
    hasBlockingChar(pos: Vector2, layer: string | undefined, collisionGroups: string[], exclude?: Set<string>): boolean;
    getTileWidth(): number;
    getTileHeight(): number;
    getDepthOfCharLayer(layerName: LayerName): number;
    isInRange(pos: Vector2): boolean;
    getTileSize(): Vector2;
    tilePosToPixelPos(tilePosition: Vector2): Vector2;
    getTileDistance(direction: Direction): Vector2;
    toMapDirection(direction: Direction): Direction;
    fromMapDirection(direction: Direction): Direction;
    isIsometric(): boolean;
    private isLayerBlockingAt;
    private getCharLayerIndexes;
    private findPrevAndCharLayer;
    private getCollisionRelevantLayers;
    private getLowestCharLayer;
    private getLayerProp;
    private hasLayerProp;
    private isLayerAlwaysOnTop;
    private isCharLayer;
    private setLayerDepths;
    private setDepth;
    private createHeightShiftLayers;
    private copyLayer;
}
