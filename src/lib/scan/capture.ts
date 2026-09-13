// src/lib/scan/capture.ts
export const SCAN_MAX_EDGE = 384

function imageDataFromSource(src: CanvasImageSource, w: number, h: number): ImageData {
  const scale = Math.min(1, SCAN_MAX_EDGE / Math.max(w, h))
  const cw = Math.max(1, Math.round(w * scale))
  const ch = Math.max(1, Math.round(h * scale))
  const canvas = document.createElement('canvas')
  canvas.width = cw
  canvas.height = ch
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new Error('canvas 2d unavailable')
  ctx.drawImage(src, 0, 0, cw, ch)
  return ctx.getImageData(0, 0, cw, ch)
}

export function grabVideoFrame(video: HTMLVideoElement): ImageData {
  return imageDataFromSource(video, video.videoWidth, video.videoHeight)
}

export function imageDataFromFile(file: File): Promise<ImageData> {
  return createImageBitmap(file).then(bmp => {
    const d = imageDataFromSource(bmp, bmp.width, bmp.height)
    bmp.close()
    return d
  })
}
