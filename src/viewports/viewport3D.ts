import { GraphicsLibrary, OrbitCamera, SmoothCamera } from "..";
import { DeferredPass } from "../rendering";
import { Scene } from "../scene";
import { Viewport } from "./viewport";

export class Viewport3D extends Viewport {
    protected deferredPass: DeferredPass = new DeferredPass(this.graphicsLibrary);

    constructor(graphicsLibrary: GraphicsLibrary, scene: Scene | null = null, camera: OrbitCamera | SmoothCamera | null = null) {
        super(graphicsLibrary, scene, camera);
    }

    async render(textureView: GPUTextureView, frametime: number): Promise<void> {
        super.render(textureView, frametime);

        // Prepare
        const device = this.graphicsLibrary.device;
        const cameraBindGroupLayout = this.graphicsLibrary.bindGroupLayouts.get('camera');

        if (!this._camera || !this._scene || !cameraBindGroupLayout) {
          return;
        }

        const cameraBindGroup = device.createBindGroup({
            layout: cameraBindGroupLayout,
            entries: [{ binding: 0, resource: { buffer: this._camera.bufferGPU } }]
        });

        //#region Render
        const commandEncoder = device.createCommandEncoder();

        const deferredRenderPass = commandEncoder.beginRenderPass({
            colorAttachments: [
                {
                    view: textureView,
                    clearValue: this.backgroundColor,
                    loadOp: 'clear',
                    storeOp: 'store',
                },
            ],
        });
        this.deferredPass.render({ encoder: deferredRenderPass, cameraBindGroup, scene: this._scene });
        deferredRenderPass.end();
        
        const commandBuffer = commandEncoder.finish();


        console.log('submit shit', this.width, this.height);
        //#endregion Render

        // Submit
        device.queue.submit([commandBuffer]);
    }
}