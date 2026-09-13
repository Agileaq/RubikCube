import type { Blob } from './segment'

export type GridResult =
  | { ok: true; grid: Blob[][] }
  | { ok: false; reason: 'grid' }

// 真机加固 #2：晶格轴方向有 ± 符号不确定性，直接投影可能整体颠倒/镜像。
// 轴向取自最近邻质心向量（对正方对称点阵的 PCA 各向同性退化免疫），
// 再以图像坐标系（X 右、Y 下）锚定：u 为两条晶格轴中更接近水平的，
// 锚定 u.x > 0（行内方向，左→右）；v 取 u 的垂直方向且 v.y > 0（跨行方向，上→下），
// 保证 grid 拓扑与屏幕一致。
export function orderGrid(blobs: Blob[]): GridResult {
  if (blobs.length !== 9) return { ok: false, reason: 'grid' }
  const n = blobs.length
  // 最近邻质心对 = 晶格相邻格，其连线方向即晶格轴之一
  let ax = 0, ay = 0, dMin = Infinity
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const dx = blobs[j].cx - blobs[i].cx, dy = blobs[j].cy - blobs[i].cy
      const d = Math.hypot(dx, dy)
      if (d < dMin) { dMin = d; ax = dx; ay = dy }
    }
  }
  if (!(dMin > 0)) return { ok: false, reason: 'grid' }
  const a = { x: ax / dMin, y: ay / dMin }
  // 行内轴 u：两条晶格轴中更接近水平的那条，锚定 u.x > 0
  let u = Math.abs(a.x) >= Math.abs(a.y) ? a : { x: -a.y, y: a.x }
  if (u.x < 0) u = { x: -u.x, y: -u.y }
  // 跨行轴 v：u 的垂直方向，锚定 v.y > 0（指向屏幕下方）
  let v = { x: -u.y, y: u.x }
  if (v.y < 0) v = { x: -v.x, y: -v.y }
  const projV = blobs.map(b => b.cx * v.x + b.cy * v.y)
  const projU = blobs.map(b => b.cx * u.x + b.cy * u.y)
  const idx = blobs.map((_, i) => i).sort((p, q) => projV[p] - projV[q])
  // 沿 v 切三行：在相邻投影间隙最大的两处断开
  let g1 = 0, g1v = -Infinity, g2 = 0, g2v = -Infinity
  for (let i = 0; i < 8; i++) {
    const g = projV[idx[i + 1]] - projV[idx[i]]
    if (g > g1v) { g2v = g1v; g2 = g1; g1v = g; g1 = i }
    else if (g > g2v) { g2v = g; g2 = i }
  }
  const cuts = [Math.min(g1, g2), Math.max(g1, g2)]
  const rows = [idx.slice(0, cuts[0] + 1), idx.slice(cuts[0] + 1, cuts[1] + 1), idx.slice(cuts[1] + 1)]
  if (rows.some(r => r.length !== 3)) return { ok: false, reason: 'grid' }
  const grid = rows.map(row =>
    row.sort((p, q) => projU[p] - projU[q]).map(i => blobs[i]),
  )
  return { ok: true, grid }
}
