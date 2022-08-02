export interface AllocationRange {
    size: number;
    offset: number;

    moved: boolean;
}

export interface Allocation {
    cpuBuffer: ArrayBuffer;
    gpuBuffer: GPUBuffer;

    allocationRange: AllocationRange;
}

export enum  AllocatorStrategy {
    Basic
}

export abstract class Allocator {
    public abstract strategy: AllocatorStrategy;

    protected _device: GPUDevice;
    protected _buffer: ArrayBuffer;
    protected _gpuBuffer: GPUBuffer;

    protected _size: number;

    protected _allocated: number = 0;
    protected _deallocated: number = 0;

    protected _allocations: Array<AllocationRange> = [];

    constructor(device: GPUDevice, initialSize: number) {
        this._size = initialSize;
        this._device = device;

        this._buffer = new ArrayBuffer(initialSize);
        this._gpuBuffer = this._device.createBuffer({
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
            size: initialSize,
        });
    }

    public abstract allocate(size: number): Allocation;
    public abstract deallocate(): void;
    public abstract deallocate(allocation: Allocation): void;

    public cpuBuffer(): ArrayBuffer {
        return this._buffer;
    }

    public gpuBuffer(): GPUBuffer {
        return this._gpuBuffer;
    }

    protected get allocationRatio(): number {
        if (this._allocated == 0 && this._deallocated == 0) {
            return 0;
        }
        
        return this._deallocated / this._allocated;
    }

    protected get freeSpace(): number {
        return Math.max(0, this._buffer.byteLength - this._allocated);
    }

    protected get freeSpaceRatio(): number {
        return this._allocated / this._buffer.byteLength;
    }
}