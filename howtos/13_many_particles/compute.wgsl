struct Particle {
  pos: vec2f,
  vel: vec2f,
  alive: f32,
  ptype: f32,
  arc: vec2f
};

@group(0) @binding(0) var<uniform> res:   vec2f;
@group(0) @binding(1) var<storage, read_write> state: array<Particle>;
@group(0) @binding(2) var<uniform> x_move: f32;
@group(0) @binding(3) var<uniform> y_move: f32;
@group(0) @binding(4) var<uniform> mode: f32;

fn cellindex( cell:vec3u ) -> u32 {
  let size = 8u;
  return cell.x + (cell.y * size) + (cell.z * size * size);
}

@compute
@workgroup_size(8)

fn cs(@builtin(global_invocation_id) cell:vec3u)  {
  let i = cell.x;
  if (i >= arrayLength(&state)) {
    return;
  }
  if (state[0].alive == 0.0){
    return;
  }
  var p = state[ i ];

  if (i != 0){
    var player = state[0];
    var dx = player.pos.x - p.pos.x;
    var dy = player.pos.y - p.pos.y;
    let toPlayer = vec2f(dx, dy);
    let dist = length(toPlayer);

    if (dist < 0.02 && (p.ptype == 0.0 || p.ptype == -1.0)){
      player.alive = 0.0;
      state[0] = player;
    }
    else if (dist < 0.01 && p.ptype == 1.0){
      player.alive = 0.0;
      state[0] = player;
    }
    else if (dist < 0.04 && p.ptype == 2.0){
      player.alive = 0.0;
      state[0] = player;
    }
    else if (dist < 0.1 && p.ptype == 3.0){
      player.alive = 0.0;
      state[0] = player;
    }
    else if (dist < 0.03 && p.ptype == 4.0){
      player.alive = 0.0;
      state[0] = player;
    }
  }

  if (i == 0){
    if (x_move != 0 && y_move != 0){
      p.vel = vec2f(x_move*0.7071068, y_move*0.7071068);
    }
    else{
      p.vel = vec2f(x_move, y_move);
    }
  }
  if (i != 0u) {
    if (mode == 2.0 || p.ptype == 4.0) {
      let player = state[0];

      var dx = player.pos.x - p.pos.x;
      var dy = player.pos.y - p.pos.y;

      if (mode != 3.0){
        if (dx > 1.0) { dx -= 2.0; }
        if (dx < -1.0) { dx += 2.0; }
        if (dy > 1.0) { dy -= 2.0; }
        if (dy < -1.0) { dy += 2.0; }
      }

      let toPlayer = vec2f(dx, dy); 
      let dist = length(toPlayer);

      if (dist != 0.0){
        let dir = toPlayer / dist;
        let pursuit = dir * length(p.vel);
        p.vel = mix(p.vel, pursuit, 0.6);
      }

    }
    else if (mode == 1.0 || mode == 4.0) {
      var center: vec2f;
      if (mode == 1.0){
        center = vec2f(0.0, 0.0);
      }
      else {
        center = vec2f(p.arc.x, p.arc.y);
      }
      let dir = p.pos - center;
      let len = length(dir);
      if (len != 0){
        let ndir = normalize(dir);
        let tangent = vec2f(-ndir.y, ndir.x);
        p.vel = tangent * length(p.vel);
      }
    }
    
  }
  var next: vec2f;
  if (p.ptype == 3.0){
    next = p.pos;
  }
  else if (mode == 5.0 && i != 0 && p.ptype != 4.0){
    if (p.ptype == 1.0){
      next.x = p.pos.x + (2. / res.x) * abs(p.vel.x * 4);
    next.y = p.pos.y;
    }
    else if (p.ptype == 2.0){
      next.x = p.pos.x + (2. / res.x) * abs(p.vel.x);
      next.y = p.pos.y;
    }
    else {
      next.x = p.pos.x + (2. / res.x) * abs(p.vel.x * 2);
    next.y = p.pos.y;
    }
  }
  else if (mode == 6.0 && i != 0 && p.ptype != 4.0){
    if (p.ptype == 1.0){
      next.x = p.pos.x;
      next.y = p.pos.y + (2. / res.y) * -(abs(p.vel.y * 4));
    }
    else if (p.ptype == 2.0){
      next.x = p.pos.x;
      next.y = p.pos.y + (2. / res.y) * -(abs(p.vel.y));
    }
    else {
      next.x = p.pos.x;
      next.y = p.pos.y + (2. / res.y) * -(abs(p.vel.y * 2));
    }
  }
  else {
    if (p.ptype == 1.0 || p.ptype == 4.0){
      next = p.pos + (2. / res) * p.vel * 2;
    }
    else if (p.ptype == 2.0){
      next = p.pos + (2. / res) * p.vel * 0.5;
    }
    else {
      next = p.pos + (2. / res) * p.vel;
    }
  }
  if (mode == 3.0 && i != 0u){
    if( next.x > 1. ) { next.x = 0.99; p.vel.x *= -1.0; state[i].vel.x = p.vel.x;}
    if( next.x < -1. ) { next.x = -0.99; p.vel.x *= -1.0; state[i].vel.x = p.vel.x;}
    if( next.y > 1. ) { next.y = 0.99; p.vel.y *= -1.0; state[i].vel.y = p.vel.y;}
    if( next.y < -1. ) { next.y = -0.99; p.vel.y *= -1.0; state[i].vel.y = p.vel.y;}
  }
  else {
    if( next.x > 1. ) { next.x = -1.; }
    if( next.x < -1. ) { next.x = 1.; }
    if( next.y > 1. ) { next.y = -1.; }
    if( next.y < -1. ) { next.y = 1.; }
  }
  p.pos = next;
  state[i].pos = p.pos;

  
}
