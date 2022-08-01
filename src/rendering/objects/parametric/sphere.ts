import { Allocation, Allocator, GraphicsLibrary } from "../../..";
import { BoundingBox, Intersection, Ray } from "../../../shared";
import { IParametricObject } from "./shared";
import * as r from 'restructure';
import { vec3, vec4 } from "gl-matrix";

export interface SphereProperties {
    center: vec3,
    radius: number,
    color: vec4,
}

export const SphereStruct = new r.Struct({
    center: new r.Array(r.floatle, 3),
    radius: r.floatle,
    color: new r.Array(r.floatle, 4)
});

export class Sphere extends IParametricObject {
    public static variableName: string = 'sphere';
    public static typeName: string = 'Sphere';

    public get variableName(): string { return Sphere.variableName; }
    public get typeName(): string { return Sphere.typeName; }

    protected _allocation: Allocation;

    static bindGroupLayouts: Array<GPUBindGroupLayout> = [];
    static createBindGroupLayouts(device: GPUDevice) {
        console.log('hello from here');
        Sphere.bindGroupLayouts.push(device.createBindGroupLayout({
            entries: [{
                binding: 0,
                visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
                buffer: { type: 'uniform' },
            }]
        }));
    }

    public properties: SphereProperties;

    //#region GPU Code
    public static gpuCodeGlobals: string = `
        struct ${this.typeName} {
            center: vec3<f32>,
            radius: f32,
            color: vec4<f32>,
        };
        
        @group(1) @binding(0) var<uniform> ${this.variableName}: ${this.typeName};
    `;

    public static gpuCodeGetObject: string = ``;
    public static gpuCodeGetObjectUntypedArray: string = `
        let ${this.variableName}: ${this.typeName} = ${this.typeName}(vec3<f32>(words[0], words[1], words[2]), words[3]);
    `;

    static gpuCodeIntersectionTest: string = /* wgsl */`
        fn ray${this.typeName}Intersection(ray: Ray, ${this.variableName}: ${this.typeName}) -> Intersection {
            let oc = ray.origin - ${this.variableName}.center;
            let b = dot( oc, ray.direction );
            let c = dot( oc, oc ) - ${this.variableName}.radius * ${this.variableName}.radius;
            var h = b*b - c;
        
            // no intersection
            if(h < 0.0) {
                return Intersection(
                    -1.0,
                    vec3<f32>(0.0),
                    vec3<f32>(0.0)
                );
            }
            h = sqrt( h );
            let t = -b - h;

            let intersection = camera.position.xyz + t * ray.direction.xyz;
            let normal = normalize(intersection - ${this.variableName}.center);
        
            return Intersection(
                t,
                intersection,
                normal
            );
        }
    `;

    static gpuCodeGetOutputValue(variable: 'color' | 'normal'): string {
        switch (variable) {
            case 'color': {
                // color = sphere.color;
                return `
                    color = vec4<f32>(1.0, 1.0, 1.0, 1.0);
                `;
            }
            case 'normal': {
                return `
                    normal = intersection.normal;
                `;
            }
        }
    }

    static gpuCodeGetBoundingRectangleVertex: string = `
        let boundingRectangleVertex = sphereToBoundingRectangleVertex(${this.variableName}.center.xyz, ${this.variableName}.radius, VertexIndex);
    `;
    //#endregion GPU Code

    public rayIntersection(ray: Ray): number | null {
        return null;
    };

    public toBoundingBoxes(): BoundingBox[] {
        return [];
    }

    private _bindGroup: GPUBindGroup | null = null;

    constructor(id: number, graphicsLibrary: GraphicsLibrary, allocator: Allocator) {
        super(id, graphicsLibrary, allocator);

        this._allocation = allocator.allocate(128);

        this.properties = SphereStruct.fromBuffer(new Uint8Array(128));

        this.onMoved();
    }

    public onMoved() {
        console.log('onMoved', new Float32Array(this._allocation.cpuBuffer));
        this._bindGroup = this._graphicsLibrary.device.createBindGroup({
            layout: Sphere.bindGroupLayouts[0],
            entries: [
                {
                    binding: 0, resource: {
                        buffer: this._allocation.gpuBuffer,
                        offset: this._allocation.allocationRange.offset,
                        size: this._allocation.allocationRange.size,
                    }
                }
            ]
        });
        this.toBuffer(this._allocation.cpuBuffer, this._allocation.allocationRange.offset);
    }

    public record(encoder: GPURenderPassEncoder, bindGroupLayoutsOffset = 1) {
        if (!this._bindGroup) {
            return;
        }

        console.log('record sphere');

        // Set bind group
        encoder.setBindGroup(bindGroupLayoutsOffset + 0, this._bindGroup);

        // Draw
        encoder.draw(4, 1, 0, 0);
    }

    public toBuffer(buffer: ArrayBuffer, offset: number): void {        
        const u8View = new Uint8Array(buffer, offset);
        // console.log('toBuffer', new Float32Array(buffer), u8View);
        u8View.set(SphereStruct.toBuffer(this.properties), 0);
    }
}