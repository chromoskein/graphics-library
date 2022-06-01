export const triangles = (writeDepth: boolean) => {
  return /* wgsl */`

//
// struct BufferVertex {
//     position: vec4<f32>,
//     normal: vec4<f32>,
//     color: u32,
// }

//
struct BufferTriangle {
  position0: vec4<f32>,
  position1: vec4<f32>,
  position2: vec4<f32>,

  normal0: vec4<f32>,
  normal1: vec4<f32>,
  normal2: vec4<f32>,

  color0: u32,
  color1: u32,
  color2: u32,

  padding: array<f32, 4>,

  ty: i32,
};


struct TrianglesBuffer {
    triangles: array<BufferTriangle>,
};

@group(0) @binding(0) var<uniform> camera: Camera;
@group(1) @binding(0) var<storage, read> trianglesBuffer: TrianglesBuffer;
@group(2) @binding(0) var<storage, read> cullObjectsBuffer: CullObjectsBuffer;

${writeDepth ? '' : '@group(3) @binding(0) var gBufferDepth : texture_depth_2d;'} 

struct VertexOutput {
  @builtin(position) Position : vec4<f32>,
  @location(0) color : vec4<f32>,
  @location(1) normal : vec3<f32>,
};

@stage(vertex)
fn main_vertex(@builtin(vertex_index) VertexIndex : u32) -> VertexOutput {
  let triangle: BufferTriangle = trianglesBuffer.triangles[VertexIndex / u32(3)]; // .vertices[VertexIndex % u32(3)]

  var position = triangle.position0;
  switch(i32(VertexIndex) % i32(3)) {
    case 1: { position = triangle.position1; }
    case 2: { position = triangle.position2; }
    default: {}
  }

  var color = triangle.color0;
  switch(i32(VertexIndex) % i32(3)) {
    case 1: { color = triangle.color1; }
    case 2: { color = triangle.color2; }
    default: {}
  }
  let colorUnpacked = unpack4x8unorm(color);

  let u = (triangle.position1 - triangle.position0).xyz;
  let v = (triangle.position2 - triangle.position1).xyz;

  var n = normalize(cross(u, v));

  if (dot(n, normalize(camera.position.xyz - position.xyz)) < 0.0) {
    n = -n;
  }

  return VertexOutput(
    vec4<f32>(camera.projectionView * position), 
    colorUnpacked,
    n,
  );
}

struct FragmentOutput {
  @location(0) color : vec4<f32>,
  ${writeDepth ? '@location(1) worldNormal : vec4<f32>,' : ''}
};

@stage(fragment)
fn main_fragment(
  @location(0) color : vec4<f32>, 
  @location(1) normal : vec3<f32>,
) -> FragmentOutput {
  return FragmentOutput(
    color,
    ${writeDepth ? '0.5 * vec4<f32>(normal.xyz, 1.0) + vec4<f32>(0.5),' : ''}
  );  
}
`};