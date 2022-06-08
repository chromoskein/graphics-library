// The minimunm distance a ray must travel before we consider an intersection.
// This is to prevent a ray from intersecting a surface it just bounced off of.
let minimumRayHitTime: f32 = 0.0001;

// after a hit, it moves the ray this far along the normal away from a surface.
// Helps prevent incorrect intersections when rays bounce off of objects.
let rayNormalNudge: f32 = 0.001;

struct BoundingBox {
  min: vec3<f32>,
  primitive: i32,
  max: vec3<f32>,
};

struct Node {
    boundingBox: BoundingBox,
    firstChildOrPrimitive: i32,
    primitiveCount: i32,
    axis: i32,
};

struct BoundingVolumeHierarchyBuffer {
  nodes: array<Node>,
};


struct PrimitivesBuffer {
    primitives: array<array<f32, 32>>,
};

struct BoundingBoxesBuffer {
    boundingBoxes: array<BoundingBox>,
};


struct Globals {
    ambientOcclusionTaps: i32,
    resetAmbientOcclusion: i32,
};

@group(0) @binding(0) var<uniform> camera: Camera;

@group(1) @binding(0) var<storage, read> primitivesBuffer: PrimitivesBuffer;

@group(2) @binding(0) var<storage, read> bvhBuffer: BoundingVolumeHierarchyBuffer;
@group(2) @binding(1) var<storage, read> boundingBoxesBuffer: BoundingBoxesBuffer;

@group(3) @binding(0) var gBufferColors : texture_storage_2d<rgba8unorm, write>;
@group(3) @binding(1) var gBufferWorldNormals : texture_storage_2d<rgba8unorm, write>;
@group(3) @binding(2) var gBufferAmbientOcclusion : texture_storage_2d<r32float, write>;
@group(3) @binding(3) var<uniform> globals: Globals;

fn rayBoundingBoxInteresction(inverseRay: Ray, boundingBox: BoundingBox) -> bool {
    let t0 = (boundingBox.min - inverseRay.origin) * inverseRay.direction;
    let t1 = (boundingBox.max - inverseRay.origin) * inverseRay.direction;

    let tmin = min(t0, t1);
    let tmax = max(t0, t1);

    return max(tmin.z, max(tmin.x, tmin.y)) <= min(tmax.z, min(tmax.x, tmax.y));
}

struct BoundingBoxIntersection {
  t: f32,
  intersect: bool,
};

fn rayBoundingBoxInteresctionT(inverseRay: Ray, boundingBox: BoundingBox) -> BoundingBoxIntersection {
    let t0 = (boundingBox.min - inverseRay.origin) * inverseRay.direction;
    let t1 = (boundingBox.max - inverseRay.origin) * inverseRay.direction;

    let tmin = min(t0, t1);
    let tmax = max(t0, t1);

    let maxMin = max(tmin.z, max(tmin.x, tmin.y));
    let minMax = min(tmax.z, min(tmax.x, tmax.y));

    return BoundingBoxIntersection(maxMin, maxMin <= minMax);
}

struct Hit {
  t: f32,
  color: vec4<f32>,
};

struct Vertex {
  position: vec4<f32>,
  normal: vec4<f32>,
  color: vec4<f32>,
}

fn rayTriangleIntersection(ray: Ray, vertices: array<Vertex, 3>) -> f32 {
    let v1v0 = vertices[1].position.xyz - vertices[0].position.xyz;
    let v2v0 = vertices[2].position.xyz - vertices[0].position.xyz;
    let rov0 = ray.origin.xyz - vertices[0].position.xyz;


    // The four determinants above have lots of terms in common. Knowing the changing
    // the order of the columns/rows doesn't change the volume/determinant, and that
    // the volume is dot(cross(a,b,c)), we can precompute some common terms and reduce
    // it all to:
    let n = cross(v1v0, v2v0);
    let q = cross(rov0, ray.direction.xyz);
    let d = 1.0 / dot(ray.direction, n);
    let u = d * dot(-q, v2v0);
    let v = d * dot(q, v1v0);
    let t = d * dot(-n, rov0);

    if (u < 0.0 || v < 0.0 || (u + v) > 1.0) {
        return -1.0;
    }

    return t;
}

fn closestRayIntersection(ray: Ray) -> Hit {
    // Create inverse ray
    let inverseRay = Ray(ray.origin, vec3<f32>(
        1.0 / ray.direction.x,
        1.0 / ray.direction.y,
        1.0 / ray.direction.z,
    ));
    var nodesToIntersect = array<i32, 64>(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
    nodesToIntersect[0] = 0;
    var nodesToIntersectLength: i32 = 1;

    var hit = Hit(-1.0, vec4<f32>(0.0, 0.0, 0.0, 0.0));

    loop {
        if (nodesToIntersectLength <= 0) {
          break;
        }

        let nodeIndex = nodesToIntersect[nodesToIntersectLength - 1];
        let node = bvhBuffer.nodes[nodeIndex];
        nodesToIntersectLength = nodesToIntersectLength - 1;

      // Check if ray intersects bounding box of a node
        let boundingBoxIntersection = rayBoundingBoxInteresctionT(inverseRay, node.boundingBox);
        if (boundingBoxIntersection.intersect) {

            if (hit.t > 0.0 && boundingBoxIntersection.t > hit.t) {
              continue;
            }

        // If node is a leaf
            if (node.primitiveCount > 0) {
                for (var i = 0; i < node.primitiveCount; i = i + 1) {
                    let primitiveIndex = boundingBoxesBuffer.boundingBoxes[node.firstChildOrPrimitive + i].primitive;
                    let primitiveArray = primitivesBuffer.primitives[primitiveIndex];
                    let primitiveType: i32 = bitcast
                    <
                    i32>(primitiveArray[31]) ; if (primitiveType == 5) {
                        let v0 = Vertex(
                            vec4<f32>(primitiveArray[0], primitiveArray[1], primitiveArray[2], primitiveArray[3]),
                            vec4<f32>(primitiveArray[12], primitiveArray[13], primitiveArray[14], primitiveArray[15]),
                            unpack4x8unorm(bitcast<u32>(primitiveArray[24]) ) ,
                        );

                        let v1 = Vertex(
                            vec4<f32>(primitiveArray[4], primitiveArray[5], primitiveArray[6], primitiveArray[7]),
                            vec4<f32>(primitiveArray[16], primitiveArray[17], primitiveArray[18], primitiveArray[19]),
                            unpack4x8unorm(bitcast<u32>(primitiveArray[25]) ) ,
                        );

                        let v2 = Vertex(
                            vec4<f32>(primitiveArray[8], primitiveArray[9], primitiveArray[10], primitiveArray[11]),
                            vec4<f32>(primitiveArray[20], primitiveArray[21], primitiveArray[22], primitiveArray[23]),
                            unpack4x8unorm(bitcast<u32>(primitiveArray[26]) ) ,
                        );

                        let t = rayTriangleIntersection(ray, array<Vertex, 3>(v0, v1, v2));

                        if ((t > 0.0 && t < hit.t) || (t > 0.0 && hit.t < 0.0)) {
                            hit.t = t;
                            hit.color = v0.color;
                        }
                    }
                }
            } else {
                nodesToIntersect[nodesToIntersectLength] = node.firstChildOrPrimitive;
                nodesToIntersect[nodesToIntersectLength + 1] = node.firstChildOrPrimitive + 1;

                nodesToIntersectLength = nodesToIntersectLength + 2;
            }
        }
    }

    return hit;
}

@stage(compute) @workgroup_size(16, 16)
fn main(@builtin(global_invocation_id) GlobalInvocationID: vec3<u32>) {
    if (f32(GlobalInvocationID.x) >= camera.viewportSize.x || f32(GlobalInvocationID.y) >= camera.viewportSize.y) {
        return;
    }

  // Fragment in framebuffer/window coordinates
    var fragmentNormalizedSpace: vec4<f32> = vec4<f32>(vec2<f32>(GlobalInvocationID.xy), 0.0, 1.0); 

  // Fragment in NDC coordinates
    fragmentNormalizedSpace.x = (fragmentNormalizedSpace.x / camera.viewportSize.x) * 2.0 - 1.0;
    fragmentNormalizedSpace.y = (1.0 - (fragmentNormalizedSpace.y / camera.viewportSize.y)) * 2.0 - 1.0;

  // Fragment in view space
    var fragmentViewSpace: vec4<f32> = camera.projectionInverse * fragmentNormalizedSpace;
    fragmentViewSpace.z = -1.0;
    fragmentViewSpace.w = 1.0;

  // Fragment in world space
    let fragmentWorldSpace: vec4<f32> = camera.viewInverse * fragmentViewSpace;

  // Ray
    let ray: Ray = Ray(
        camera.position.xyz,
        normalize((fragmentWorldSpace - camera.position).xyz)
    );

    let hit = closestRayIntersection(ray);

    if (hit.t > 0.0) {
        let ray2 = Ray(ray.origin + hit.t * ray.direction + 0.00001 * ray.direction, ray.direction);
        let hit2 = closestRayIntersection(ray2);

        if (hit2.t > 0.0) {
            let ray3 = Ray(ray.origin + hit2.t * ray.direction + 0.00001 * ray.direction, ray.direction);
            let hit3 = closestRayIntersection(ray3);

            if (hit3.t > 0.0) {
                textureStore(gBufferColors, vec2<i32>(GlobalInvocationID.xy), vec4<f32>(0.3 * hit3.color.xyz + 0.3 * (0.3 * hit.color.xyz + 0.3 * hit2.color.xyz), 1.0));
            } else {
                textureStore(gBufferColors, vec2<i32>(GlobalInvocationID.xy), vec4<f32>(0.3 * hit.color.xyz + 0.3 * hit2.color.xyz, 1.0));
            }
        } else {
            textureStore(gBufferColors, vec2<i32>(GlobalInvocationID.xy), vec4<f32>(hit.color.xyz * 0.3, 1.0));
        }
    } else {
        textureStore(gBufferColors, vec2<i32>(GlobalInvocationID.xy), vec4<f32>(0.0, 0.0, 0.0, 1.0));
    }

    

  // if (hitT > 0.0) {
  //   textureStore(gBufferColors, vec2<i32>(GlobalInvocationID.xy), vec4<f32>(color, 1.0));
  //   // textureStore(gBufferWorldPositions, vec2<i32>(GlobalInvocationID.xy), vec4<f32>(intersection, 1.0));
  //   textureStore(gBufferWorldNormals, vec2<i32>(GlobalInvocationID.xy), 0.5 * vec4<f32>(normal, 1.0) + vec4<f32>(0.5));

  //   if (globals.resetAmbientOcclusion == 1) {
  //     textureStore(gBufferAmbientOcclusion, vec2<i32>(GlobalInvocationID.xy), vec4<f32>(0.0));
  //   }    
  // } else {
  //   textureStore(gBufferColors, vec2<i32>(GlobalInvocationID.xy), vec4<f32>(0.0, 0.0, 0.0, 0.0));
  //   // textureStore(gBufferWorldPositions, vec2<i32>(GlobalInvocationID.xy), vec4<f32>(0.0, 0.0, 0.0, 0.0));
  //   textureStore(gBufferWorldNormals, vec2<i32>(GlobalInvocationID.xy), vec4<f32>(0.0, 0.0, 0.0, 0.0));
    
  //   if (globals.resetAmbientOcclusion == 1) {
  //     textureStore(gBufferAmbientOcclusion, vec2<i32>(GlobalInvocationID.xy), vec4<f32>(0.0));
  //   }  
  // }  
}
