import { Allocation, AllocationRange, Allocator, AllocatorStrategy } from "./shared";

const minimumArraySize = 1048576; // 1MB

function nearestPowerOf2(n: number) {
    if (n <= 1024) {
        return 1024;
    }

    return 1 << 31 - Math.clz32(n);
}

export class BasicAllocator extends Allocator {
    public strategy: AllocatorStrategy = AllocatorStrategy.Basic;

    constructor(device: GPUDevice, initialSize: number = minimumArraySize) {
        super(device, initialSize);
    }

    public allocate(requestedSize: number): Allocation {
        // Conditions for reallocating entire array
        if (this.freeSpace < requestedSize || this.allocationRatio > 0.75) {
            let newSize = Math.max(
                nearestPowerOf2(this._size),
                nearestPowerOf2(this._allocated + requestedSize)
            );

            if (newSize < 0.25 * this._size) {
                newSize = Math.max(minimumArraySize, nearestPowerOf2(0.25 * this._size));
            }

            const newArrayBuffer = new ArrayBuffer(newSize);
            const newGpuBuffer = this._device.createBuffer({
                usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.STORAGE,
                size: newSize,
            });

            let currentOffset = 0;
            const newAllocations = [];
            for (const allocation of this._allocations) {
                currentOffset += allocation.size;

                allocation.offset = currentOffset;
                allocation.moved = true;

                newAllocations.push(allocation);
            }
            
            this._size = newSize;
            this._allocated = newAllocations.map(a => a.size).reduce((a, b) => a + b, 0);
            this._deallocated = 0;

            this._buffer = newArrayBuffer;
            this._gpuBuffer = newGpuBuffer;

            this._allocations = newAllocations;
        }

        // Round up allocation to alignment of 256 bytes
        const size = requestedSize + (requestedSize % 256);

        const allocationRange: AllocationRange = {
            size,
            offset: this._allocated,
            moved: true,
        };

        this._allocations.push(allocationRange);
        this._allocated = allocationRange.size;

        return {
            cpuBuffer: this._buffer,
            gpuBuffer: this._gpuBuffer,

            allocationRange: allocationRange,
        }
    }

    public deallocate(): void {
        this._allocations = [];
        this._gpuBuffer.destroy();
    }

    public deallocate(allocation: Allocation): void {
    }
}