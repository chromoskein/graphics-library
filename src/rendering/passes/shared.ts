export interface PassRenderSettings {
    encoder: GPURenderPassEncoder | GPUComputePassEncoder | GPUCommandEncoder | null,
}

export abstract class Pass {
    // Called before the frame before command encoding begins
    public beforeRender(): void {};

    // Called during rendering
    // Either needs a compute or render pass encoders
    // If this render pass middleware actually needs multiple passes then the argument type is of GPUCommandEncoder
    public render(settings: PassRenderSettings): void {};

    // Called at the end of the frame after all the commands buffers generated are submitted to a queue
    public afterRender(): void {};

    //
    public onResize(width: number, height: number): void {};
}