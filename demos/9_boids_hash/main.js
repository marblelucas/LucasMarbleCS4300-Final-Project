import { default as seagulls } from '../../seagulls.js'
import { default as Mouse }    from '../../helpers/mouse.js'

const sg = await seagulls.init(),
      render_shader  = await seagulls.import( './render.wgsl' ),
      compute_shader = await seagulls.import( './compute.wgsl' )

const NUM_PARTICLES = 2048 * 24, 
      NUM_PROPERTIES = 4, 
      GRID_SIZE = 70,
      state = new Float32Array( NUM_PARTICLES * NUM_PROPERTIES )

const size_str = `const SIZE:f32 = ${GRID_SIZE}.;\n`

for( let i = 0; i < NUM_PARTICLES * NUM_PROPERTIES; i+= NUM_PROPERTIES ) {
  state[ i ] = -.5 + Math.random()
  state[ i + 1 ] = -.5 + Math.random()
  state[ i + 2 ] = -1 + Math.random() * 2
  state[ i + 3 ] = -1 + Math.random() * 2
}

const state_b = sg.buffer( state ),
      frame_u = sg.uniform( 0 ),
      res_u   = sg.uniform([ sg.width, sg.height ]) 

const usage = GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST
const sizes_b  = sg.buffer( new Float32Array(GRID_SIZE*GRID_SIZE), '', usage )

const binsize_shader = await seagulls.import( './binsize_compute.wgsl' )
const state_b2 = sg.buffer( state )

const binIndex = `
fn getBinIndex(position : vec2f) -> i32 {
  // position is -1,1, offset by one and scale by half the bin size
  let binxy = vec2i( 
    i32( max(0,min((1+position.x) * SIZE/2., SIZE-1)) ),
    i32( max(0,min((1+position.y) * SIZE/2., SIZE-1)) ) 
  );

  return binxy.y * i32(SIZE) + binxy.x;
}
`


const sizes = sg.compute({
  shader: size_str + binIndex + binsize_shader,
  data:[
    sg.pingpong(state_b,state_b2),
    sizes_b
  ],
  onframe() { sizes_b.clear() },
  dispatchCount:[NUM_PARTICLES / 64,1,1]
})

const render = await sg.render({
  shader: render_shader,
  data: [
    frame_u,
    res_u,
    state_b
  ],
  onframe() { frame_u.value++ },
  vertices:seagulls.constants.shapes.triangle,
  count: NUM_PARTICLES,
  blend: true
})

const prefix_shader = await seagulls.import( './prefix_compute.wgsl' )
const prefix_b = sg.buffer( new Float32Array(GRID_SIZE*GRID_SIZE + 1), '', usage )
const prefix = sg.compute({
  shader: prefix_shader,
  data:[
    sizes_b,
    prefix_b
  ],
  dispatchCount:[1,1,1]
})

const place_particles_shader = await seagulls.import( './place_compute.wgsl' )
const count_b = sg.buffer( new Float32Array( GRID_SIZE*GRID_SIZE ) )
const place = sg.compute({
  shader: size_str + binIndex + place_particles_shader,
  data:[
    sg.pingpong(state_b2,state_b),
    sizes_b,
    count_b,
    prefix_b
  ],

  dispatchCount:[NUM_PARTICLES / 64,1,1]
})

Mouse.init()
const mouse_u = sg.uniform([0,0,0])
const compute = sg.compute({
  shader: size_str + binIndex + compute_shader,
  data:[
    res_u,
    sg.pingpong(state_b2, state_b),
    sizes_b,
    prefix_b,
    mouse_u
  ],
  dispatchCount:[NUM_PARTICLES / 64,1,1],
  onframe() { mouse_u.value = Mouse.values }
})

sg.run( sizes, prefix, place, compute, render )
//await sg.once( sizes, prefix, place, compute, render )
//console.log( await sizes_b.read( null, 0, Uint32Array ))
