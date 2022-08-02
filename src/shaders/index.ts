// import math from "./math.wgsl";
// import rayTracing from "./ray_tracing.wgsl";

// import primitivesShared from "./primitives/shared.wgsl";
// import { spheres } from "./primitives/spheres";
// import { cylinders } from "./primitives/cylinders";
// import primitiveBeziers from "./beziers.wgsl";
// import { beziers } from "./primitives/beziers";
// import { aabbs } from "./primitives/aabbs";
// import { roundedCones } from "./primitives/rounded_cones";
// import { triangles } from "./primitives/triangles";

// import rayTracingGBuffer from "./raytrace_gbuffer.wgsl";
// import rayTracingAmbientOcclusion from "./raytrace_ao.wgsl";

// import passthrough from "./util/passthrough.wgsl";
// import renderGBuffer from "./util/render_gbuffer.wgsl";

// import tadmap from "./2d/tadmap.wgsl";
// import distanceMap from "./2d/distance_map.wgsl";

// import ssao from "./postprocess/ssao.wgsl";
// import aoBlur from "./postprocess/ssao_blur.wgsl";
// import ssaoJoin from "./postprocess/ssao_join.wgsl";

// export interface ShaderModules {
//     [key: string]: GPUShaderModule;
// }

// export function createShaderModules(device: GPUDevice): ShaderModules {
//     // console.time('createShaderModules');

//     const primitivesBase = math + rayTracing + primitivesShared;

//     const shaders = {
//         passthrough: device.createShaderModule({ code: passthrough }),
//     };

//     // console.timeEnd('createShaderModules');

//     return shaders;
// }
