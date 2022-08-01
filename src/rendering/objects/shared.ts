import { Allocation, Allocator, GraphicsLibrary } from "../..";
import { BoundingBox } from "../../shared";

export abstract class IObject {
    /**
     * Unique ID identifying the object.
     */
    protected _id: number;
    protected _allocation: Allocation | null = null;

    protected _graphicsLibrary: GraphicsLibrary;

    public static variableName: string;
    public static typeName: string;

    public parent: IObject | null = null;

    constructor(id: number, graphicsLibrary: GraphicsLibrary, allocator: Allocator) {
        this._id = id;
        this._graphicsLibrary = graphicsLibrary;
    }

    public get id(): number {
        return this._id;
    }
}

export abstract class ComposedObject extends IObject {

}

export abstract class ConcreteObject extends IObject {
    protected _allocation: Allocation | null = null;

    protected _transparent = false;
    protected _dirty: boolean = true;

    static bindGroupLayouts: Array<GPUBindGroupLayout> = [];

    public abstract onMoved(): void;

    public update(): void {
        if (this._allocation && this._allocation.allocationRange.moved) {
            this.onMoved();
            this._allocation.allocationRange.moved = false;
            this.setDirty();
        }        

        if (this._allocation && this.dirty) {
            this.toBuffer(this._allocation.cpuBuffer, this._allocation.allocationRange.offset);
        }
    }

    public abstract record(encoder: GPURenderPassEncoder, bindGroupLayoutsOffset: number): void;
    
    /**
     * Whether this object should be part of bounding volume hierarchy.
     * For example, overlayed Gizmo may not want to be included. Gizmo's
     * movement would unnecessarily cause recomputation of BVH. 
     */
    protected inBVH = false;

    /**
     * Whether BVH needs to recomputed due to changes to this object.
     */
    protected dirtyBVH = false;

    constructor(id: number, graphicsLibrary: GraphicsLibrary, allocator: Allocator) {
        super(id, graphicsLibrary, allocator);
    }

    public abstract toBuffer(buffer: ArrayBuffer, offset: number): void;
    public abstract toBoundingBoxes(): BoundingBox[];

    protected get opaque(): boolean { return !this._transparent; }
    protected get transparent(): boolean { return this._transparent; }

    public setDirty(): void { this._dirty = true; }
    public get dirty(): boolean { return this._dirty; }

    public get allocation(): Allocation | null {
        return this._allocation;
    }
}

