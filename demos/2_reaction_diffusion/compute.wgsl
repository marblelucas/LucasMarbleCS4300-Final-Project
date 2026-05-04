@group(0) @binding(0) var<uniform> res: vec2f;
@group(0) @binding(1) var<uniform> coeffs : vec4f;
@group(0) @binding(2) var<storage> statein: array<f32>;
@group(0) @binding(3) var<storage, read_write> stateout: array<f32>;

fn index( cell:vec2u ) -> u32 {
  return (cell.y * u32(res.x) + cell.x) * 2u;
}

fn getState( x:u32, y:u32 ) -> vec2f {
  let idx = index( vec2u( x,y ) );
  return vec2f( statein[ idx ], statein[ idx + 1u ] );
}

@compute
@workgroup_size(8,8,1)

fn cs(@builtin(global_invocation_id) cell:vec3u)  {
  let f=coeffs[0];
  let k=coeffs[1];
  let dA=coeffs[2];
  let dB=coeffs[3];

  let x = cell.x;
  let y = cell.y;
  var state : vec2f = getState( x, y );
  
  var a = state.x;
  var b = state.y;

  state *= -1.;
  state += getState(x - 1u, y) * 0.2;
  state += getState(x - 1u, y-1u) * 0.05;
  state += getState(x, y-1u) * 0.2;
  state += getState(x + 1u, y-1u) * 0.05;
  state += getState(x + 1u, y) * 0.2;
  state += getState(x + 1u, y+1u) * 0.05;
  state += getState(x, y+1u) * 0.2;
  state += getState(x - 1u, y+1u) * 0.05;

  state.r = a + dA * state.r - a * b * b + f * (1.-a);
  state.g = b + dB * state.g + a * b * b - ((k+f) * b);

  let idx = index(cell.xy);
  stateout[ idx ] = state.r;
  stateout[ idx+1u ] = state.g;
}
