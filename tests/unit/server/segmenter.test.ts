import { segmentInput } from '../../../server/src/services/segmenter'
import { vi, describe, it, expect } from 'vitest'

describe('segmentInput', () => {
  it('returns original if short', () => {
    const s = 'short text'
    expect(segmentInput(s, 50)).toEqual([s])
  })

  it('splits long text into segments not exceeding maxLen', () => {
    const words = new Array(200).fill('word').join(' ')
    const segs = segmentInput(words, 100)
    expect(segs.every((s) => s.length <= 100)).toBeTruthy()
    expect(segs.join(' ')).toContain('word')
  })
})
