<script module lang="ts">
	export type Palette = [number, number, number][]; // 4 RGB stops, 0–1 floats

	// Default "Blob Colors" gradient from the Figma shader.
	export const DEFAULT_PALETTE: Palette = [
		[0.11, 0.15, 0.22],
		[0.31, 0.78, 0.76],
		[0.53, 0.84, 0.67],
		[0.59, 0.82, 0.22]
	];
</script>

<script lang="ts">
	// WebGL port of the Figma "Lava Lamp Mesh" shader fill used on project card
	// backgrounds (fbm value-noise field mapped through a 4-stop gradient ramp).
	// The Figma shader is static (time is never advanced), so we render on
	// resize/palette change only. The ramp colors are driven by the project's
	// screenshot palette when one is available.
	import { onMount } from 'svelte';

	let {
		blobScale = 2,
		softness = 0.6,
		warp = 0.8,
		seed = 0,
		palette = DEFAULT_PALETTE
	}: {
		blobScale?: number;
		softness?: number;
		warp?: number;
		seed?: number;
		palette?: Palette;
	} = $props();

	let canvas: HTMLCanvasElement;
	let supported = $state(true);
	let renderNow: (() => void) | null = null;

	const FRAG = `#version 300 es
precision highp float;
uniform vec2 uDims;
uniform float uBlobScale;
uniform float uSoftness;
uniform float uWarp;
uniform float uSeed;
uniform vec3 uColors[4];
out vec4 fragColor;

float hash1(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

float valueNoise(vec2 p) {
	vec2 i = floor(p);
	vec2 f = fract(p);
	vec2 u = f * f * (3.0 - 2.0 * f);
	float a = hash1(i);
	float b = hash1(i + vec2(1.0, 0.0));
	float c = hash1(i + vec2(0.0, 1.0));
	float d = hash1(i + vec2(1.0, 1.0));
	return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm(vec2 p) {
	float val = 0.0;
	float amp = 0.5;
	float freq = 1.0;
	for (int i = 0; i < 5; i++) {
		val += amp * valueNoise(p * freq);
		amp *= 0.5;
		freq *= 2.0;
	}
	return val;
}

vec3 ramp(float t) {
	if (t <= 0.0) return uColors[0];
	if (t < 0.3) return mix(uColors[0], uColors[1], t / 0.3);
	if (t < 0.6) return mix(uColors[1], uColors[2], (t - 0.3) / 0.3);
	if (t < 1.0) return mix(uColors[2], uColors[3], (t - 0.6) / 0.4);
	return uColors[3];
}

void main() {
	vec2 uv = gl_FragCoord.xy / uDims;
	uv.y = 1.0 - uv.y; // Figma UVs are top-left origin
	// The noise field is deterministic in uv, so without a seed every card
	// shows the identical blob pattern; the seed slides the sample window to
	// a distinct region of the field per card.
	vec2 aspectUv = vec2(uv.x * (uDims.x / uDims.y), uv.y) + vec2(uSeed * 47.13, uSeed * 89.71);
	float scale = 1.0 / uBlobScale;
	vec2 warpOffset = vec2(
		fbm(aspectUv * scale * 2.3 + vec2(1.7, 9.2)),
		fbm(aspectUv * scale * 2.3 + vec2(8.3, 2.8))
	);
	vec2 warped = aspectUv * scale + warpOffset * uWarp * 0.5;
	float n1 = fbm(warped);
	float n2 = fbm(warped * 1.37 + vec2(5.2, 1.3));
	float n3 = fbm(warped * 0.71 + vec2(2.8, 7.6));
	float field = n1 * 0.5 + n2 * 0.35 + n3 * 0.15;
	float sharpness = 1.0 - clamp(uSoftness, 0.0, 1.0);
	float contrast = 1.0 + sharpness * 4.0;
	field = clamp((field - 0.5) * contrast + 0.5, 0.0, 1.0);
	fragColor = vec4(ramp(field), 1.0);
}`;

	const VERT = `#version 300 es
in vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }`;

	onMount(() => {
		const gl = canvas.getContext('webgl2', { antialias: false });
		if (!gl) {
			supported = false;
			return;
		}

		// A crashed GPU process fires webglcontextlost and leaves the canvas
		// blank — swap to the gray fallback instead of showing a dead canvas.
		const el = canvas;
		const onContextLost = (e: Event) => {
			e.preventDefault();
			renderNow = null;
			supported = false;
		};
		el.addEventListener('webglcontextlost', onContextLost);

		const compile = (type: number, src: string) => {
			const shader = gl.createShader(type)!;
			gl.shaderSource(shader, src);
			gl.compileShader(shader);
			if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
				throw new Error(gl.getShaderInfoLog(shader) ?? 'shader compile failed');
			}
			return shader;
		};

		let program: WebGLProgram;
		try {
			program = gl.createProgram()!;
			gl.attachShader(program, compile(gl.VERTEX_SHADER, VERT));
			gl.attachShader(program, compile(gl.FRAGMENT_SHADER, FRAG));
			gl.linkProgram(program);
			if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
				throw new Error(gl.getProgramInfoLog(program) ?? 'link failed');
			}
		} catch (e) {
			console.error('[lava-lamp] shader failed, using fallback:', e);
			supported = false;
			return;
		}

		const buf = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, buf);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
		const loc = gl.getAttribLocation(program, 'aPos');
		gl.enableVertexAttribArray(loc);
		gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

		renderNow = () => {
			const dpr = Math.min(devicePixelRatio || 1, 2);
			const w = Math.max(1, Math.round(canvas.clientWidth * dpr));
			const h = Math.max(1, Math.round(canvas.clientHeight * dpr));
			if (canvas.width !== w || canvas.height !== h) {
				canvas.width = w;
				canvas.height = h;
			}
			gl.viewport(0, 0, w, h);
			gl.useProgram(program);
			gl.uniform2f(gl.getUniformLocation(program, 'uDims'), w, h);
			gl.uniform1f(gl.getUniformLocation(program, 'uBlobScale'), blobScale);
			gl.uniform1f(gl.getUniformLocation(program, 'uSoftness'), softness);
			gl.uniform1f(gl.getUniformLocation(program, 'uWarp'), warp);
			gl.uniform1f(gl.getUniformLocation(program, 'uSeed'), seed);
			gl.uniform3fv(gl.getUniformLocation(program, 'uColors[0]'), palette.flat());
			gl.drawArrays(gl.TRIANGLES, 0, 3);
		};

		renderNow();
		const observer = new ResizeObserver(() => renderNow?.());
		observer.observe(canvas);
		return () => {
			observer.disconnect();
			el.removeEventListener('webglcontextlost', onContextLost);
			renderNow = null;
		};
	});

	// Re-render when the palette (or params) change.
	$effect(() => {
		void palette;
		void blobScale;
		void softness;
		void warp;
		void seed;
		renderNow?.();
	});

</script>

{#if supported}
	<canvas bind:this={canvas} class="absolute inset-0 h-full w-full"></canvas>
{:else}
	<!-- Shader unavailable/failed/crashed: flat gray keeps the white card text readable. -->
	<div class="absolute inset-0 bg-neutral-600"></div>
{/if}
