export const nodeVert = /* glsl */ `#version 300 es
precision highp float;

layout(location = 0) in vec2 a_corner;
layout(location = 1) in vec3 a_offset;
layout(location = 2) in vec3 a_color;
layout(location = 3) in float a_radius;
layout(location = 4) in float a_birth;

uniform mat4 u_modelView;
uniform mat4 u_proj;
uniform float u_time;
uniform float u_breathe;
uniform int u_selected;

out vec2 v_local;
out vec3 v_color;
out float v_alpha;
out float v_selected;

void main() {
  float age = clamp((u_time - a_birth) / 0.4, 0.0, 1.0);
  float pulse = (gl_InstanceID == u_selected) ? (1.0 + 0.4 * sin(u_time * 6.0)) : 1.0;

  vec4 mv = u_modelView * vec4(a_offset * u_breathe, 1.0);
  mv.xy += a_corner * a_radius * age * pulse;
  gl_Position = u_proj * mv;

  v_local = a_corner;
  v_color = a_color;
  v_alpha = age;
  v_selected = (gl_InstanceID == u_selected) ? 1.0 : 0.0;
}
`

export const nodeFrag = /* glsl */ `#version 300 es
precision highp float;

in vec2 v_local;
in vec3 v_color;
in float v_alpha;
in float v_selected;

out vec4 fragColor;

void main() {
  float d = length(v_local);
  float aa = fwidth(d);

  float fill = 1.0 - smoothstep(1.0 - aa, 1.0, d);
  if (fill <= 0.0) discard;

  float ring = (v_selected > 0.5)
    ? smoothstep(0.78 - aa, 0.78, d) - smoothstep(0.92, 0.92 + aa, d)
    : 0.0;
  vec3 col = mix(v_color, vec3(1.0), ring);

  fragColor = vec4(col, fill * v_alpha);
}
`
