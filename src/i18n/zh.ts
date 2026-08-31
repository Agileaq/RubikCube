import type { Dict } from './types'
import { TUTORIAL } from '../data/tutorial'

// Chinese (default). Tutorial tab/title/body reuse the existing data file so
// the Chinese copy lives in one place; other locales carry their own copies.
export const zh: Dict = {
  paint: {
    title: '填色',
    hint: '请根据手上魔方各面颜色对图中魔方进行填色',
    reset: '重置',
    export: '导出填色状态(调试)',
    copied: '已复制 ✓',
    startSolve: '开始复原',
    tutorialAria: '教程',
    unsolvable:
      '填色状态不可解，1.先检查填色状态与手上魔方状态是否一致。2.如果魔方被转角或者拆装错了，将导致无法还原(即不可解)',
  },
  solve: {
    back: '返回填色',
    preparing: '正在准备复原…',
    nextMove: '下一步转动',
    prevMove: '上一步',
    done: '已复原 ✓',
    play: '播放',
    pause: '暂停',
    next: '下一步',
    finish: '完成',
    speed: '速度: {s}秒/步',
    stages: ['白色十字', '白色面和侧面T字', '中层棱块', '顶层黄色十字', '顶层黄色面', '顶层凹字(角块归位)', '顶层棱块归位'],
    notes: [
      '把白色棱块对齐中心，做出白色十字',
      '把白色角块归位，完成白色面和四个侧面T字',
      '把中层四个棱块归位',
      '做出顶层黄色十字',
      '翻转顶层角块，完成黄色面',
      '调整顶层角块位置(凹字)',
      '调整顶层棱块位置，完成复原',
    ],
  },
  tutorial: {
    back: '‹ 返回',
    title: '三阶魔方教程',
    sections: TUTORIAL.map(s => ({ anchor: s.anchor, tab: s.tab, title: s.title, body: s.body })),
  },
  update: {
    newVersion: '发现新版本',
    updateNow: '立即更新',
  },
}
