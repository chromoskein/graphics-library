import { OrbitCamera, SmoothCamera } from "../cameras/index";
import { Scene } from "../scene";
import { GraphicsLibrary } from "..";

export abstract class Viewport {
  protected graphicsLibrary: GraphicsLibrary;

  protected width = 0;
  protected height = 0;

  protected _scene: Scene | null;
  protected _camera: OrbitCamera | SmoothCamera | null = null;

  //#region Options
  public backgroundColor: GPUColorDict = { r: 0.2, g: 1.0, b: 1.0, a: 1.0 };
  //#endregion

  protected _lastFrametime = 0;
  protected _outputTexture: GPUTexture | null = null;

  //#region Dirty Tracking
  // Dirty is set to false at the end of a frame
  // Dirty is set to true when:
  // - resize is called
  // - backgroundColor is modified
  // - outside source calls dirty (for example because camera was modified)
  public dirty = true;

  protected _cameraVersionUsed: number = 0;
  protected _sceneVersionUsed: number = 0;
  //#endregion Dirty Tracking

  //#region Modules
  //#endregion Modules

  constructor(
    graphicsLibrary: GraphicsLibrary,
    scene: Scene | null = null,
    camera: OrbitCamera | SmoothCamera | null = null) {
    this.graphicsLibrary = graphicsLibrary;

    this._camera = camera ?? new OrbitCamera(this.graphicsLibrary.device, this.width, this.height);
    this._scene = scene ?? graphicsLibrary.createScene();
  }

  public deallocate(): void {
    this._scene?.deallocate();

    this.width = 0;
    this.height = 0;

    this._camera = null;
    this._scene = null;
  }

  public resize(width: number, height: number): void {
    const devicePixelRatio = window.devicePixelRatio || 1.0;

    this.width = width;
    this.height = height;

    const size = {
      width: this.width,
      height: this.height,
    };

    if (width <= 0 || height <= 0) {
      return;
    }

    // this._outputTexture = this.graphicsLibrary.device.createTexture({
    //   size,
    //   format: navigator.gpu.getPreferredCanvasFormat(),
    //   usage: GPU
    // });

    if (this._camera) {
      this._camera.width = this.width;
      this._camera.height = this.height;
    }

    this.dirty = true;
  }

  async render(textureView: GPUTextureView, frametime: number): Promise<void> {
    const device = this.graphicsLibrary.device;

    //~ Compute Delta Time
    const dt = frametime - this._lastFrametime;
    this._lastFrametime = frametime;

    if (this._camera == null || this._scene == null) {
      // const commandEncoder = device.createCommandEncoder();
      // const passthroughPassEncoder = commandEncoder.beginRenderPass({
      //   colorAttachments: [
      //     {
      //       view: textureView,
      //       clearValue: this.backgroundColor,
      //       loadOp: 'clear',
      //       storeOp: 'store',
      //     },
      //   ],
      // });
      // passthroughPassEncoder.end();
      // const commandBuffer = commandEncoder.finish();

      // device.queue.submit([commandBuffer]);

      return;
    }

    if (this._camera instanceof SmoothCamera) {
      this._camera.updateCPU(dt); //~ DK: this is because in OrbitCamera updateCPU is protected and in SmoothCamera it's public and I need to call it here every frame
    }

    const dirty = this.dirty || this._scene.version > this._sceneVersionUsed || this._camera.version > this._cameraVersionUsed;

    // if (!dirty) {
    //   const commandEncoder = device.createCommandEncoder();
    //   const passthroughPassEncoder = commandEncoder.beginRenderPass({
    //     colorAttachments: [
    //       {
    //         view: this._outputTexture.createView(),
    //         clearValue: this.backgroundColor,
    //         loadOp: 'load',
    //         storeOp: 'store',
    //       },
    //     ],
    //   });
    //   passthroughPassEncoder.end();
    //   const commandBuffer = commandEncoder.finish();
  
    //   console.log('submit shit', this.width, this.height);
  
    //   device.queue.submit([commandBuffer]);

    //   return;
    // }

    this._camera.updateGPU(device.queue);
    this._scene.uploadModified(device.queue);

    this._sceneVersionUsed = this._scene.version;
    this._cameraVersionUsed = this._camera.version;
    this.dirty = false;

    // Fill in derived viewport
  }

  public set scene(scene: Scene | null) {
    this._scene = scene;
  }

  public get scene(): Scene | null {
    return this._scene;
  }

  public set camera(camera: OrbitCamera | SmoothCamera | null) {
    if (camera == this._camera) {
      return;
    }

    this._camera = camera;
  }

  public get camera(): OrbitCamera | SmoothCamera | null {
    return this._camera;
  }
}
