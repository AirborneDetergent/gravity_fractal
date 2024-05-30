#version 460

#define TAU 6.28318530718
#define SAMPLES 4
#define ITERATIONS 10
#define GRAVITY 0.1
#define DOTS_PER_VERT 3
#define DOTS DOTS_PER_VERT * 4

struct Dot {
	vec2 pos;
	vec2 vel;
	float mass;
};

uniform vec2 camOffset;
uniform float zoom;
uniform float dotMass;
uniform bool gridLines;

uniform vec2 resolution;

in vec2 v_pos;
out vec4 f_color;

// https://nullprogram.com/blog/2018/07/31/
uint hash(uint x) {
	x += 0x9e3779b9U;
	x ^= x >> 16;
	x *= 0x7feb352dU;
	x ^= x >> 15;
	x *= 0x846ca68bU;
	x ^= x >> 16;
	return x;
}

// https://www.shadertoy.com/view/MsS3Wc
vec3 hsv2rgb(in vec3 c){
	vec3 rgb = clamp(abs(mod(c.x*6.0+vec3(0.0,4.0,2.0),6.0)-3.0)-1.0, 0.0, 1.0);
	//rgb = rgb*rgb*(3.0-2.0*rgb); // cubic smoothing
	return c.z * mix( vec3(1.0), rgb, c.y);
}

uint getSeed(vec2 pos) {
	uvec2 signs = uvec2((sign(pos) + 1.0) * 0.5);
	pos = abs(pos);
	return (uint(pos.x) & 0x00FF) | (uint(pos.y) << 16) ^ (signs.x << 15 | signs.y << 31);
}

float seedToFloat(uint seed) {
	uint mask = (1 << 23) - 1;
	return uintBitsToFloat((floatBitsToUint(1.0) & (~mask)) | (seed & mask)) - 1.0;
}

vec3 noise(vec2 pos) {
	float[DOTS] dirs;
	uint[4] seeds = uint[4](getSeed(pos), getSeed(pos + vec2(1.0, 0.0)), getSeed(pos + vec2(0.0, 1.0)), getSeed(pos + vec2(1.0, 1.0)));
	for(int i = 0; i < DOTS; i++) {
		int seedIndex = i % 4;
		seeds[seedIndex] = hash(seeds[seedIndex]);
		dirs[i] = seedToFloat(seeds[seedIndex]) * TAU;
	}
	vec2 p = pos - floor(pos);
	vec2 n = 1.0 - p;
	float[4] weights = float[4](n.x * n.y, p.x * n.y, n.x * p.y, p.x * p.y);
	Dot[DOTS + 1] dots;
	for(int i = 0; i < DOTS; i++) {
		dots[i] = Dot(vec2(cos(TAU * dirs[i]), sin(TAU * dirs[i])), vec2(0.0), weights[i % 4]);
	}
	dots[DOTS] = Dot(vec2(0.0), vec2(0.0), dotMass);
	float maxVel = 0.0;
	for(int i = 0; i < ITERATIONS; i++) {
		for(int d1 = 0; d1 < DOTS + 1; d1++) {
			for(int d2 = 0; d2 < DOTS + 1; d2++) {
				if(d1 != d2) {
					vec2 rel = dots[d2].pos - dots[d1].pos;
					float dist2 = dot(rel, rel);
					dots[d1].vel += dots[d2].mass * rel / dist2 * GRAVITY;
				}
			}
			dots[d1].pos += dots[d1].vel;
		}
		float vel = length(dots[DOTS].vel);
		if(vel > maxVel) {
			maxVel = vel;
		}
	}
	Dot d = dots[DOTS];
	float hue = atan(d.vel.y, d.vel.x) / TAU;
	float satVal = tanh(length(d.pos) / (float(ITERATIONS) * GRAVITY) * 0.2);
	vec3 col = hsv2rgb(vec3(hue, satVal, satVal));
	return col;
}

void main() {
	float aspect = resolution.x / resolution.y;
	vec2 pos = v_pos * zoom;
	pos.x *= aspect;
	pos += camOffset;
	vec2 fp = pos - floor(pos);
	if(gridLines && min(fp.x, min(fp.y, min(1.0 - fp.x, 1.0 - fp.y))) < 0.005 * zoom) {
		f_color = vec4(0);
	} else {
		vec2 variation = 2.0 * zoom / resolution;
		uint seed = getSeed(vec2(gl_FragCoord));
		vec3 col = vec3(0.0);
		for(int i = 0; i < SAMPLES; i++) {
			float ox = seedToFloat(seed) - 0.5;
			seed = hash(seed);
			float oy = seedToFloat(seed) - 0.5;
			seed = hash(seed);
			col += noise(pos + vec2(ox, oy) * variation);
		}
		col /= float(SAMPLES);
		f_color = vec4(col.r, col.g, col.b, 1.0);
	}
}