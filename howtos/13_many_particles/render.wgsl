struct VertexInput {
  @location(0) pos: vec2f,
  @builtin(instance_index) instance: u32,
};

struct VertexOutput {
  @builtin(position) pos: vec4f,
  @location(0) @interpolate(flat) instance: u32,
  @location(1) uv: vec2f,
  @location(2) alive: f32,
  @location(3) @interpolate(flat) ptype: f32
};

struct Particle {
  pos: vec2f,
  vel: vec2f,
  alive: f32,
  ptype: f32,
  pad: vec2f
};

@group(0) @binding(0) var<uniform> frame: f32;
@group(0) @binding(1) var<uniform> res:   vec2f;
@group(0) @binding(2) var<storage> state: array<Particle>;
@group(0) @binding(4) var backSampler:    sampler;

fn random (st: vec2f) -> f32 {
    return fract(sin(dot(st.xy,
                         vec2(23.3464,71.4587)))
                 * 37581.9748463);
}

@vertex 
fn vs( input: VertexInput ) ->  VertexOutput {
  let aspect = res.y / res.x;
  let p = state[ input.instance ];
  var shape = input.pos;

  let playerAlive = state[0].alive;

  if (p.ptype == 4.0 && playerAlive == 1.0) {
    let angle = frame * 0.05 + f32(input.instance) * 0.3;
    shape = vec2f(shape.x * cos(angle) - shape.y * sin(angle), shape.x * sin(angle) + shape.y * cos(angle));
  }
  if (p.ptype == 3.0 && playerAlive == 1.0) {
    let angle = frame * 0.10 + f32(input.instance) * 0.3;
    shape = vec2f(shape.x * cos(angle) - shape.y * sin(angle), shape.x * sin(angle) + shape.y * cos(angle));
  }

  var size = 0.02;

  

  if (p.ptype == 1.0) {
    size = 0.01;
  }
  else if (p.ptype == 2.0 || p.ptype == 4.0) {
    size = 0.04;
  }
  else if (p.ptype == 3.0) {
    size = 0.1;
  }

  shape *= size;

  var out = VertexOutput();

  out.pos = vec4f(p.pos.x + shape.x * aspect, p.pos.y + shape.y, 0., 1.);
  out.instance = input.instance;
  out.uv = input.pos;
  out.alive = p.alive;
  out.ptype = p.ptype;
  return out;
}

@fragment 
fn fs( input: VertexOutput ) -> @location(0) vec4f {;
  let color = random(vec2f(3.14159*f32( input.instance )));
  var red = 0.;
  var blue = 0.;
  var green = 0.;
  var alpha = 1.;
  if (f32( input.instance) < 1){
    if(input.alive == 1.0){
      blue = 1.0;
      green = 1.0;
    }
    else{
      red = 1.0;
    }
  }
  else {
    blue = 0.439;
    red = 1.0;
    green = 0.129;
    alpha = 0.;
    if (length(input.uv) > 1. && input.ptype != 3.0){
      discard;
    }
    if ((abs(input.uv.x) + 4*abs(input.uv.y) < 1. || 4*abs(input.uv.x) + abs(input.uv.y) < 1.) && input.ptype == 4.0){
      alpha = 1.;
    }
    else if (input.ptype == 3.0){
      if (length(input.uv) < 0.55 || 
      abs((input.uv.x - input.uv.y)/sqrt(2.0)) + 4*abs((input.uv.x + input.uv.y)/sqrt(2.0)) < 1.0 || 
      4*abs((input.uv.x - input.uv.y)/sqrt(2.0)) + abs((input.uv.x + input.uv.y)/sqrt(2.0)) < 1.0 ||
      abs(input.uv.x) + 4*abs(input.uv.y) < 1.0 || 
      4*abs(input.uv.x) + abs(input.uv.y) < 1.0){
        alpha = 1.;
        if (length(input.uv) > 0.2 && length(input.uv) < 0.35){
          alpha = 0.;
        }
      }
    }
    else if (input.ptype != 4.0 && input.ptype != 3.0){
      alpha = 1.;
    }
  }

  return vec4f(red, green, blue, alpha);

}
