#version 460

#define MAX_ITERS 2000

struct Dot {
	vec2 pos;
	vec2 vel;
	float mass;
};

uniform sampler2D albedo;
layout(r32f) uniform image2D height;

uniform vec2 camOffset;
uniform float zoom;
uniform float dotMass;
uniform bool gridLines;
uniform bool is3D;

uniform vec2 resolution;

in vec2 v_pos;
out vec4 f_color;

void main() {
	if(is3D) {
		vec3 pos = vec3(resolution.x / 2., resolution.y / 3.5, 250.);
		vec3 dir = normalize(vec3(v_pos * resolution, -resolution.y));
		vec2 periods = 1. / abs(dir.xy);
		ivec2 dirSign = ivec2(sign(dir.x), sign(dir.y));
		vec2 pending = periods;
		dir.yz = vec2(dir.y - dir.z / 3., dir.z + dir.y / 3.);
		pos += dir * ((pos.z - 50.0) / -dir.z);
		ivec2 texelPos = ivec2(floor(pos.xy));
		bool isGoing = true;
		int iters = 0;
		vec3 color = vec3(1., 0., 1.);
		float dist = 0.;
		while(isGoing && iters++ < MAX_ITERS) {
			int next = 0;
			if(pending.y < pending.x) {
				next = 1;
			}
			texelPos[next] += dirSign[next];
			dist += pending[next];
			pending -= pending[next];
			pending[next] = periods[next];
			float texelHeight = imageLoad(height, texelPos).r;
			if(texelHeight >= pos.z + dir.z * dist) {
				isGoing = false;
				color = texture(albedo, vec2(texelPos) / resolution).rgb;
			}
		}
		f_color = vec4(color, 1.);
	} else {
		vec3 col = texture(albedo, v_pos / 2. + 0.5).rgb;
		f_color = vec4(col, 1.);
	}
}