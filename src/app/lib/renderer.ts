/// <reference types="@webgpu/types" />
import type { Pipeline } from "@/app/lib/pipeline";

export class Renderer {
  private pipelines: Pipeline[];
  constructor() {
    this.pipelines = [];
  }
  addPipeline(pipeline: Pipeline) {
    this.pipelines.push(pipeline);
  }
  draw() {
    this.pipelines.forEach((p) => p.draw());
  }
}
