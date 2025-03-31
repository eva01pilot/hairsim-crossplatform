<template>
  <canvas class="w-screen h-screen" ref="canvas" />
</template>

<script setup lang="ts">
import { onMounted, useTemplateRef } from "vue";
import triangleWGSL from "@/app/shaders/triangle.vert.wgsl?raw";
import redWGSL from "@/app/shaders/red.frag.wgsl?raw";
import { WebGPUPipeline } from "@/app/lib/pipeline";
import { Renderer } from "@/app/lib/renderer";

const canvas = useTemplateRef("canvas");

onMounted(async () => {
  if (!canvas.value) return;
  const adapter = await navigator.gpu?.requestAdapter({
    featureLevel: "compatibility",
  });

  const device = await adapter?.requestDevice();
  if (!device) return;
  const context = canvas.value.getContext("webgpu") as GPUCanvasContext;
  const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
  context.configure({
    device,
    format: presentationFormat,
  });

  const renderer = new Renderer();
  const pipeline = new WebGPUPipeline(triangleWGSL, redWGSL, device, context, {
    topology: "triangle-list",
  });
  renderer.addPipeline(pipeline);

  const vertexData = new Float32Array([
    // First triangle
    0.0,
    0.5,
    1,
    1,
    0,
    0,
    1, // (x, y, z, r, g, b, a)
    -0.5,
    -0.5,
    1,
    1,
    0,
    0,
    1,
    0.5,
    -0.5,
    1,
    1,
    0,
    0,
    1,

    // Second triangle
    1.0,
    0.5,
    1,
    0,
    1,
    0,
    1,
    0.5,
    -0.5,
    1,
    0,
    1,
    0,
    1,
    1.5,
    -0.5,
    1,
    0,
    1,
    0,
    1,
  ]);
  const draw = () => {
    pipeline.setVertexBuffer(vertexData);
    renderer.draw();
    requestAnimationFrame(draw);
  };
  draw();
});
</script>
