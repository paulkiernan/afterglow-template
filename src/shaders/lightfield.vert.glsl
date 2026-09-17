// Full-viewport plane: position.xy is already clip space for the 2x2 PlaneGeometry,
// so the vertex stage is a passthrough that carries the screen UV.
varying vec2 vUv;
void main() {
  vUv = position.xy * 0.5 + 0.5;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
