import { default as seagulls } from '../../seagulls.js'

const WORKGROUP_SIZE = 64,
      NUM_AGENTS = 128,
      DISPATCH_COUNT = [NUM_AGENTS/WORKGROUP_SIZE,1,1],
      GRID_SIZE = 4,
      STARTING_AREA = .3

const W = Math.round( window.innerWidth  / GRID_SIZE ),
      H = Math.round( window.innerHeight / GRID_SIZE )

const render_shader = seagulls.constants.vertex + `
@group(0) @binding(0) var<storage> pheromones: array<f32>;
@group(0) @binding(1) var<storage> render: array<f32>;

@fragment 
fn fs( @builtin(position) pos : vec4f ) -> @location(0) vec4f {
  let grid_pos = floor( pos.xy / ${GRID_SIZE}.);
  
  let pidx = grid_pos.y  * ${W}. + grid_pos.x;
  let p = pheromones[ u32(pidx) ];
  let v = render[ u32(pidx) ];

  var color = vec3(p);

  let ptype = abs(p);

  if (ptype == 1.) {
    color = vec3(0., 1., 1.);
  } else if (ptype == 2.) {
    color = vec3(1., 0., 1.);
  } else if (ptype == 3.) {
    color = vec3(1., 1., 0.);
  }

  if (v == 1.) {
    color = vec3(1., 0., 0.);
  } else if (v == 2.) {
    color = vec3(0., 1., 0.);
  } else if (v == 3.) {
    color = vec3(0., 0., 1.);
  }

  return vec4f(color, 1.);
}`

const compute_shader =`
struct Vant {
  pos: vec2f,
  dir: f32,
  flag: f32
}

@group(0) @binding(0) var<storage, read_write> vants: array<Vant>;
@group(0) @binding(1) var<storage, read_write> pheremones: array<f32>;
@group(0) @binding(2) var<storage, read_write> render: array<f32>;

fn pheromoneIndex( vant_pos: vec2f ) -> u32 {
  let width = ${W}.;
  return u32( abs( vant_pos.y % ${H}. ) * width + vant_pos.x );
}

@compute
@workgroup_size(${WORKGROUP_SIZE},1,1)

fn cs(@builtin(global_invocation_id) cell:vec3u)  {
  let pi2   = ${Math.PI*2}; 
  var vant:Vant  = vants[ cell.x ];

  let pIndex    = pheromoneIndex( vant.pos );
  let pheromone = pheremones[ pIndex ];

  let state = pheromone > 0.; // current binary state

  

  if (vant.flag == 0. && !state) {
    
    let goRight = fract(sin(f32(cell.x) * 482.2439) * 68347.23947) > 0.5;
    
    vant.dir = select(0.75, 0.25, goRight);

  }
  else if(vant.flag == 1. && !state) {

    let goUp = fract(sin(f32(cell.x) * 482.2439) * 68347.23947) > 0.5;
    
    vant.dir = select(0., 0.5, goUp);

  }
  else if(vant.flag == 2. && !state) {

  let rot = fract(sin(f32(cell.x) * 482.2439) * 68347.23947);

  if (rot < 0.25) {
    vant.dir = 0.125;
  } 
  else if (rot < 0.5) {
    vant.dir = 0.375;
  } 
  else if (rot < 0.75) {
    vant.dir = 0.625;
  } 
  else {
    vant.dir = 0.875;
  }

  }
  else if(vant.flag + 1 != pheromone) {
    vant.dir += 0.25;
  } 
  else {
    vant.dir -= 0.25;
  } 
  

  let dir = vec2f( sin( vant.dir * pi2 ), cos( vant.dir * pi2 ) );
  
  vant.pos = round( vant.pos + dir ); 

  vants[ cell.x ] = vant;
  
  if (pheromone != 0.) {
    pheremones[pIndex] = 0.;
  } else {
    pheremones[pIndex] = vant.flag + 1.;
  }

  render[pIndex] = vant.flag + 1.;
}`
 
const NUM_PROPERTIES = 4 // must be evenly divisble by 4!
const pheromones   = new Float32Array( W*H ) // hold pheromone data
const vants_render = new Float32Array( W*H ) // hold info to help draw vants
const vants        = new Float32Array( NUM_AGENTS * NUM_PROPERTIES ) // hold vant info

const offset = .5 - STARTING_AREA / 2
for( let i = 0; i < NUM_AGENTS * NUM_PROPERTIES; i+= NUM_PROPERTIES ) {
  vants[ i ]   = Math.floor( (offset+Math.random()*STARTING_AREA) * W ) // x
  vants[ i+1 ] = Math.floor( (offset+Math.random()*STARTING_AREA) * H ) // y
  vants[ i+2 ] = 0 // direction 
  vants[i+3] = Math.floor(Math.random() * 3) // vant behavior type 
}

const sg = await seagulls.init()
const pheromones_b = sg.buffer( pheromones )
const vants_b  = sg.buffer( vants )
const render_b = sg.buffer( vants_render )

const render = await sg.render({
  shader: render_shader,
  data:[
    pheromones_b,
    render_b
  ],
})

const compute = sg.compute({
  shader: compute_shader,
  data:[
    vants_b,
    pheromones_b,
    render_b
  ],
  onframe() { render_b.clear() },
  dispatchCount:DISPATCH_COUNT
})

sg.run( compute, render )


