import { describe, it, expect } from 'vitest'
import { TUTORIAL } from './tutorial'

describe('tutorial data', () => {
  it('has exactly 8 sections with unique anchors', () => {
    expect(TUTORIAL).toHaveLength(8)
    const anchors = TUTORIAL.map(s => s.anchor)
    expect(new Set(anchors).size).toBe(8)
  })

  it('first section is 魔方结构, then the 7 solve steps in order', () => {
    expect(TUTORIAL[0].title).toContain('魔方结构')
    expect(TUTORIAL[1].title).toContain('白色十字')
    expect(TUTORIAL[2].title).toContain('白色面')
    expect(TUTORIAL[3].title).toContain('中层')
    expect(TUTORIAL[4].title).toContain('黄色十字')
    expect(TUTORIAL[5].title).toContain('黄色面')
    expect(TUTORIAL[6].title).toContain('凹字')
    expect(TUTORIAL[7].title).toContain('顶层棱块')
  })

  it('every section has non-empty body', () => {
    for (const s of TUTORIAL) expect(s.body.length).toBeGreaterThan(0)
  })
})
