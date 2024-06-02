#version 460

#define MAX_ITERS 2000

struct Dot {
	vec2 pos;
	vec2 vel;
	float mass;
};

uniform sampler2D albedo;
layout(r32f) uniform image2D height;

uniform vec3 sunDir;
uniform bool is3D;
uniform vec2 resolution;
uniform bool isWhite;

in vec2 v_pos;
out vec4 f_color;

struct HitResult {
	vec3 color;
	vec3 pos;
	ivec2 texelPos;
};

HitResult castRay(vec3 pos, vec3 dir) {
	vec2 periods = 1. / abs(dir.xy);
	ivec2 dirSign = ivec2(sign(dir.x), sign(dir.y));
	vec2 pending = periods;
	pos += dir * ((pos.z - 50.0) / -dir.z);
	ivec2 texelPos = ivec2(floor(pos.xy));
	bool isGoing = true;
	int iters = 0;
	vec3 color = vec3(-1);
	float dist = 0.;
	float prevHeight = imageLoad(height, texelPos).r;
	while(isGoing && iters++ < MAX_ITERS) {
		int next = 0;
		if(pending.y < pending.x) {
			next = 1;
		}
		dist += pending[next];
		if(prevHeight >= pos.z + dir.z * dist) {
			isGoing = false;
			color = texture(albedo, vec2(texelPos) / resolution).rgb;
			dist = (pos.z - prevHeight) / dir.z;
			break;
		}
		texelPos[next] += dirSign[next];
		pending -= pending[next];
		pending[next] = periods[next];
		float texelHeight = imageLoad(height, texelPos).r;
		if(texelHeight >= pos.z + dir.z * dist) {
			isGoing = false;
			color = texture(albedo, vec2(texelPos) / resolution).rgb;
			dist = (pos.z - texelHeight) / dir.z;
			break;
		}
		prevHeight = texelHeight;
	}
	return HitResult(color, pos + dir * dist, texelPos);
}

void main() {
	if(is3D) {
		vec3 pos = vec3(resolution.x / 2., resolution.y / 3.5, 250.);
		vec3 dir = normalize(vec3(v_pos * resolution, -resolution.y));
		dir.yz = vec2(dir.y - dir.z / 3., dir.z + dir.y / 3.);
		HitResult primary = castRay(pos, dir);
		float light = 0.1;
		float dx = imageLoad(height, primary.texelPos + ivec2(1, 0)).r - imageLoad(height, primary.texelPos - ivec2(1, 0)).r;
		float dy = imageLoad(height, primary.texelPos + ivec2(0, 1)).r - imageLoad(height, primary.texelPos - ivec2(0, 1)).r;
		vec3 normal = normalize(vec3(dx, dy, 2.));
		light = max(0., dot(normalize(sunDir), normal)) * 0.9 + 0.1;
		if(isWhite) {
			primary.color = vec3(1.);
		}
		vec3 color = primary.color * pow(light, 1. / 2.2);
		f_color = vec4(color, 1.);
	} else {
		vec3 col = texture(albedo, v_pos / 2. + 0.5).rgb;
		f_color = vec4(col, 1.);
	}
}