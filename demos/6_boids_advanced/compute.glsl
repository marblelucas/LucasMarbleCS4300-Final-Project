struct Particle {
  pos: vec2f,
  vel: vec2f,
  color: vec3f
};

@group(0) @binding(0) var<uniform> res:   vec2f;
@group(0) @binding(1) var<storage, read_write> state: array<Particle>;
@group(0) @binding(2) var<uniform> _mouse: vec3f;

@compute
@workgroup_size(64,1,1)

fn cs(@builtin(global_invocation_id) cell:vec3u)  {
  let mouse:vec2f =  -1. + vec2f( _mouse.x, 1.-_mouse.y ) * 2.;

  let idx            = cell.x; 
  var boid:Particle  = state[ idx ];

  var center:vec2f   = vec2f(0.); // rule 1
  var keepaway:vec2f = vec2f(0.); // rule 2
  var vel:vec2f      = vec2f(0.); // rule 3

  for( var i:u32 = 0u; i < count; i = i + 1u ) {
    // don't use boids' own properties in calculations
    if( idx == i ) { continue; }

    let _boid = state[ i ];
    
    // rule 1
    center += _boid.pos;
    
    // rule 2
    if( length( _boid.pos - boid.pos ) < .05 ) {
      keepaway = keepaway - ( _boid.pos - boid.pos );
    }

    // rule 3
    vel += _boid.vel;
  }

  // apply effects of rule 1
  center /= f32( count - 1u );
  boid.vel += (center-boid.pos) * .2;

  // apply effects of rule 2
  boid.vel += keepaway * .2;

  // apply effects of rule 3
  vel /= f32( count - 1u );
  boid.vel += vel * .025;

  if( length(boid.pos - mouse.xy) < .5 ) {
    boid.vel.x += select( -.5, .5, boid.pos.x > mouse.x);
    boid.vel.y += select( -.5, .5, boid.pos.y > mouse.y);
  }

  // limit speed
  boid.vel = select( boid.vel, (boid.vel / length(boid.vel)) * 15., length( boid.vel ) > 15. );
 
  let border = .85;
  if( boid.pos.x < -border ) { boid.vel.x -= (boid.pos.x - -border) * 10.; }
  if( boid.pos.x > border) { boid.vel.x -= (boid.pos.x - border) * 10.; }
  if( boid.pos.y < -border ) { boid.vel.y -= (boid.pos.y - -border) * 10.; }
  if( boid.pos.y > border ) { boid.vel.y -= (boid.pos.y - border) * 10.; }
  
  //boid.pos.y = select( boid.pos.y, ((boid.pos.y + 1.) % 2.) - sign(boid.pos.y), abs(boid.pos.y) > 1.);
  //boid.pos.x = select( boid.pos.x, ((boid.pos.x + 1.) % 2.) - sign(boid.pos.x), abs(boid.pos.x) > 1.);



  // calculate next position
  boid.pos = boid.pos + (2. / res) * boid.vel;

  state[ idx ] = boid;
}
