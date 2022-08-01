export const cameraStruct: string = /* wgsl */`
    struct Camera {
        projection: mat4x4<f32>,
        projectionInverse: mat4x4<f32>,
        view: mat4x4<f32>,
        viewInverse: mat4x4<f32>,
        projectionView: mat4x4<f32>,
        projectionViewInverse: mat4x4<f32>,
        normalMatrix: mat4x4<f32>,
        position: vec4<f32>,
        viewportSize: vec2<f32>,
    };
`;

export const rayTracingStructs: string = /* wgsl */`
    struct Ray {
        origin: vec3<f32>,
        direction: vec3<f32>,
    };

    struct Intersection {
        t: f32,
        position: vec3<f32>,
        normal: vec3<f32>,
    };
`;

export const sphereToBoundingRectangleFunction: string = /* wgsl */`
    const D: mat4x4<f32> = mat4x4<f32>(
        vec4<f32>(1.0, 0.0, 0.0, 0.0),
        vec4<f32>(0.0, 1.0, 0.0, 0.0),
        vec4<f32>(0.0, 0.0, 1.0, 0.0),
        vec4<f32>(0.0, 0.0, 0.0, -1.0)
    );

    // Find quadratic roots
    fn quadraticRoots(a: f32, b: f32, c: f32) -> vec2<f32> {
        return vec2<f32>(
        ( -b - sqrt( b * b - 4.0 * a * c ) ) / ( 2.0 * a ),
        ( -b + sqrt( b * b - 4.0 * a * c ) ) / ( 2.0 * a )
        );
    }

    fn sphereToBoundingRectangleVertex(position: vec3<f32>, radius: f32, vertex: u32) -> vec2<f32> {
        let T: mat4x4<f32> = mat4x4<f32>(
            vec4<f32>(radius, 0.0, 0.0, 0.0),
            vec4<f32>(0.0, radius, 0.0, 0.0),
            vec4<f32>(0.0, 0.0, radius, 0.0),
            vec4<f32>(position.x, position.y, position.z, 1.0)
        );
    
        let R: mat4x4<f32> = transpose(camera.projectionView * T);
    
        let roots_horizontal: vec2<f32> = quadraticRoots(dot(R[3], D * R[3]), -2.0 * dot(R[0], D * R[3]), dot(R[0], D * R[0]));
        let half_width: f32 = abs(roots_horizontal.x - roots_horizontal.y) * 0.5;
    
        let roots_vertical: vec2<f32> = quadraticRoots(dot(R[3], D * R[3]), -2.0 * dot(R[1], D * R[3]), dot(R[1], D * R[1]));
        let half_height: f32 = abs(roots_vertical.x - roots_vertical.y) * 0.5;
    
        var center: vec4<f32> = vec4<f32>(dot(R[0], D * R[3]), dot(R[1], D * R[3]), 0.0, dot(R[3], D * R[3]));
        center.x = center.x / center.w;
        center.y = center.y / center.w;

        let half_size = vec2<f32>(half_width, half_height);

        var corner: vec2<f32>;
        switch(vertex) {
          case 0: {
            corner = center.xy + vec2<f32>(-half_size.x, half_size.y);
          }
          case 1: {
            corner = center.xy +  vec2<f32>(half_size.x, half_size.y);
          }
          case 2: {
            corner = center.xy + vec2<f32>(-half_size.x, -half_size.y);
          }
          default: { // 3
            corner = center.xy + vec2<f32>(half_size.x, -half_size.y);
          }
        }
    
        return corner;
    }
`;

export const fragmentToRayFunction: string = /* wgsl */`
    fn fragmentSpaceToRay(position: vec4<f32>) -> Ray {
      // Fragment in framebuffer/window coordinates
      var fragmentNormalizedSpace: vec4<f32> = vec4<f32>(position.xyz, 1.0); 
    
      // Fragment in NDC coordinates
      fragmentNormalizedSpace.x = (fragmentNormalizedSpace.x / camera.viewportSize.x) * 2.0 - 1.0;
      fragmentNormalizedSpace.y = (1.0 - (fragmentNormalizedSpace.y / camera.viewportSize.y)) * 2.0 - 1.0;
    
      // Fragment in view space
      var fragmentViewSpace: vec4<f32> = camera.projectionInverse * fragmentNormalizedSpace;
      fragmentViewSpace.z = -1.0;
      fragmentViewSpace.w = 1.0;
    
      // Fragment in word space
      let fragmentWorldSpace: vec4<f32>  = camera.viewInverse * fragmentViewSpace;
    
      // Ray
      return Ray(
        camera.position.xyz,
        normalize((fragmentWorldSpace - camera.position).xyz)
      );
    }
`;

export const parametricShaderTemplate = (
    name: string,
    typeName: string,
    globals: string,
    getObject: string,
    getBoundingRectangleVertexFunction: string,
    rayIntersectionFunction: string,

) => {
    return /* wgsl */`
${cameraStruct}

@group(0) @binding(0) var<uniform> camera: Camera;

${rayTracingStructs}

${fragmentToRayFunction}
${sphereToBoundingRectangleFunction}

${globals}

${rayIntersectionFunction}


struct VertexOutput {
    @builtin(position) Position: vec4<f32>,
};

@vertex
fn main_vertex(
    @builtin(vertex_index) VertexIndex: u32, 
    @builtin(instance_index) InstanceIndex: u32) 
-> VertexOutput {
    ${getObject}
    ${getBoundingRectangleVertexFunction}

    return VertexOutput(
        vec4<f32>(boundingRectangleVertex.xy, 0.5, 1.0),
    );
}

struct FragmentOutput {
    @location(0) color: vec4<f32>,
};

@fragment
fn main_fragment(
    @builtin(position) Position : vec4<f32>
) -> FragmentOutput {
    // 1. Get Ray (predefined)
    let ray = fragmentSpaceToRay(Position);

    // 2. Get Object
    ${getObject}

    // 3. Intersect (given function)
    let intersection = ray${typeName}Intersection(ray, ${name});

    if (intersection.t < 0.0) {
        discard;
    }

    var depth: vec4<f32> = camera.projectionView * vec4<f32>(intersection.position, 1.0);
    depth = depth * (1.0 / depth.w);

    // 4. Get values & write them (renderPass asks for and decides!)

    return FragmentOutput(
        // depth.z,
        vec4<f32>(1.0)
    );
}
`};
