import { Allocation } from "../../..";
import { Intersection, Ray } from "../../../shared";
import { ConcreteObject } from "../shared";

export abstract class IParametricObject extends ConcreteObject {   
    public static variableName: string = 'iParametric';
    public static typeName: string = 'IParametric';

    public abstract get variableName(): string;
    public abstract get typeName(): string;

    static bindGroupLayouts: Array<GPUBindGroupLayout> = [];

    //#region CPU Intersection Functions
    public abstract rayIntersection(ray: Ray): number | null;

    //#region GPU Functions for Shader Construction
    public static gpuCodeGlobals: string = ``;

    public static gpuCodeGetObject: string = `let ${this.variableName} = ${this.typeName};`;
    public static gpuCodeGetObjectUntypedArray: string = `
        let ${this.variableName}: ${this.typeName} = ${this.typeName}();
    `;

    /**
     * rayIntersection(ray: Ray, `name`: capitalize(`name`)): -> Intersection;
     * 
     * where
     * 
     * Intersection {
     *  t: f32,
     *  worldPosition: vec3<f32>,
     *  normal: vec3<f32>,
     * }
     */
     public static gpuCodeIntersectionTest: string;

    /**
     * Code should look like:
     * 
     * ```
     *  // ... some retrieval stuff
     *  let color = sphereUniform[instance].color;
     * ```
     */
     public static gpuCodeGetOutputValue(variable: 'color' | 'normal'): string { return ""; };

    /**
     * GPU function that projects this parametric object's bounding rectangle based on current camera.
     * 
     * `name`ToBoundingRectangle(`name`: capitalize(`name`)): -> BoundingRectangle;
     * 
     * where
     * - BoundingRectangle == vec4<vec2<f32>>
     * 
     * acces to globals
     *  - Camera
     */
     public static gpuCodeGetBoundingRectangleVertex: string;
    //#endregion
}
