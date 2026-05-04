@group(0) @binding(0) var<uniform> res: vec2f;
@group(0) @binding(1) var<storage> cellState: array<f32>;

@fragment 
fn fs( @builtin(position) input : vec4f ) -> @location(0) vec4f {
  let p    = vec4u(input);
  let resu = vec2u( res );
  let idx  = (p.y * resu.x + p.x) * 2u;
  let b    = cellState[ idx+1u ];

  // light for shadows
  let l_dir = vec2u(2,2);
  let l_idx = ((p.y + l_dir.y) * resu.x + (p.x + l_dir.x)) * 2u;
  var light:f32 = 0.;

  let b1 = cellState[ l_idx + 1u ]; 
  if( b1 > .2 ) { light = (b1 - .2)*4.; }

  return vec4f( (vec3f(.8 - b) + light), 1. );
}
