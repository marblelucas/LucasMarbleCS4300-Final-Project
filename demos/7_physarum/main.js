import { default as seagulls } from '../../seagulls.js'
import { default as Mouse } from '../../helpers/mouse.js'

const AGENT_ROOT       = 2048+512,
      NUM_AGENTS       = AGENT_ROOT * AGENT_ROOT,
      W                = window.innerWidth,
      H                = window.innerHeight,
      WORKGROUP_SIZE   = 8,
      dc               = AGENT_ROOT,
      DISPATCH_COUNT   = [ dc/8,dc/8, 1 ],
      DISPATCH_COUNT_2 = [ Math.ceil(W/8), Math.ceil(H/8), 1 ],
      LEFT = .2, RIGHT = .6,
      FADE = .0125

const st = 'rgba16float'

const render_shader = seagulls.constants.vertex + `
struct VertexInput {
  @location(0) pos: vec2f,
  @builtin(instance_index) instance: u32,
}

@group(0) @binding(0) var sampler1 : sampler;
@group(0) @binding(1) var pheromones: texture_2d<f32>;

@fragment 
fn fs( @builtin(position) pos : vec4f ) -> @location(0) vec4f {
  let grid_pos = pos.xy / vec2f(${W}.,${H}.);
  
  return textureSample( pheromones, sampler1, grid_pos) * 4.;
}`

const compute_shader =`
struct Vant {
  pos: vec2f,
  dir: vec2f,
}

@group(0) @binding(0) var<uniform> mouse: vec3f;
@group(0) @binding(1) var<uniform> frame: f32;
@group(0) @binding(2) var<storage, read_write> vants: array<Vant>;
@group(0) @binding(3) var mysampler: sampler;
@group(0) @binding(4) var pheromones_in: texture_2d<f32>;
@group(0) @binding(5) var pheromones_out: texture_storage_2d<${st}, write>;

fn vantIndex( cell:vec3u ) -> u32 {
  let size = ${WORKGROUP_SIZE}u * ${dc}u;
  return cell.x + (cell.y * size) + (cell.z * size * size); 
}

fn readSensor( pos:vec2f, dir:vec2f, angle:f32, distance:vec2f ) -> f32 {
  let read_dir = rotate( dir, angle ); 
  let offset   = read_dir * distance;
  
  return textureSampleLevel( pheromones_in, mysampler, pos + offset, 0. ).g;
}

fn rotate(dir:vec2f, angle:f32) -> vec2f {
  let  s = sin( angle );
  let  c = cos( angle );
  let  m = mat2x2<f32>( c, -s, s, c );
  return m * dir;
}

fn rand2D(co : vec2f) -> f32 {
  return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
}
 
@compute
@workgroup_size(${WORKGROUP_SIZE}, ${WORKGROUP_SIZE},1)

fn cs(@builtin(global_invocation_id) cell:vec3u)  {
  let turn = ${Math.PI/10};
  let index     = vantIndex( cell );
  var vant:Vant = vants[ index ];

  if( mouse.z == 1. ) {
    vant.dir = rotate( vant.dir, ${Math.PI} ); 
    vant.pos = vec2f(.5,.5);
  } 

  let res = vec2f(${W}., ${H}.);
  let pixel = 1. / res;
  let dist  = pixel*3;
  let sensorDistance = dist*2; 

  let pos = vant.pos;

  let left     = readSensor( pos, vant.dir, -turn, sensorDistance );
  let forward  = readSensor( pos, vant.dir, 0.,    sensorDistance );
  let right    = readSensor( pos, vant.dir, turn,  sensorDistance );
  
  let rand = fract( sin( vant.pos.x ) * 100000.0 );
  if( rand > .95 ) {
    vant.dir = rotate( vant.dir, turn * rand );
  }else if( left > forward && left > right ) {
    vant.dir = rotate( vant.dir, -turn ); 
  }else if( right > left && right > forward ) { 
    vant.dir = rotate( vant.dir, turn);
  }else if ( right == left ) { 
    if( rand > .5 ) {
      vant.dir = rotate( vant.dir, turn); 
    }else{
      vant.dir = rotate( vant.dir, -turn);
    }
  }
  
  var d:f32 = distance( pos, mouse.xy );
  var s:f32 = dot( .5+vant.dir*.5, vant.pos-mouse.xy);
  var o:vec2f = vec2f(0.,0.);
  if( d < .05 ) { 
    vant.dir -= (mouse.xy - pos)*8.;
    vant.dir = normalize( vant.dir );
  }

  vant.pos += (vant.dir+o) * dist;

  if( vant.pos.x < 0 ) { vant.pos.x = .0; vant.dir = rotate( vant.dir, ${Math.PI} ); }
  if( vant.pos.y < 0 ) { vant.pos.y = .0; vant.dir = rotate( vant.dir, ${Math.PI} ); } 

  if( vant.pos.x > 1 ) { vant.pos.x = 1; vant.dir = rotate( vant.dir, ${Math.PI}); }
  if( vant.pos.y > 1 ) { vant.pos.y = 1; vant.dir = rotate( vant.dir, ${Math.PI}); }

  let current = textureSampleLevel( pheromones_in, mysampler, vant.pos, 0. );

  let val = vec4f(
    min(current.r + .01,.8),
    min(current.g + .01,.8),
    min(current.b + .01,.8),
    1.
  );

  textureStore( 
    pheromones_out, 
    vec2u( (vant.pos % 1.) * res ), 
    val 
  );

  vants[ index ] = vant;
}`

const compute2 = `
@group(0) @binding(0) var samp: sampler;
@group(0) @binding(1) var pheromones: texture_2d<f32>;
@group(0) @binding(2) var pheromones_write: texture_storage_2d<${st}, write>;

fn getP( x:u32,y:u32 ) -> f32 {
  return textureLoad( pheromones, vec2u(x,y), 0 ).r;
}

@compute
@workgroup_size(${WORKGROUP_SIZE}, ${WORKGROUP_SIZE},1)

fn cs(@builtin(global_invocation_id) cell:vec3u)  {
  let x = cell.x;
  let y = cell.y;

  let s = getP(x,y);
  var state:f32 = getP( x,y ) * .925;
  state += getP(x - 1u, y) * 0.0125;
  state += getP(x - 1u, y - 1u) * 0.00525;
  state += getP(x, y - 1u) * 0.0125;
  state += getP(x + 1u, y - 1u) * 0.00525;
  state += getP(x + 1u, y) * 0.0125;
  state += getP(x + 1u, y + 1u) * 0.00525;
  state += getP(x, y + 1u ) * 0.0125;
  state += getP(x - 1u, y + 1u) * 0.00525;
  state *= .975;
  textureStore( pheromones_write, cell.xy, vec4f( state,0.,state,1. ));
}
`
 
Mouse.init()

const NUM_PROPERTIES = 4 // must be evenly divisble by 4!
const pheromones   = new Uint8Array( W*H ) // hold pheromone data
const vants        = new Float32Array( NUM_AGENTS * NUM_PROPERTIES ) // hold vant info

let TAU = Math.PI * 2
for( let i = 0; i < NUM_AGENTS; i++ ) {
  const xdir = .5 + Math.cos((i/NUM_AGENTS) * TAU) * .3 //(W/3)
  const ydir = .5 + Math.sin((i/NUM_AGENTS) * TAU) * .3 //(H/3)

  vants[ (i*4) ]   = .5
  vants[ (i*4)+1 ] = .5
 
  vants[ (i*4)+2 ] = -1+Math.random()*2
  vants[ (i*4)+3 ] = -1+Math.random()*2
}

const sg = await seagulls.init()
const texdata = new Float32Array( seagulls.width * seagulls.height * 4 )
const pheromones_t  = sg.texture( texdata, st )
const pheromones_t1 = sg.storageTexture( texdata, st )
const vants_b = sg.buffer( vants )
const mouse_u = sg.uniform( Mouse.values )
const frame_u = sg.uniform( 0 )
const pheromones_p = sg.pingpong( pheromones_t, pheromones_t1 )

const render = await sg.render({
  shader: render_shader,
  data:[
    sg.sampler({ magFilter:'linear', maxFilter:'linear' }),
    pheromones_p
  ],
  blend:true
})

let frame = 0

const sim = sg.compute({
  shader:compute_shader,
  data:[
    mouse_u,
    frame_u,
    vants_b,
    sg.sampler({ minFilter:'linear', magFilter:'linear' }),
    pheromones_p
  ],
  dispatchCount:DISPATCH_COUNT,
  onframe() { 
    mouse_u.value = Mouse.values
    frame_u.value = frame++
  }
})

const diffuse = sg.compute({
  shader:compute2,
  data:[
    sg.sampler({ minFilter:'linear', magFilter:'linear' }),
    pheromones_p
  ],
  dispatchCount: DISPATCH_COUNT_2
})


sg.run( diffuse, sim, render )
