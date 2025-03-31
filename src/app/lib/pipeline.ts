/// <reference types="@webgpu/types" />

export interface Pipeline {
  setVertexBuffer(data: Float32Array): void;
  draw(): void;
}

export enum WebGLPrimitiveTypes {
  POINTS = WebGLRenderingContext.POINTS,
  LINES = WebGLRenderingContext.LINES,
  LINE_LOOP = WebGLRenderingContext.LINE_LOOP,
  LINE_STRIP = WebGLRenderingContext.LINE_STRIP,
  TRIANGLES = WebGLRenderingContext.TRIANGLES,
  TRIANGLE_STRIP = WebGLRenderingContext.TRIANGLE_STRIP,
  TRIANGLE_FAN = WebGLRenderingContext.TRIANGLE_FAN,
}
export class WebGLPipeline implements Pipeline {
  private gl: WebGL2RenderingContext;
  private vertexBuffer: WebGLBuffer | null = null;
  private program: WebGLProgram;
  private positionLocation: number;
  private colorLocation: number;
  private numVertices: number;
  private renderType: WebGLPrimitiveTypes;
  constructor(
    vert: string,
    frag: string,
    gl: WebGL2RenderingContext,
    renderType: WebGLPrimitiveTypes,
    positionLocation: number,
    colorLocation: number,
  ) {
    this.gl = gl;
    this.renderType = renderType;

    const vertexShader = this.compileShader(gl.VERTEX_SHADER, vert)!;
    const fragmentShader = this.compileShader(gl.FRAGMENT_SHADER, frag)!;
    const program = this.gl.createProgram();
    this.program = program;
    this.positionLocation = positionLocation;
    this.colorLocation = colorLocation;

    this.numVertices = 0;
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
  }

  setVertexBuffer(data: Float32Array): void {
    this.numVertices = data.byteLength * Float32Array.BYTES_PER_ELEMENT * 7;
    this.vertexBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, data, this.gl.STATIC_DRAW);
  }

  draw() {
    if (!this.vertexBuffer) return;

    this.gl.clear(this.gl.COLOR_BUFFER_BIT);
    this.gl.useProgram(this.program);
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffer);

    // Enable position attribute
    this.gl.enableVertexAttribArray(this.positionLocation);
    this.gl.vertexAttribPointer(
      this.positionLocation,
      3,
      this.gl.FLOAT,
      false,
      7 * 4, // stride: 7 * 4 bytes (3 position + 4 color)
      0, // offset: 0 bytes for position
    );

    // Enable color attribute
    this.gl.enableVertexAttribArray(this.colorLocation);
    this.gl.vertexAttribPointer(
      this.colorLocation,
      4,
      this.gl.FLOAT,
      false,
      7 * 4, // stride: 7 * 4 bytes
      3 * 4, // offset: 3 * 4 bytes (skip position)
    );
    this.gl.drawArrays(this.renderType, 0, this.numVertices);
  }

  private compileShader(type: number, source: string) {
    const shader = this.gl.createShader(type)!;
    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);
    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      console.error(this.gl.getShaderInfoLog(shader));
      this.gl.deleteShader(shader);
      return null;
    }
    return shader;
  }
}
export class WebGPUPipeline implements Pipeline {
  private vertShaderCode: string;
  private fragShaderCode: string;
  private device: GPUDevice;
  private context: GPUCanvasContext;
  private pipeline: GPURenderPipeline;
  private vertexBuffer: GPUBuffer | null = null;
  private numVertices: number;

  constructor(
    vert: string,
    frag: string,
    device: GPUDevice,
    context: GPUCanvasContext,
    primitive: GPUPrimitiveState,
  ) {
    this.vertShaderCode = vert;
    this.fragShaderCode = frag;
    this.device = device;
    this.context = context;
    this.numVertices = 0;

    const vertexModule = device.createShaderModule({
      code: this.vertShaderCode,
    });
    const fragModule = device.createShaderModule({ code: this.fragShaderCode });

    const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
    this.pipeline = device.createRenderPipeline({
      layout: "auto",
      primitive,
      vertex: {
        module: vertexModule,
        entryPoint: "main",
        buffers: [
          {
            arrayStride: 28,
            attributes: [
              {
                shaderLocation: 0,
                offset: 0,
                format: "float32x3",
              },
              {
                shaderLocation: 1,
                offset: 12,
                format: "float32x4",
              },
            ],
          },
        ],
      },
      fragment: {
        module: fragModule,
        entryPoint: "main",
        targets: [{ format: presentationFormat }],
      },
    });
  }
  setVertexBuffer(data: Float32Array) {
    this.vertexBuffer = this.device.createBuffer({
      size: data.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
      mappedAtCreation: true,
    });
    new Float32Array(this.vertexBuffer.getMappedRange()).set(data);
    this.vertexBuffer.unmap();
    this.numVertices = data.length / 7;
    console.log(this.numVertices);
  }

  draw() {
    if (!this.vertexBuffer) return;

    const commandEncoder = this.device.createCommandEncoder();
    const passEncoder = commandEncoder.beginRenderPass({
      colorAttachments: [
        {
          view: this.context.getCurrentTexture().createView(),
          clearValue: [0, 0, 0, 1],
          loadOp: "clear",
          storeOp: "store",
        },
      ],
    });

    passEncoder.setPipeline(this.pipeline);
    passEncoder.setVertexBuffer(0, this.vertexBuffer);
    passEncoder.draw(this.numVertices);
    passEncoder.end();

    this.device.queue.submit([commandEncoder.finish()]);
  }
}
