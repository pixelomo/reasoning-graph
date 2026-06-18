import { createProgram, createBuffer } from './gl-utils'
import { setupVertexAttribute, setupInstancedAttribute } from './instancing'
import { nodeVert, nodeFrag } from './shaders/node'
import { edgeVert, edgeFrag } from './shaders/edge'
import { pickingVert, pickingFrag } from './shaders/picking'
import type { GraphGeometry } from './layout'
import type { Mat4 } from './math'

const NODE_QUAD = new Float32Array([-1, -1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1])
const EDGE_QUAD = new Float32Array([0, -0.5, 1, -0.5, 1, 0.5, 0, -0.5, 1, 0.5, 0, 0.5])

interface NodeBuffers {
  offset: WebGLBuffer
  color: WebGLBuffer
  radius: WebGLBuffer
  birth: WebGLBuffer
}

interface EdgeBuffers {
  start: WebGLBuffer
  end: WebGLBuffer
  startColor: WebGLBuffer
  endColor: WebGLBuffer
  highlight: WebGLBuffer
}

export interface DrawOptions {
  modelView: Mat4
  proj: Mat4
  resolution: [number, number]
  time: number
  breathe: number
  selectedIndex: number
  edgeAlpha: number
  lineWidthPx: number
}

export class GraphRenderer {
  private gl: WebGL2RenderingContext
  private nodeProgram: WebGLProgram
  private edgeProgram: WebGLProgram
  private pickProgram: WebGLProgram

  private nodeVAO: WebGLVertexArrayObject
  private edgeVAO: WebGLVertexArrayObject

  private nodeQuad: WebGLBuffer
  private edgeQuad: WebGLBuffer
  private nodeBuffers: NodeBuffers | null = null
  private edgeBuffers: EdgeBuffers | null = null

  private pickFbo: WebGLFramebuffer
  private pickTexture: WebGLTexture
  private bufferWidth = 1
  private bufferHeight = 1

  private nodeCount = 0
  private edgeCount = 0

  constructor(gl: WebGL2RenderingContext) {
    this.gl = gl
    this.nodeProgram = createProgram(gl, nodeVert, nodeFrag)
    this.edgeProgram = createProgram(gl, edgeVert, edgeFrag)
    this.pickProgram = createProgram(gl, pickingVert, pickingFrag)

    this.nodeVAO = this.createVAO()
    this.edgeVAO = this.createVAO()
    this.nodeQuad = createBuffer(gl, NODE_QUAD)
    this.edgeQuad = createBuffer(gl, EDGE_QUAD)

    this.pickFbo = this.createFramebuffer()
    this.pickTexture = this.createTexture()
    this.attachPickTexture()

    gl.enable(gl.BLEND)
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
    gl.clearColor(0.02, 0.03, 0.05, 1.0)
  }

  private createVAO(): WebGLVertexArrayObject {
    const vao = this.gl.createVertexArray()
    if (!vao) throw new Error('Failed to create VAO')
    return vao
  }

  private createFramebuffer(): WebGLFramebuffer {
    const fbo = this.gl.createFramebuffer()
    if (!fbo) throw new Error('Failed to create framebuffer')
    return fbo
  }

  private createTexture(): WebGLTexture {
    const tex = this.gl.createTexture()
    if (!tex) throw new Error('Failed to create texture')
    return tex
  }

  private attachPickTexture(): void {
    const gl = this.gl
    gl.bindTexture(gl.TEXTURE_2D, this.pickTexture)
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA8,
      this.bufferWidth,
      this.bufferHeight,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      null,
    )
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.pickFbo)
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      this.pickTexture,
      0,
    )
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
  }

  resize(width: number, height: number): void {
    this.bufferWidth = Math.max(1, Math.floor(width))
    this.bufferHeight = Math.max(1, Math.floor(height))
    this.gl.viewport(0, 0, this.bufferWidth, this.bufferHeight)
    this.attachPickTexture()
  }

  upload(geometry: GraphGeometry): void {
    const gl = this.gl
    this.nodeCount = geometry.nodeCount
    this.edgeCount = geometry.edgeCount

    this.disposeGeometryBuffers()

    this.nodeBuffers = {
      offset: createBuffer(gl, geometry.offsets),
      color: createBuffer(gl, geometry.nodeColors),
      radius: createBuffer(gl, geometry.radii),
      birth: createBuffer(gl, geometry.births, gl.DYNAMIC_DRAW),
    }

    gl.bindVertexArray(this.nodeVAO)
    setupVertexAttribute(gl, 0, this.nodeQuad, 2)
    setupInstancedAttribute(gl, 1, this.nodeBuffers.offset, 3)
    setupInstancedAttribute(gl, 2, this.nodeBuffers.color, 3)
    setupInstancedAttribute(gl, 3, this.nodeBuffers.radius, 1)
    setupInstancedAttribute(gl, 4, this.nodeBuffers.birth, 1)
    gl.bindVertexArray(null)

    this.edgeBuffers = {
      start: createBuffer(gl, geometry.edgeStarts),
      end: createBuffer(gl, geometry.edgeEnds),
      startColor: createBuffer(gl, geometry.edgeStartColors),
      endColor: createBuffer(gl, geometry.edgeEndColors),
      highlight: createBuffer(gl, new Float32Array(geometry.edgeCount), gl.DYNAMIC_DRAW),
    }

    gl.bindVertexArray(this.edgeVAO)
    setupVertexAttribute(gl, 0, this.edgeQuad, 2)
    setupInstancedAttribute(gl, 1, this.edgeBuffers.start, 3)
    setupInstancedAttribute(gl, 2, this.edgeBuffers.end, 3)
    setupInstancedAttribute(gl, 3, this.edgeBuffers.startColor, 3)
    setupInstancedAttribute(gl, 4, this.edgeBuffers.endColor, 3)
    setupInstancedAttribute(gl, 5, this.edgeBuffers.highlight, 1)
    gl.bindVertexArray(null)
  }

  // Per-edge highlight flags (0 or 1), one per instance, computed on the CPU
  // when the selection changes. Uploaded into the dynamic highlight buffer.
  setHighlight(flags: Float32Array): void {
    const gl = this.gl
    if (!this.edgeBuffers || flags.length === 0) return
    gl.bindBuffer(gl.ARRAY_BUFFER, this.edgeBuffers.highlight)
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, flags)
    gl.bindBuffer(gl.ARRAY_BUFFER, null)
  }

  draw(options: DrawOptions): void {
    const gl = this.gl
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    gl.viewport(0, 0, this.bufferWidth, this.bufferHeight)
    gl.clear(gl.COLOR_BUFFER_BIT)

    if (this.edgeCount > 0 && this.edgeBuffers) {
      gl.useProgram(this.edgeProgram)
      this.setMatrix(this.edgeProgram, 'u_modelView', options.modelView)
      this.setMatrix(this.edgeProgram, 'u_proj', options.proj)
      gl.uniform2f(
        gl.getUniformLocation(this.edgeProgram, 'u_resolution'),
        options.resolution[0],
        options.resolution[1],
      )
      gl.uniform1f(
        gl.getUniformLocation(this.edgeProgram, 'u_lineWidthPx'),
        options.lineWidthPx,
      )
      gl.uniform1f(gl.getUniformLocation(this.edgeProgram, 'u_breathe'), options.breathe)
      gl.uniform1f(gl.getUniformLocation(this.edgeProgram, 'u_edgeAlpha'), options.edgeAlpha)
      gl.uniform1i(
        gl.getUniformLocation(this.edgeProgram, 'u_selected'),
        options.selectedIndex,
      )
      gl.bindVertexArray(this.edgeVAO)
      gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, this.edgeCount)
    }

    if (this.nodeCount > 0 && this.nodeBuffers) {
      gl.useProgram(this.nodeProgram)
      this.setMatrix(this.nodeProgram, 'u_modelView', options.modelView)
      this.setMatrix(this.nodeProgram, 'u_proj', options.proj)
      gl.uniform1f(gl.getUniformLocation(this.nodeProgram, 'u_time'), options.time)
      gl.uniform1f(gl.getUniformLocation(this.nodeProgram, 'u_breathe'), options.breathe)
      gl.uniform1i(
        gl.getUniformLocation(this.nodeProgram, 'u_selected'),
        options.selectedIndex,
      )
      gl.bindVertexArray(this.nodeVAO)
      gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, this.nodeCount)
    }

    gl.bindVertexArray(null)
  }

  pick(px: number, py: number, modelView: Mat4, proj: Mat4, breathe: number): number | null {
    const gl = this.gl
    if (this.nodeCount === 0 || !this.nodeBuffers) return null

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.pickFbo)
    gl.viewport(0, 0, this.bufferWidth, this.bufferHeight)
    gl.disable(gl.BLEND)
    gl.clearColor(0, 0, 0, 0)
    gl.clear(gl.COLOR_BUFFER_BIT)

    gl.useProgram(this.pickProgram)
    this.setMatrix(this.pickProgram, 'u_modelView', modelView)
    this.setMatrix(this.pickProgram, 'u_proj', proj)
    gl.uniform1f(gl.getUniformLocation(this.pickProgram, 'u_breathe'), breathe)
    gl.bindVertexArray(this.nodeVAO)
    gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, this.nodeCount)

    const pixel = new Uint8Array(4)
    const readX = Math.floor(px)
    const readY = Math.floor(this.bufferHeight - py)
    gl.readPixels(readX, readY, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel)

    gl.bindVertexArray(null)
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    gl.clearColor(0.02, 0.03, 0.05, 1.0)
    gl.enable(gl.BLEND)

    const id = pixel[0] + (pixel[1] << 8) + (pixel[2] << 16)
    if (id === 0) return null
    return id - 1
  }

  private setMatrix(program: WebGLProgram, name: string, value: Mat4): void {
    const gl = this.gl
    gl.uniformMatrix4fv(gl.getUniformLocation(program, name), false, value)
  }

  private disposeGeometryBuffers(): void {
    const gl = this.gl
    if (this.nodeBuffers) {
      gl.deleteBuffer(this.nodeBuffers.offset)
      gl.deleteBuffer(this.nodeBuffers.color)
      gl.deleteBuffer(this.nodeBuffers.radius)
      gl.deleteBuffer(this.nodeBuffers.birth)
      this.nodeBuffers = null
    }
    if (this.edgeBuffers) {
      gl.deleteBuffer(this.edgeBuffers.start)
      gl.deleteBuffer(this.edgeBuffers.end)
      gl.deleteBuffer(this.edgeBuffers.startColor)
      gl.deleteBuffer(this.edgeBuffers.endColor)
      gl.deleteBuffer(this.edgeBuffers.highlight)
      this.edgeBuffers = null
    }
  }

  dispose(): void {
    const gl = this.gl
    this.disposeGeometryBuffers()
    gl.deleteBuffer(this.nodeQuad)
    gl.deleteBuffer(this.edgeQuad)
    gl.deleteVertexArray(this.nodeVAO)
    gl.deleteVertexArray(this.edgeVAO)
    gl.deleteFramebuffer(this.pickFbo)
    gl.deleteTexture(this.pickTexture)
    gl.deleteProgram(this.nodeProgram)
    gl.deleteProgram(this.edgeProgram)
    gl.deleteProgram(this.pickProgram)
  }
}
