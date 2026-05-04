struct Particle {
  pos: vec2f,
  vel: vec2f
};

@group(0) @binding(0) var<storage> particles : array<Particle>;
@group(0) @binding(1) var<storage, read_write> particles2: array<Particle>;
@group(0) @binding(2) var<storage, read_write> binSize : array<atomic<u32>>;

@compute @workgroup_size(64,1,1)
fn cs(@builtin(global_invocation_id) id : vec3u) {
  if (id.x >= arrayLength(&particles)) { return; }

  // Read the particle data
  let particle = particles[id.x];

  // Compute the linearized bin index
  let binIndex = getBinIndex( particle.pos );

  // Increment the size of the bin
  atomicAdd(&binSize[binIndex], 1u);
}


