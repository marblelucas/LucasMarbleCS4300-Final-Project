@group(0) @binding(0) var rendBuffer:     texture_2d<f32>;
@group(0) @binding(1) var backBuffer:     texture_2d<f32>;
@group(0) @binding(4) var backSampler:    sampler;

@fragment 
fn fs( @builtin(position) pos : vec4f ) -> @location(0) vec4f {
    let render = textureLoad(rendBuffer, vec2u(pos.xy), 0);
    let background = textureLoad(backBuffer, vec2u(pos.xy), 0);

    

    return mix(background, render, render.a);
}