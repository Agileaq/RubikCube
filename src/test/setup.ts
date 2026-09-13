import '@testing-library/jest-dom'

// jsdom (29.x) does not implement the ImageData constructor. The camera-scan
// fixture (lib/scan/makeFaceImage) writes pixels into ImageData directly, so
// install a minimal, spec-shaped stand-in only when the platform lacks one.
// In real browsers the native ImageData is used and this shim never applies.
const g = globalThis as { ImageData?: unknown }
if (typeof g.ImageData === 'undefined') {
  g.ImageData = class {
    width: number
    height: number
    data: Uint8ClampedArray
    constructor(width: number, height: number) {
      this.width = width
      this.height = height
      this.data = new Uint8ClampedArray(width * height * 4)
    }
  }
}
