struct Particle {
  pos: vec2f,
  vel: vec2f
};

@group(0) @binding(0) var<uniform> res:   vec2f;
@group(0) @binding(1) var<storage> state_r: array<Particle>;
@group(0) @binding(2) var<storage, read_write> state_w: array<Particle>;
@group(0) @binding(3) var<storage, read_write> binSizes : array<u32>;
@group(0) @binding(4) var<storage, read_write> prefixes : array<u32>;
@group(0) @binding(5) var<uniform> _mouse : vec3f;

fn processBin(
  boid: Particle,
  boididx:    u32,
  boidBinIdx: u32,
  center:   ptr<function,vec2f>, 
  keepaway: ptr<function,vec2f>, 
  vel:      ptr<function,vec2f>,
) -> u32 {
  var count = 0u;
  // make sure there's a valid bin to check
  if( boidBinIdx >= arrayLength(&binSizes) || boidBinIdx < 0 ) { return 0; }
  
  let binStartingIndex = prefixes[ boidBinIdx + 1];
  let binSize = binSizes[ boidBinIdx ];

  // hard limit
  let loopSize = select( binSize, 1024, binSize > 1024 );

  for( var i:u32 = 0; i < loopSize; i++ ) {
    // don't use boids' own properties in calculations
    if( boididx == i+binStartingIndex ) { continue; }

    let _boid = state_r[ binStartingIndex + i ];

    // rule 1
    *center += _boid.pos;
    
    // rule 2
    *keepaway -= ( _boid.pos - boid.pos );
   
    // rule 3
    *vel += _boid.vel;
    
    count++;
  }
  return count;
}


@compute
@workgroup_size(64,1)

fn cs(@builtin(global_invocation_id) cell:vec3u)  {
  let idx = cell.x;
  if( idx > arrayLength(&state_r) ){ return; }

  let mouse:vec2f =  -1. + vec2f( _mouse.x, 1.-_mouse.y ) * 2.;
  
  var count: u32 = 0;
  var boid:Particle = state_r[ idx ];    
  var center:vec2f   = vec2f(0.); // rule 1
  var keepaway:vec2f = vec2f(0.); // rule 2
  var vel:vec2f      = vec2f(0.); // rule 3

  // offset to one bin above and one bin to the left
  var i:i32 = getBinIndex( boid.pos ) - i32(SIZE) - 1; // topleft

  count += processBin( boid, cell.x, u32(i),   &center, &keepaway, &vel ); // topleft
  count += processBin( boid, cell.x, u32(i+1), &center, &keepaway, &vel ); // top
  count += processBin( boid, cell.x, u32(i+2), &center, &keepaway, &vel ); // topright
  i += i32(SIZE);
  count += processBin( boid, cell.x, u32(i),   &center, &keepaway, &vel ); // left
  count += processBin( boid, cell.x, u32(i+1), &center, &keepaway, &vel ); // center
  count += processBin( boid, cell.x, u32(i+2), &center, &keepaway, &vel ); // right
  i += i32(SIZE);
  count += processBin( boid, cell.x, u32(i),   &center, &keepaway, &vel ); // bottomleft
  count += processBin( boid, cell.x, u32(i+1), &center, &keepaway, &vel ); // bottom
  count += processBin( boid, cell.x, u32(i+2), &center, &keepaway, &vel ); // bottomright 

  // apply effects of rule 1
  center = select( center, center/f32(count), count != 0 ); 
  boid.vel += (center-boid.pos) * 1.;

  // apply effects of rule 2
  boid.vel += keepaway * .002;

  // apply effects of rule 3
  vel = select( vel, vel/f32(count), count != 0 ); 
  boid.vel += vel * .001;

  if( length(boid.pos - mouse.xy) < .5 ) {
    boid.vel.x += select( -.35, .35, boid.pos.x > mouse.x);
    boid.vel.y += select( -.35, .35, boid.pos.y > mouse.y);
  }

  // move towards center so boids stay on screen
  // boid.vel += (vec2f(0.,0.) - boid.pos) * .05;

  // limit speed
  if( length( boid.vel ) > 10. ) {
    boid.vel = (boid.vel / length(boid.vel)) * 10.;
  }
   
  // calculate next position
  boid.pos = boid.pos + (2. / res) * boid.vel;

  boid.pos.y = select( boid.pos.y, ((boid.pos.y + 1.) % 2.) - sign(boid.pos.y), abs(boid.pos.y) > 1.);
  boid.pos.x = select( boid.pos.x, ((boid.pos.x + 1.) % 2.) - sign(boid.pos.x), abs(boid.pos.x) > 1.);

  state_w[ idx ] = boid;
}
