#version 460

struct Dot {
	vec2 pos;
	vec2 vel;
	float mass;
};

uniform sampler2D albedo;

uniform vec2 camOffset;
uniform float zoom;
uniform float dotMass;
uniform bool gridLines;

uniform vec2 resolution;

in vec2 v_pos;
out vec4 f_color;

void main() {
	vec3 col = texture(albedo, v_pos / 2.0 + 0.5).rgb;
	f_color = vec4(col, 1.0);
}