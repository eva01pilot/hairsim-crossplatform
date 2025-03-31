<template>
  <canvas class="w-screen h-screen" ref="canvas" />
</template>

<script setup lang="ts">
import { onMounted, useTemplateRef } from "vue";
import { setupWebGL, setupWebGPU } from "@/app/setup";

const canvas = useTemplateRef("canvas");

onMounted(async () => {
  if (!canvas.value) return;
  setupWebGL(canvas.value);
});
</script>
