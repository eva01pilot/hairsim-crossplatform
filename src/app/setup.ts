import triangleVertWGSL from "@/app/shaders/triangle.vert.wgsl?raw";
import triangleVertGLSL from "@/app/shaders/triangle.vert?raw";
import redFragWGSL from "@/app/shaders/red.frag.wgsl?raw";
import redFragGLSL from "@/app/shaders/red.frag?raw";
export const setupWebGPU = async (canvas: HTMLCanvasElement) => {
  const adapter = await navigator.gpu?.requestAdapter({
    featureLevel: "compatibility",
  });
  const device = await adapter?.requestDevice();
  if (!device) return;

  const context = canvas.getContext("webgpu") as GPUCanvasContext;

  const devicePixelRatio = window.devicePixelRatio;
  canvas.width = canvas.clientWidth * devicePixelRatio;
  canvas.height = canvas.clientHeight * devicePixelRatio;
  const presentationFormat = navigator.gpu.getPreferredCanvasFormat();

  context.configure({
    device,
    format: presentationFormat,
  });

  const firstTriangle = new Float32Array([0.0, 0.5, -0.5, -0.5, 0.5, -0.5]);
  const secondTriangle = new Float32Array([1.0, 0.5, 0.5, -0.5, 1.5, -0.5]);
  const vertexData = new Float32Array([...firstTriangle, ...secondTriangle]);

  const vertexBuffer = device.createBuffer({
    size: vertexData.byteLength,
    usage: GPUBufferUsage.VERTEX,
    mappedAtCreation: true,
  });
  new Float32Array(vertexBuffer.getMappedRange()).set(vertexData);
  vertexBuffer.unmap();

  const pipeline = device.createRenderPipeline({
    layout: "auto",
    vertex: {
      module: device.createShaderModule({ code: triangleVertWGSL }),
      entryPoint: "main",
      buffers: [
        {
          arrayStride: 2 * 4, // 2 floats (x, y) per vertex, each float is 4 bytes
          attributes: [
            {
              shaderLocation: 0,
              offset: 0,
              format: "float32x2",
            },
          ],
        },
      ],
    },
    fragment: {
      module: device.createShaderModule({ code: redFragWGSL }),
      entryPoint: "main",
      targets: [{ format: presentationFormat }],
    },
    primitive: { topology: "triangle-list" },
  });

  function frame() {
    if (!device) return;
    const commandEncoder = device.createCommandEncoder();
    const textureView = context.getCurrentTexture().createView();

    const renderPassDescriptor: GPURenderPassDescriptor = {
      colorAttachments: [
        {
          view: textureView,
          clearValue: [0, 0, 0, 0],
          loadOp: "clear",
          storeOp: "store",
        },
      ],
    };

    const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
    passEncoder.setPipeline(pipeline);
    passEncoder.setVertexBuffer(0, vertexBuffer);
    passEncoder.draw(6);
    passEncoder.end();

    device.queue.submit([commandEncoder.finish()]);
    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
};

export const setupWebGL = (canvas: HTMLCanvasElement) => {
  const gl = canvas.getContext("webgl2");
  if (!gl) {
    console.error("WebGL2 not supported");
    return;
  }

  // Vertex shader source
  const vertexShaderSource = triangleVertGLSL;

  // Fragment shader source
  const fragmentShaderSource = redFragGLSL;

  // Compile shader function
  const compileShader = (type: number, source: string) => {
    const shader = gl.createShader(type)!;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error(gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  };

  // Create and link program
  const vertexShader = compileShader(gl.VERTEX_SHADER, vertexShaderSource)!;
  const fragmentShader = compileShader(
    gl.FRAGMENT_SHADER,
    fragmentShaderSource,
  )!;
  const program = gl.createProgram()!;
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error(gl.getProgramInfoLog(program));
    return;
  }

  // Vertex data (two triangles)
  const vertexData = new Float32Array([
    // First triangle
    0.0, 0.5, -0.5, -0.5, 0.5, -0.5,
    // Second triangle
    1.0, 0.5, 0.5, -0.5, 1.5, -0.5,
  ]);

  // Create vertex buffer
  const vertexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, vertexData, gl.STATIC_DRAW);

  // Get attribute location
  const positionLocation = gl.getAttribLocation(program, "_p2vs_location0");
  gl.enableVertexAttribArray(positionLocation);
  gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

  // Enable transparency
  gl.clearColor(0, 0, 0, 0);
  gl.viewport(0, 0, canvas.width, canvas.height);
  resizeCanvas(canvas, gl);

  const render = () => {
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(program);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    requestAnimationFrame(render);
  };

  requestAnimationFrame(render);
};
function resizeCanvas(canvas: HTMLCanvasElement, gl: WebGL2RenderingContext) {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = canvas.clientWidth * dpr;
  canvas.height = canvas.clientHeight * dpr;
  gl.viewport(0, 0, canvas.width, canvas.height);
}
function getAttributeLocations(
  gl: WebGL2RenderingContext,
  program: WebGLProgram,
) {
  const attributeMap: { [K in string]: number } = {};
  const attributeCount = gl.getProgramParameter(program, gl.ACTIVE_ATTRIBUTES);

  for (let i = 0; i < attributeCount; i++) {
    const attribInfo = gl.getActiveAttrib(program, i);
    if (!attribInfo) continue;

    const location = gl.getAttribLocation(program, attribInfo.name);
    attributeMap[attribInfo.name] = location;
  }

  return attributeMap;
}
