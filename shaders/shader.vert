#version 460

in vec2 in_vert;
out vec2 v_pos;

void main() {
	gl_Position = vec4(in_vert, 0.0, 1.0);
	v_pos = in_vert;
}