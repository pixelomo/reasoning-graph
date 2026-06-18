export const edgeVert = /* glsl */ `#version 300 es
precision highp float;

layout(location = 0) in vec2 a_corner;
layout(location = 1) in vec3 a_start;
layout(location = 2) in vec3 a_end;
layout(location = 3) in vec3 a_colorStart;
layout(location = 4) in vec3 a_colorEnd;
layout(location = 5) in float a_highlight;

uniform mat4 u_modelView;
uniform mat4 u_proj;
uniform vec2 u_resolution;
uniform float u_lineWidthPx;
uniform float u_breathe;

out vec3 v_color;
out float v_highlight;

void main() {
  mat4 mvp = u_proj * u_modelView;
  vec4 clipA = mvp * vec4(a_start * u_breathe, 1.0);
  vec4 clipB = mvp * vec4(a_end * u_breathe, 1.0);

  vec4 clipCur = mix(clipA, clipB, a_corner.x);
  vec4 clipOther = mix(clipB, clipA, a_corner.x);

  vec2 ndcCur = clipCur.xy / clipCur.w;
  vec2 ndcOther = clipOther.xy / clipOther.w;

  vec2 screenDir = normalize((ndcCur - ndcOther) * u_resolution);
  vec2 screenNormal = vec2(-screenDir.y, screenDir.x);
  vec2 offset = (screenNormal / u_resolution) * (u_lineWidthPx * a_corner.y * 2.0);

  clipCur.xy += offset * clipCur.w;
  gl_Position = clipCur;
  v_color = mix(a_colorStart, a_colorEnd, a_corner.x);
  v_highlight = a_highlight;
}
`

export const edgeFrag = /* glsl */ `#version 300 es
precision highp float;

in vec3 v_color;
in float v_highlight;
uniform float u_edgeAlpha;
uniform highp int u_selected;
out vec4 fragColor;

void main() {
  bool hasSelection = u_selected >= 0;
  float base = hasSelection ? u_edgeAlpha * 0.3 : u_edgeAlpha;
  float alpha = mix(base, 0.95, v_highlight);
  vec3 col = v_color * (1.0 + 0.35 * v_highlight);
  fragColor = vec4(col, alpha);
}
`
