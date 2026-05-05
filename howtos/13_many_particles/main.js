import { default as seagulls } from '../../seagulls.js'

const sg = await seagulls.init(),
      combine_shader = seagulls.constants.vertex + await seagulls.import( './combine.wgsl' ),
      background_shader = seagulls.constants.vertex + await seagulls.import( './background.wgsl' ),
      render_shader  = await seagulls.import( './render.wgsl' ),
      compute_shader = await seagulls.import( './compute.wgsl' )

const NUM_PARTICLES = 32, 
      NUM_PROPERTIES = 8, 
      state = new Float32Array( NUM_PARTICLES * NUM_PROPERTIES )

for( let i = 0; i < NUM_PARTICLES * NUM_PROPERTIES; i+= NUM_PROPERTIES ) {
  state[i] = -1 + Math.random() * 2
  state[i + 1] = -1 + Math.random() * 2
  while(Math.abs(state[i]) < 0.5 && Math.abs(state[i + 1]) < 0.5){
    state[i] = -1 + Math.random() * 2
    state[i + 1] = -1 + Math.random() * 2
  }
  state[i + 2] = -1 + Math.random() * 2
  state[i + 3] = -1 + Math.random() * 2
  state[i + 4] = 1.0 
  state[i + 5] = Math.floor(Math.random() * 6 - 1);
  state[i + 6] = -1 + Math.random() * 2
  state[i + 7] = -1 + Math.random() * 2
}

state[0] = 0;
state[1] = 0;
state[2] = 0;
state[3] = 0;
state[5] = 0;

var setClearColor = [0, 0, 0, 0];

const usage = GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST

const state_b = sg.buffer( state, '', usage ),
      frame_u = sg.uniform( 0 ),
      res_u   = sg.uniform([ sg.width, sg.height ]),
      x_move  = sg.uniform( 0 ),
      y_move  = sg.uniform( 0 ),
      mode    = sg.uniform( 6 ),
      back    = new Float32Array( seagulls.width * seagulls.height * 4 ),
      tRender   = sg.texture( back ),
      tBackground = sg.texture( back ),
      color   = sg.uniform([ 0, 1, 0, 1])
      

window.addEventListener('keydown', (e) => {
  if (e.code === 'KeyD') x_move.value = 4.0;
});

window.addEventListener('keyup', (e) => {
  if (e.code === 'KeyD') x_move.value = 0.0;
});

window.addEventListener('keydown', (e) => {
  if (e.code === 'KeyA') x_move.value = -4.0;
});

window.addEventListener('keyup', (e) => {
  if (e.code === 'KeyA') x_move.value = 0.0;
});

window.addEventListener('keydown', (e) => {
  if (e.code === 'KeyW') y_move.value = 4.0;
});

window.addEventListener('keyup', (e) => {
  if (e.code === 'KeyW') y_move.value = 0.0;
});

window.addEventListener('keydown', (e) => {
  if (e.code === 'KeyS') y_move.value = -4.0;
});

window.addEventListener('keyup', (e) => {
  if (e.code === 'KeyS') y_move.value = 0.0;
});

let modeRunning = true;

function modeSwitcher() {
  if (!modeRunning){
    return;
  }
  mode.value = (mode.value + 1) % 7;
  let key = 2;
  switch (mode.value){
    case 0:
      document.getElementById('mode').textContent = 'Straight';
      color.value = [0, 0.1, 0, 0]
      break;
    case 1:
      document.getElementById('mode').textContent = 'Orbit';
      color.value = [0, 0, 0.1, 0]
      break;
    case 2:
      document.getElementById('mode').textContent = 'Pursuit';
      color.value = [0.1, 0, 0, 0]
      break;
    case 3:
      document.getElementById('mode').textContent = 'Ricochet';
      color.value = [0.1, 0.1, 0, 0]
      break;
    case 4:
      document.getElementById('mode').textContent = 'Arc';
      color.value = [0.1, 0, 0.1, 0]
      break;
    case 5:
      document.getElementById('mode').textContent = 'Wind';
      color.value = [0, 0.1, 0.1, 0]
      break;
    case 6:
      document.getElementById('mode').textContent = 'Pressure';
      color.value = [0.1, 0.1, 0.1, 0]
      break;
  }

  let modeChange = Math.random() * 14000 + 1000;

  setTimeout(modeSwitcher, modeChange);
};

modeSwitcher();



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

const background = await sg.render({
  shader: background_shader,
  data: [
    color
  ],
  copy: tBackground
})

const render = await sg.render({
  shader: render_shader,
  data: [
    frame_u,
    res_u,
    state_b,
    sg.sampler()
  ],
  onframe() { frame_u.value++ },
  copy: tRender,
  clearColor: [0, 0, 0, 0],
  count: NUM_PARTICLES,
  blend: true
})

const combine = await sg.render({
  shader: combine_shader,
  data: [
    tRender,
    tBackground,
    sg.sampler(),
  ],
  blend: false
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

setInterval(checkPlayerAlive, 100);

async function checkPlayerAlive() {
  

  const alive = await state_b.read(null, 0, Float32Array);

  if (alive[4] === 0) {
    clearInterval(timer);
    modeRunning = false;
  }
}

sg.run( compute, background, render, combine)
