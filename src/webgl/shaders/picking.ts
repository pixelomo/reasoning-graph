export const pickingVert = /* glsl */ `#version 300 es
precision highp float;

layout(location = 0) in vec2 a_corner;
layout(location = 1) in vec3 a_offset;
layout(location = 3) in float a_radius;

uniform mat4 u_modelView;
uniform mat4 u_proj;
uniform float u_breathe;

out vec2 v_local;
flat out int v_id;

void main() {
  vec4 mv = u_modelView * vec4(a_offset * u_breathe, 1.0);
  mv.xy += a_corner * a_radius;
  gl_Position = u_proj * mv;
  v_local = a_corner;
  v_id = gl_InstanceID + 1;
}
`

export const pickingFrag = /* glsl */ `#version 300 es
precision highp float;

in vec2 v_local;
flat in int v_id;

out vec4 fragColor;

void main() {
  if (length(v_local) > 1.0) discard;
  int id = v_id;
  float r = float(id & 0xFF) / 255.0;
  float g = float((id >> 8) & 0xFF) / 255.0;
  float b = float((id >> 16) & 0xFF) / 255.0;
  fragColor = vec4(r, g, b, 1.0);
}
`
