// src/lib/scan/capture.ts
// 修订 1：两个入口统一输出正方形 ImageData（SCAN_MAX_EDGE²）。
// 相机预览按 object-fit:cover 显示可见区域的居中正方形——从源帧取同款
// 居中正方形缩放到 384×384，保证「预览所见（对齐取景框）= 采样所得」。
export const SCAN_MAX_EDGE = 384

function squareImageData(src: CanvasImageSource, w: number, h: number): ImageData {
  const side = Math.min(w, h)
  const sx = (w - side) / 2
  const sy = (h - side) / 2
  const canvas = document.createElement('canvas')
  canvas.width = SCAN_MAX_EDGE
  canvas.height = SCAN_MAX_EDGE
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new Error('canvas 2d unavailable')
  ctx.drawImage(src, sx, sy, side, side, 0, 0, SCAN_MAX_EDGE, SCAN_MAX_EDGE)
  return ctx.getImageData(0, 0, SCAN_MAX_EDGE, SCAN_MAX_EDGE)
}

export function grabVideoFrame(video: HTMLVideoElement): ImageData {
  return squareImageData(video, video.videoWidth, video.videoHeight)
}

export function imageDataFromFile(file: File): Promise<ImageData> {
  return createImageBitmap(file).then(bmp => {
    const d = squareImageData(bmp, bmp.width, bmp.height)
    bmp.close()
    return d
  })
}
