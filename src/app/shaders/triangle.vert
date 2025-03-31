#version 300 es

precision highp float;
precision highp int;

layout(location = 0) in vec2 _p2vs_location0;

void main() {
    vec2 position = _p2vs_location0;
    gl_Position = vec4(position, 0.0, 1.0);
    gl_Position.yz = vec2(-gl_Position.y, gl_Position.z * 2.0 - gl_Position.w);
    return;
}

