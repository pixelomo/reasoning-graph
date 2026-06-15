export function setupVertexAttribute(
  gl: WebGL2RenderingContext,
  location: number,
  buffer: WebGLBuffer,
  size: number,
): void {
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
  gl.enableVertexAttribArray(location)
  gl.vertexAttribPointer(location, size, gl.FLOAT, false, 0, 0)
  gl.vertexAttribDivisor(location, 0)
}

export function setupInstancedAttribute(
  gl: WebGL2RenderingContext,
  location: number,
  buffer: WebGLBuffer,
  size: number,
): void {
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
  gl.enableVertexAttribArray(location)
  gl.vertexAttribPointer(location, size, gl.FLOAT, false, 0, 0)
  gl.vertexAttribDivisor(location, 1)
}
