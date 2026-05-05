@group(0) @binding(0) var<uniform> color: vec4f;

@fragment 
fn fs( @builtin(position) pos : vec4f ) -> @location(0) vec4f {
    let red = color[0];
    let green = color[1];
    let blue = color[2];
    let alpha = color[3];

    return vec4f( red, green, blue, alpha);
}