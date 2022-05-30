import { LinearImmutableArray } from "../allocators";

// Size in bytes of low level structure in low level buffer
export const LL_STRUCTURE_SIZE_BYTES = 128;
// Size in words(f32/i32) of low level structure in low level buffer
export const LL_STRUCTURE_SIZE = (LL_STRUCTURE_SIZE_BYTES / 4);

export enum LowLevelStructure {
    Sphere = 0,
    Cylinder = 1,
    QuadraticBezierCurve = 2,
    AABB = 3,
    RoundedCone = 4,
    Triangle = 5,
    None = 9999,
}

export function typeOfPrimitive(view: DataView, offset: number): LowLevelStructure {
    const offsetBytes = offset * LL_STRUCTURE_SIZE_BYTES;

    return view.getInt32(offsetBytes + 124, true);
}

export class HighLevelStructure {
    /**
     * writeToArrayBuffer
     * 
     * @param buffer - buffer to write low level structures
     * @param offset - offset into the buffer where low level structures are written
     * @param type - type of low level structures that this high level structure should write. null to write them all
     * 
     * @returns number of low level structures that were written
     */
    public writeToArrayBuffer(buffer: LinearImmutableArray, offset: number, type: LowLevelStructure | null): number {
        return 0;
    };

    /**
     * Removes the structure from the *buffer* by zeroing out type variable in each low level structure
     */
    public removeFromArrayBuffer(): void {

    };

    /**
     * 
     * @param type 
     */
    public offsetOf(type: LowLevelStructure | null): number | null { return null; };

    /**
     * 
     * @param type 
     */
    public countOf(type: LowLevelStructure | null): number { return 0; };

    /**
     * 
     * @param type 
     * @param offset 
     */
    public localOffsetOf(type: LowLevelStructure, offset: number): number { return 0; };

    public getID(): number { return -1; };

    public partOfBVH(): boolean { return false; };
    public dirtyBVH(): boolean { return false; };
    public setCleanBVH(): void {};
    public setDirtyBVH(): void {};

    protected _opaque = true;

    public set opaque(opaque: boolean) {
        this._opaque = opaque;
    }

    public get opaque(): boolean {
        return this._opaque;
    }

    protected _hidden = false;

    public set hidden(hidden: boolean) {
        this._hidden = hidden;
    }

    public get hidden(): boolean {
        return this._hidden;
    }
}
