import { Allocator, BasicAllocator } from "./allocation/index"
import { Camera } from "./cameras/index";
import { GraphicsLibrary } from ".";
import { BoundingBox } from "./shared";
import { vec3, vec4 } from "gl-matrix";
import { ConcreteObject, IObject } from "./rendering";

export enum RenderObjects {
    Transparent,
    Opaque,
}

export class Scene {
    private graphicsLibrary: GraphicsLibrary;

    private _objects: Array<IObject> = [];
    private _lastObjectID = 0;

    private _allocator: BasicAllocator;

    private _version: number = 1;

    //#region BVH & Ray-tracing
    private bvhWorker: Worker | null = null;
    private _useBVH = true;
    // private _bvh: BoundingVolumeHierarchy | null = null;
    private _globalBBox: BoundingBox | null = null;

    private _bboxesBuffer: GPUBuffer | null = null;
    private _nodesBuffer: GPUBuffer | null = null;

    private _bvhBindGroup: GPUBindGroup | null = null;
    //#endregion    

    constructor(graphicsLibrary: GraphicsLibrary, useBVH = true) {
        this.graphicsLibrary = graphicsLibrary;
        
        this._allocator = new BasicAllocator(graphicsLibrary.device);

        this._useBVH = useBVH;
    }

    public deallocate(): void {
        this._objects = [];
        this._allocator.deallocate();
    }

    public buildBVH(): void {
        console.time('scene::buildBVH');

        if (this.bvhWorker != null) {
            this.bvhWorker.terminate();
        }
        
        // console.time('scene::buildBVH::bboxes');
        // TODO: get bounding Boxes
        // console.timeEnd('scene::buildBVH::bboxes');

        // this.bvhWorker = new BinnedSAHBuilderWorker();
        // this.bvhWorker.onmessage = ({ data: { result } }) => {
        //     // console.time('scene::buildBVH::Finish');
        //     if (result == null) {
        //         this._bvh = null;

        //         allocator.deallocateArray(this._nodesBuffer);
        //         allocator.deallocateArray(this._bboxesBuffer);

        //         this._nodesBuffer = null;
        //         this._bboxesBuffer = null;
        //         this._bvhBindGroup = null;

        //         return;
        //     }

        //     this._bvh = new BoundingVolumeHierarchy();
        //     this._bvh.primitives = this._buffer.data;
        //     this._bvh.bboxes = result.bboxes;
        //     this._bvh.nodes = result.nodes;
        //     this._bvh.nodeCount = result.nodeCount;

        //     const nodesSizeBytes = this._bvh.nodeCount * NODE_SIZE_BYTES;
        //     const bboxesSizeBytes = this._bvh.bboxes.length * BOUNDING_BOX_SIZE_BYTES;

        //     if (this._nodesBuffer == null || (this._nodesBuffer != null && this._nodesBuffer.sizeBytes <= nodesSizeBytes)) {
        //         allocator.deallocateArray(this._nodesBuffer);
        //         this._nodesBuffer = allocator.allocateArray(Math.ceil(nodesSizeBytes / allocator.slabSize));
        //     }
        //     if (this._bboxesBuffer == null || (this._nodesBuffer != null && this._bboxesBuffer.sizeBytes <= bboxesSizeBytes)) {
        //         allocator.deallocateArray(this._bboxesBuffer);
        //         this._bboxesBuffer = allocator.allocateArray(Math.ceil(bboxesSizeBytes / allocator.slabSize));
        //     }

        //     this._bvh.toGPUArrays(this._nodesBuffer, this._bboxesBuffer);

        //     this._bvhBindGroup = this.graphicsLibrary.device.createBindGroup({
        //         layout: this.graphicsLibrary.bindGroupLayouts.boundingVolumeHierarchy,
        //         entries: [
        //             {
        //                 binding: 0,
        //                 resource: {
        //                     buffer: this._nodesBuffer.gpuBuffer,
        //                     offset: this._nodesBuffer.data.byteOffset,
        //                     size: this._nodesBuffer.data.byteLength,
        //                 }
        //             },
        //             {
        //                 binding: 1,
        //                 resource: {
        //                     buffer: this._bboxesBuffer.gpuBuffer,
        //                     offset: this._bboxesBuffer.data.byteOffset,
        //                     size: this._bboxesBuffer.data.byteLength,
        //                 }
        //             }
        //         ]
        //     });

        //     // console.timeEnd('scene::buildBVH::Finish');
        // };
        // this.bvhWorker.postMessage({ objectsBuffer: copyOfObjectsBuffer });

        console.timeEnd('scene::buildBVH');
    }

    public addObject<T extends IObject>(objectType: new (id: number, graphicsLibrary: GraphicsLibrary, allocator: Allocator) => T): [T, number] {
        const objectID = this._lastObjectID++;
        const object = new objectType(objectID, this.graphicsLibrary, this._allocator);

        this._objects.push(object);

        this._version++;

        console.log('addObject::', this._objects);

        return [object, objectID];
    }

    public clearObjects(): void {
        
    }

    public removeObjectByID(objectID: number): void {
        const objectIndex = this._objects.findIndex((object) => object.id === objectID);

        if (objectIndex >= 0) {
            this._objects = this._objects.splice(objectIndex);
        }
    }

    public uploadModified(queue: GPUQueue): void {
        console.log(this._objects);
        
        for(const object of this._objects) {
            if (object instanceof ConcreteObject) {
                object.update();
            }
        }

        for(const object of this._objects) {
            if (object instanceof ConcreteObject) {
                // if (object.dirty) {
                    const allocation = object.allocation;

                    if (!allocation) {
                        continue;
                    }

                    queue.writeBuffer(
                        this._allocator.gpuBuffer(), 
                        allocation.allocationRange.offset, 
                        allocation.cpuBuffer, 
                        allocation.allocationRange.offset, 
                        allocation.allocationRange.size
                    );
                // }
            }
        }
    }

    public get version(): number {
        return this._version;
    }

    public get objects(): Array<IObject> {
        return this._objects;
    }

    public set useBVH(useBVH: boolean) {
        this._useBVH = useBVH;
    }

    // public get bvh(): BoundingVolumeHierarchy | null {
    //     return this._bvh;
    // }

    public get globalBBox(): BoundingBox | null {
        return this._globalBBox;
    }

    // public get structures(): Array<HighLevelStructure> {
    //     return this._structures;
    // }
}