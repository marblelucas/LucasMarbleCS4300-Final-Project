import { default as seagulls } from '../../seagulls.js'

const sg = await seagulls.init(),
      render_shader  = await seagulls.import( './render.wgsl' ),
      compute_shader = await seagulls.import( './compute.wgsl' )

const NUM_PARTICLES = 32, 
      NUM_PROPERTIES = 8, 
      state = new Float32Array( NUM_PARTICLES * NUM_PROPERTIES )

for( let i = 0; i < NUM_PARTICLES * NUM_PROPERTIES; i+= NUM_PROPERTIES ) {
  state[i] = -1 + Math.random() * 2
  state[i + 1] = -1 + Math.random() * 2
  state[i + 2] = -1 + Math.random() * 2
  state[i + 3] = -1 + Math.random() * 2
  state[i + 4] = 1.0 
  state[i + 5] = 0.0 
  state[i + 6] = 0.0 
  state[i + 7] = 0.0 
}

state[0] = 0;
state[1] = 0;
state[2] = 0;
state[3] = 0;

const usage = GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST

const state_b = sg.buffer( state, '', usage ),
      frame_u = sg.uniform( 0 ),
      res_u   = sg.uniform([ sg.width, sg.height ]),
      x_move  = sg.uniform( 0 ),
      y_move  = sg.uniform( 0 ),
      mode   = sg.uniform( 0 )

window.addEventListener('keydown', (e) => {
  if (e.code === 'KeyD') x_move.value = 2.0;
});

window.addEventListener('keyup', (e) => {
  if (e.code === 'KeyD') x_move.value = 0.0;
});

window.addEventListener('keydown', (e) => {
  if (e.code === 'KeyA') x_move.value = -2.0;
});

window.addEventListener('keyup', (e) => {
  if (e.code === 'KeyA') x_move.value = 0.0;
});

window.addEventListener('keydown', (e) => {
  if (e.code === 'KeyW') y_move.value = 2.0;
});

window.addEventListener('keyup', (e) => {
  if (e.code === 'KeyW') y_move.value = 0.0;
});

window.addEventListener('keydown', (e) => {
  if (e.code === 'KeyS') y_move.value = -2.0;
});

window.addEventListener('keyup', (e) => {
  if (e.code === 'KeyS') y_move.value = 0.0;
});

setInterval(() => {
  mode.value = (mode.value + 1) % 4;
  
  document.getElementById('mode').textContent = "Straight";
  switch (mode.value){
    case 0:
      document.getElementById('mode').textContent = 'Straight';
      break;
    case 1:
      document.getElementById('mode').textContent = 'Orbit';
      break;
    case 2:
      document.getElementById('mode').textContent = 'Pursuit';
      break;
    case 3:
      document.getElementById('mode').textContent = 'Ricochet';
      break;
  }

}, 5000);

var seconds = 0;

function increaseTimer(){
  seconds++;

  var min = Math.floor(seconds/60);
  var sec = seconds % 60;

  const clock =
    String(min).padStart(2, '0') + ':' +
    String(sec).padStart(2, '0');

  document.getElementById('timer').textContent = clock;
}

const timer = setInterval(increaseTimer, 1000);

const checker = setInterval(checkPlayerAlive, 100);

const render = await sg.render({
  shader: render_shader,
  data: [
    frame_u,
    res_u,
    state_b,
  ],
  onframe() { frame_u.value++ },
  count: NUM_PARTICLES,
  blend: true
})

const WORKGROUP_SIZE = 8
const dc = Math.ceil( NUM_PARTICLES / WORKGROUP_SIZE )

const compute = sg.compute({
  shader: compute_shader,
  data:[
    res_u,
    state_b,
    x_move,
    y_move,
    mode
  ],
  dispatchCount: [ dc, 1, 1 ] 

})

async function checkPlayerAlive() {
  

  const alive = await state_b.read(null, 0, Float32Array);

  console.log(alive[4]);

  if (alive[4] === 0) {
    clearInterval(timer);
  }
}

sg.run( compute, render )
