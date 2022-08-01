struct Sphere {
    center: vec3<f32>,
    radius: f32,
    color: vec4<f32>,
};

struct VertexOutput {
  @builtin(position) Position: vec4<f32>,
};

@group(1) @binding(0) var<uniform> sphere: Sphere;

@vertex
fn main_vertex(@builtin(vertex_index) VertexIndex: u32, @builtin(instance_index) InstanceIndex: u32) -> VertexOutput {
    // 1. Get Object
    // 2. Calculate Bounding Rectangle

    return VertexOutput(
        vec4<f32>(0.0, 0.0, 0.0, 1.0),
    );
}

struct FragmentOutput {
    @location(0) color: vec4<f32>,
};

@fragment
fn main_fragment(@builtin(position) Position : vec4<f32>, ) -> FragmentOutput {
    // 1. Get Ray (predefined)
    // 2. Get Object
    // 3. Intersect (given function)
    // 4. Get values & write them (renderPass asks for and decides!)

    return FragmentOutput(
        vec4<f32>(1.0)
    );
}