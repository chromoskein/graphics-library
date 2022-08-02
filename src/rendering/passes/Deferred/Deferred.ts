import { GraphicsLibrary } from "../../..";
import { Scene } from "../../../scene";
import { IParametricObject, Sphere } from "../../objects/parametric";
import { Pass, PassRenderSettings } from "../shared";
import { parametricShaderTemplate } from "./ParametricShaderTemplate";

class Pipelines {
    private static _instance: Pipelines;
    private static _lastDeviceUsed: GPUDevice;

    public shaderModules: Map<string, GPUShaderModule>;
    public bindGroupLayouts: Map<string, GPUBindGroupLayout>;
    public pipelineLayouts: Map<string, GPUPipelineLayout>;
    public renderPipelines: Map<string, GPURenderPipeline>;

    private constructor(graphicsLibrary: GraphicsLibrary) {
        const device = graphicsLibrary.device;

        this.shaderModules = new Map();
        this.bindGroupLayouts = new Map();
        this.pipelineLayouts = new Map();
        this.renderPipelines = new Map();

        //#region Graphics Library Requirements
        const cameraBGL = graphicsLibrary.bindGroupLayouts.get('camera');

        if (!cameraBGL) {
            throw "Camera BGL of Graphics Library should have been initialized at this point."
        }
        //#endregion Graphics Library Requirements

        for (const ty of [Sphere]) {
            const shaderCode = parametricShaderTemplate(
                ty.variableName,
                ty.typeName,
                ty.gpuCodeGlobals,
                ty.gpuCodeGetObject,
                ty.gpuCodeGetBoundingRectangleVertex,
                ty.gpuCodeIntersectionTest,
            );

            // console.log(shaderCode);
            const shaderModule = device.createShaderModule({
                label: `DeferredPass-${ty.typeName}`,
                code: shaderCode
            });
            this.shaderModules.set(ty.typeName, shaderModule);

            console.log(ty.bindGroupLayouts);
            console.log([...[cameraBGL], ...ty.bindGroupLayouts]);
            const pipelineLayout = device.createPipelineLayout({
                bindGroupLayouts: [...[cameraBGL], ...ty.bindGroupLayouts],
            });
            this.pipelineLayouts.set(ty.typeName, pipelineLayout);

            this.renderPipelines.set(ty.typeName, device.createRenderPipeline({
                layout: pipelineLayout,
                vertex: {
                    module: shaderModule,
                    entryPoint: "main_vertex",
                },
                fragment: {
                    module: shaderModule,
                    entryPoint: "main_fragment",
                    targets: [// Color
                        {
                            format: navigator.gpu.getPreferredCanvasFormat(),
                        },
                        // World Positions
                        // {
                        //     format: "rgba32float",
                        // },
                        // World Normals
                        // {
                        //     format: 'rgba8unorm',
                        // }
                    ]

                },
                primitive: {
                    topology: 'triangle-strip',
                    stripIndexFormat: 'uint32',
                },
                // depthStencil: {
                //     depthWriteEnabled: true,
                //     depthCompare: 'greater',
                //     format: 'depth32float',
                // },
            }));
        }

        Pipelines._lastDeviceUsed = graphicsLibrary.device;
    }

    public static getInstance(graphicsLibrary: GraphicsLibrary): Pipelines {
        if (this._instance && Pipelines._lastDeviceUsed == graphicsLibrary.device) {
            return this._instance;
        }

        return this._instance = new this(graphicsLibrary);
    }
}

export interface DeferredPassRenderSettings extends PassRenderSettings {
    encoder: GPURenderPassEncoder,
    cameraBindGroup: GPUBindGroup,
    scene: Scene,
}

export class DeferredPass extends Pass {
    private _pipelines: Pipelines;

    constructor(graphicsLibrary: GraphicsLibrary) {
        super();

        this._pipelines = Pipelines.getInstance(graphicsLibrary);
    }

    public render({ encoder, cameraBindGroup, scene }: DeferredPassRenderSettings): void {
        encoder.setBindGroup(0, cameraBindGroup);

        for (const object of scene.objects) {
            if (object instanceof IParametricObject) {
                const pipeline = this._pipelines.renderPipelines.get(object.typeName);

                if (!pipeline) continue;

                encoder.setPipeline(pipeline);
                object.record(encoder, 1);
            }            
        }
    };
}