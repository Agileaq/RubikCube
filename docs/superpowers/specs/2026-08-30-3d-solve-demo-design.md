# 3D 复原演示设计 (子项目 C)

日期: 2026-08-30
父项目: RubikCube SPA(见 `2026-08-28-rubikcube-spa-design.md`)
范围: 仅 Solve 路由的 3D 化。Paint 路由保持现有 2.5D 等距 `Cube` 不变。

## 目标

- 把复原演示从"逐步显示静态终态"升级为**真 3D + 层旋转动画**,更好看。
- 转动某面时,在该面外侧叠**箭头**指示转动方向,随 cube 转动(`dir=2` 用大弧度单向箭头 + `×2` 标注)。
- 播放速度 1–5s/步可调,步进 0.5s,默认 2s。
- 求解与步进逻辑、可解性校验、填色页**不动**。

## 技术选型

three.js + @react-three/fiber + @react-three/drei。
- 27 个 cubie 网格,真 WebGL 带光照,层旋转是 R3F 原生操作。
- 依赖体积约 150KB gzip(three 可 tree-shake),PWA 可接受。
- 不选 CSS preserve-3d(27-cubie 层动画高维护、低视觉回报)。
- 不选 three 原生命令式(无 R3F 的状态桥接更繁、易漂移)。

## 数据桥接(纯逻辑,可单测)

新增 `src/lib/cube3d.ts`:
- `faceletToCubieColors(cube: CubeState): CubieColor[27]` — 把 6×9 facelet 映射成 27 个 cubie 各 6 面颜色,坐标 (x,y,z) ∈ {-1,0,1}³。用 `CORNER_FACELETS/EDGE_FACELETS` 空间约定做 ground truth 反推每个 cubie 各朝向面的颜色。
- 每步 move 的目标终态用现有 `applyMoves` 计算;动画层只负责姿态插值,不重算逻辑。
- 测试 `cube3d.test.ts`(TDD):复态 → 27 cubie 全单色面正确;move 后映射正确。

## 3D 场景结构(R3F)

`src/components/Cube3D.tsx`:
- 27 个 `<Cubie>`(圆角 box mesh + 6 贴色面)。
- 层分组:转动 face 时,临时把该层 9 个 cubie 的 mesh 放进一个 `<group>`,对 group 绕轴旋转动画;动画结束(group 归零)时解除分组、cubie 按新逻辑坐标重定位(标准层动画做法)。
- 用 `useFrame` 驱动旋转插值;时长来自 `stepMs`。

## 转动箭头

- 箭头作为 `<group>` 挂在目标 face 外侧(沿该面法线偏移约 0.1 单位)。
- **固定贴在 face 平面、随 cube 转**(不用 Billboard 跟相机)。
- 方向由 `move.face`(贴哪个面)和 `move.dir` 定:`dir=1/-1` 单向箭头;`dir=2` 大弧度单向箭头 + 叠 `×2` 标注(不画双向)。
- 生命周期与层动画同进同出:动画开始淡入、结束淡出。手动步进时,当前待执行步期间常显。
- 测试只覆盖"传某 move → 渲染了对应 face 的箭头节点"(轻量断言),不测箭头几何。

## 播放速度控件

- 状态归 `Solve.tsx` 本地 `useState`,不进 AppContext,不持久化。
- `SolveControls` 加 `<input type="range" min="1" max="5" step="0.5">`,文字标注"1.0秒/步"…​"5.0秒/步"。默认 2.0s。
- **播放间隔 = 层动画时长**(同一 `stepMs`):一步转多久就隔多久走下一步,箭头/动画/播放三者同步,不出现"动画没转完就切"或"转完干等"。
- 手动步进用同一 `stepMs` 跑动画,用户再点即插队(中止当前动画、跳到该步终态)。

## Solve 路由改造

- `useApp()` 取 `cube / full / validation / orientation`,`solvable` 判定、`solve(cube)`、`flatMoves`、`i`、`playing` 全保留。
- `import { Cube }` → `import { Cube3D }`,传 `cube={shown}`、`pendingMove={flatMoves[i] ?? null}`、`stepMs`、`orientation`。
- 在 `Cube3D` 动画结束回调里推进 `i`(替代裸 setTimeout);手动上一步/下一步设目标 `i` 即插队。
- `SolveControls` 接收 `stepMs`、`onStepMs`。

## 依赖

新增:`three`、`@react-three/fiber`、`@react-three/drei`(devDep `@types/three`)。
Vite 原生支持,不改 `vite.config`。

## 文件清单

新增:
- `src/lib/cube3d.ts` + `src/lib/cube3d.test.ts`(纯映射逻辑)
- `src/components/Cube3D.tsx` + `src/components/Cube3D.test.tsx`(轻量:渲染不抛错、传某 move 出现对应 face 箭头节点)

改动:
- `src/routes/Solve.tsx`(换组件、stepMs、动画结束推进 i)
- `src/components/SolveControls.tsx`(加滑块)
- `src/styles.css`(3D 画布容器、滑块样式)
- `package.json`

不动:Paint 路由、2.5D `Cube`、`solvability.ts`、`solver.ts`、`moves.ts`、AppContext 持久化逻辑。

## 与 D(国际化)的协调

C 新增中文文案(下一步/上一步/播放/暂停/秒/步 等)直接写中文常量、**集中放一处**(如 `Solve.tsx` 顶部),不散落。D 阶段只把这些常量收进翻译字典,零返工。solver 里的 STAGES/note 现已是中文,D 阶段一并处理。

## 风险与测试策略

- jsdom 无 WebGL:`Cube3D.test.tsx` 可能跑不动 Canvas。先确认 jsdom 下 R3F 是否报错再定测试粒度——若 Canvas 不可用,只测 `cube3d.ts` 纯函数 + `Cube3D` 的非 Canvas 逻辑(箭头 props 计算),Canvas 渲染靠手动验收。
- 回退点:3D 与 2.5D 解耦,3D 组件独立文件,Solve 路由一处切换,失败可回退到 `Cube`。
