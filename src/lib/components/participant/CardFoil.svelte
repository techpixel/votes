<script lang="ts">
	// 1:1 WebGL port of the Figma "Card Foil" shader effect, rendered as a
	// transparent layer: the shader outputs foil = rainbow · fresnel · intensity
	// over black, and CSS mix-blend-mode: screen applies the exact same
	// screen-blend the Figma shader performs against the card underneath.
	import { onMount } from 'svelte';

	// Config from the "Card Foil" effect on Figma node 144:60: light (73.2%, 13%),
	// rainbowSpread 2. Intensity raised above the Figma 0.25 because the CSS
	// screen-blend over our darker card reads fainter than Figma's canvas.
	let {
		lightX = 0.5,
		lightY = 0.5,
		intensity = 0.35,
		foilScale = 2,
		rainbowSpread = 2
	}: {
		lightX?: number;
		lightY?: number;
		intensity?: number;
		foilScale?: number;
		rainbowSpread?: number;
	} = $props();

	let canvas: HTMLCanvasElement;
	let supported = $state(true);
	let renderNow: (() => void) | null = null;

	const FRAG = `#version 300 es
precision highp float;
uniform vec2 uDims;
uniform vec2 uLight;      // 0–1 uv of the light position
uniform float uIntensity;
uniform float uFoilScale;
uniform float uRainbowSpread;
out vec4 fragColor;

vec3 hue2rgb(float h) {
	float r = abs(h * 6.0 - 3.0) - 1.0;
	float g = 2.0 - abs(h * 6.0 - 2.0);
	float b = 2.0 - abs(h * 6.0 - 4.0);
	return clamp(vec3(r, g, b), vec3(0.0), vec3(1.0));
}

void main() {
	vec2 uv = gl_FragCoord.xy / uDims;
	uv.y = 1.0 - uv.y; // Figma UVs are top-left origin
	vec2 p = uv * uDims;
	vec2 lightPx = uLight * uDims;
	vec2 delta = p - lightPx;
	float angle = atan(delta.y, delta.x);
	float dist = length(delta) / length(uDims);
	float fresnel = 1.0 - clamp(dist * 1.5, 0.0, 0.85);
	float lineFreq = 80.0 * uFoilScale;
	float linePattern = sin((p.x - p.y) * lineFreq / uDims.x * 6.2832) * 0.5 + 0.5;
	float hue = fract((angle / 6.2832 + linePattern * 0.4) * uRainbowSpread + 0.5);
	vec3 foil = hue2rgb(hue) * fresnel * uIntensity;
	fragColor = vec4(foil, 1.0);
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
			console.error('[card-foil] shader failed:', e);
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
			gl.uniform2f(gl.getUniformLocation(program, 'uLight'), lightX, lightY);
			gl.uniform1f(gl.getUniformLocation(program, 'uIntensity'), intensity);
			// The shader normalizes the stripe pattern to card width, so a wider
			// card would stretch the foil lines. Scale foilScale by the card's
			// width relative to a 400px reference so stripe spacing stays
			// consistent (in CSS px) across every card size.
			const effectiveScale = foilScale * (canvas.clientWidth / 400);
			gl.uniform1f(gl.getUniformLocation(program, 'uFoilScale'), effectiveScale);
			gl.uniform1f(gl.getUniformLocation(program, 'uRainbowSpread'), rainbowSpread);
			gl.drawArrays(gl.TRIANGLES, 0, 3);
		};

		renderNow();
		const observer = new ResizeObserver(() => renderNow?.());
		observer.observe(canvas);
		return () => {
			observer.disconnect();
			renderNow = null;
		};
	});

	$effect(() => {
		void lightX;
		void lightY;
		void intensity;
		void foilScale;
		void rainbowSpread;
		renderNow?.();
	});
</script>

{#if supported}
	<!-- No wrapper: the canvas must share the card's stacking context so
	     mix-blend-mode screens it against the backdrop and content below. -->
	<canvas
		bind:this={canvas}
		aria-hidden="true"
		class="pointer-events-none absolute inset-0 z-20 h-full w-full"
		style="mix-blend-mode: screen;"
	></canvas>
{/if}
