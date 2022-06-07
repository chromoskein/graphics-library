import { vec3, vec4 } from "gl-matrix";
import { ArrayViews, LinearImmutableArray } from "../allocators";
import { LowLevelStructure, HighLevelStructure, LL_STRUCTURE_SIZE, LL_STRUCTURE_SIZE_BYTES } from "./shared";
import { writeSphereToArrayBuffer } from "./sphere";
import { GraphicsLibrary } from "..";
import { BoundingBox, BoundingBoxCalculateCenter, BoundingBoxEmpty, BoundingBoxExtendByPoint } from "../shared";

// GPU: 36 bytes, 9 words/floats
export type Vertex = {
    position: vec4;  // GPU: 16-bytes
    normal: vec4;    // GPU: 16-bytes
    color: vec4;     // GPU: 4-bytes
};

export type Triangle = Array<Vertex>;

export function triangleToBoundingBox(array: ArrayViews, offset: number): BoundingBox {
    const result = BoundingBoxEmpty();

    const p0 = vec3.fromValues(
        array.f32View[offset * LL_STRUCTURE_SIZE + 0],
        array.f32View[offset * LL_STRUCTURE_SIZE + 1],
        array.f32View[offset * LL_STRUCTURE_SIZE + 2]
    );
    const p1 = vec3.fromValues(
        array.f32View[offset * LL_STRUCTURE_SIZE + 4],
        array.f32View[offset * LL_STRUCTURE_SIZE + 5],
        array.f32View[offset * LL_STRUCTURE_SIZE + 6]
    );
    const p2 = vec3.fromValues(
        array.f32View[offset * LL_STRUCTURE_SIZE + 8],
        array.f32View[offset * LL_STRUCTURE_SIZE + 9],
        array.f32View[offset * LL_STRUCTURE_SIZE + 10]
    );

    const radius = array.f32View[offset * LL_STRUCTURE_SIZE + 3];

    BoundingBoxExtendByPoint(result, p0);
    BoundingBoxExtendByPoint(result, p1);
    BoundingBoxExtendByPoint(result, p2);

    BoundingBoxCalculateCenter(result);

    return result;
}

export class Mesh extends HighLevelStructure {
    private graphicsLibrary: GraphicsLibrary;
    private buffer: LinearImmutableArray | null = null;
    private id: number;

    private _trianglesPosition = 0;

    private _triangles: Array<Triangle>;

    private _partOfBVH: boolean;
    private _dirtyBVH: boolean;

    constructor(graphicsLibrary: GraphicsLibrary, id: number, partOfBVH = true, triangles: Array<Triangle>) {
        super();

        this.graphicsLibrary = graphicsLibrary;

        this.id = id;

        this._triangles = triangles;

        this._partOfBVH = partOfBVH;
        this._dirtyBVH = true;
    }

    public getID(): number {
        return this.id;
    }

    //#region HighLevelStructure Interface
    public writeToArrayBuffer(buffer: LinearImmutableArray, offset: number, type: LowLevelStructure | null): number {
        let written = 0;

        this.buffer = buffer;

        if (type == null || type == LowLevelStructure.Triangle) {
            const f32View = buffer.f32View;
            const i32View = buffer.i32View;
            const u8View = buffer.u8view;

            for (let i = 0; i < this._triangles.length; i++) {
                const triangleOffset = offset + i;
                const localOffsetWords = triangleOffset * LL_STRUCTURE_SIZE;
                const localOffsetBytes = triangleOffset * LL_STRUCTURE_SIZE_BYTES;

                const triangle = this._triangles[i];
                for (let v = 0; v < 3; v++) {
                    const vertex = triangle[v];

                    f32View.set(vertex.position, localOffsetWords + v * 4);
                    u8View.set([vertex.color[0] * 255, vertex.color[1] * 255, vertex.color[2] * 255, vertex.color[3] * 255], localOffsetBytes + 96 + v * 4);
                }

                i32View.set([this._partOfBVH ? 1 : 0], localOffsetWords + 29);
                i32View.set([LowLevelStructure.Triangle], localOffsetWords + 31);
                i32View.set([this.id], localOffsetWords + 30);
            }

            this._trianglesPosition = offset;
            this.buffer.setModifiedBytes({ start: offset * LL_STRUCTURE_SIZE_BYTES, end: (offset + this._triangles.length) * LL_STRUCTURE_SIZE_BYTES });

            written += this._triangles.length;
        }

        return written;
    }

    public removeFromArrayBuffer(): void {
        if (!this.buffer) {
            return;
        }

        for (let i = 0; i < this._triangles.length; i++) {
            this.buffer.i32View.set([LowLevelStructure.None], (this._trianglesPosition + i) * LL_STRUCTURE_SIZE + 31);
        }

        this.buffer.setModifiedBytes({ start: this._trianglesPosition * LL_STRUCTURE_SIZE_BYTES, end: (this._trianglesPosition + this._triangles.length) * LL_STRUCTURE_SIZE_BYTES });
    }

    public countOf(type: LowLevelStructure | null): number {
        if (type == null || type == LowLevelStructure.Triangle) {
            return (this._triangles.length);
        }

        return 0;
    }

    public offsetOf(type: LowLevelStructure | null): number | null {
        switch (type) {
            case LowLevelStructure.Triangle: return this._trianglesPosition;
            default: return 0;
        }
    }

    public localOffsetOf(type: LowLevelStructure, offset: number): number {
        switch (type) {
            case LowLevelStructure.Triangle: return offset - this._trianglesPosition;
        }

        return -1;
    }

    //#region BVH
    partOfBVH(): boolean {
        return this._partOfBVH;
    }

    dirtyBVH(): boolean {
        return this._dirtyBVH;
    }

    setCleanBVH(): void {
        this._dirtyBVH = false;
    }

    setDirtyBVH(): void {
        this._dirtyBVH = true;
    }
    //#endregion
    //#endregion

    private setModified(i: number, dirtyBVH = true) {
        this.buffer?.setModifiedBytes({ start: this._trianglesPosition * LL_STRUCTURE_SIZE_BYTES, end: (this._trianglesPosition + i) * LL_STRUCTURE_SIZE_BYTES });
        this._dirtyBVH = dirtyBVH;
    }

    public setTriangleColor(i: number, vertexIndex: number, color: vec4): void {
        this._triangles[i][vertexIndex].color = color;

        const triangleOffset = this._trianglesPosition + i;
        const localOffsetBytes = triangleOffset * LL_STRUCTURE_SIZE_BYTES;

        if (this.buffer) {
            this.buffer.u8view.set([color[0] * 255, color[1] * 255, color[2] * 255, color[3] * 255], localOffsetBytes + 96 + vertexIndex * 4);
        }

        this.buffer?.setModifiedBytes({ start: this._trianglesPosition * LL_STRUCTURE_SIZE_BYTES, end: (this._trianglesPosition + i) * LL_STRUCTURE_SIZE_BYTES });
    }

    //#region Setters & Getters
    //#endregion
}