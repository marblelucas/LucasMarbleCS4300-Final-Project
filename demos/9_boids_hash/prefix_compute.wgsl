@group(0) @binding(0) var<storage, read_write> binSizes : array<u32>;
@group(0) @binding(1) var<storage, read_write> prefixes : array<u32>;

@compute @workgroup_size(1,1,1)
fn cs(@builtin(global_invocation_id) cell : vec3u) {
  prefixes[0] = 0;
  for( var i:u32 = 1; i <= arrayLength(&binSizes); i++ ) {
    prefixes[i] = prefixes[i-1] + binSizes[i-1]; 
  }
}
