import { layoutNextLine, prepareWithSegments, type LayoutCursor } from '../../src/layout.ts'
import { carveTextLineSlots, type Interval } from './wrap-geometry.ts'
import { BODY_COPY } from './dynamic-layout-text.ts'

const BODY_FONT = '18px "Iowan Old Style", "Palatino Linotype", "Book Antiqua", Palatino, serif'
const BODY_LINE_HEIGHT = 30
const stage = document.getElementById('stage') as HTMLDivElement
const video = document.getElementById('rabbit') as HTMLVideoElement

await document.fonts.ready

// Extract the first letter for the Drop Cap
const DROP_CAP_TEXT = BODY_COPY.charAt(0).toUpperCase()
const REST_BODY = BODY_COPY.slice(1)

const DROP_CAP_FONT = 'bold 84px "Iowan Old Style", "Palatino Linotype", "Book Antiqua", Palatino, serif'
const dropCapEl = document.createElement('div')
dropCapEl.textContent = DROP_CAP_TEXT
dropCapEl.style.position = 'absolute'
dropCapEl.style.font = DROP_CAP_FONT
dropCapEl.style.lineHeight = '72px'
dropCapEl.style.color = 'var(--ink)'
dropCapEl.style.zIndex = '5'
stage.appendChild(dropCapEl)

const offscreenCanvas = new OffscreenCanvas(256, 256)
const offCtx = offscreenCanvas.getContext('2d', { willReadFrequently: true })!

// Measure Drop Cap width to block text around it
offCtx.font = DROP_CAP_FONT
const dropCapWidth = offCtx.measureText(DROP_CAP_TEXT).width + 8
const dropCapHeight = 72

// Use a large amount of text to fill the screen
const preparedBody = prepareWithSegments(REST_BODY + '\n\n' + BODY_COPY + '\n\n' + BODY_COPY, BODY_FONT)

type PositionedLine = {
  x: number
  y: number
  text: string
  width: number
}

const linePool: HTMLSpanElement[] = []
let lastLines: PositionedLine[] = []

function syncPool(count: number) {
  while (linePool.length < count) {
    const el = document.createElement('span')
    el.className = 'line'
    stage.appendChild(el)
    linePool.push(el)
  }
  for (let i = 0; i < linePool.length; i++) {
    linePool[i]!.style.display = i < count ? '' : 'none'
  }
}

function positionedLinesEqual(a: PositionedLine[], b: PositionedLine[]): boolean {
  if (a.length !== b.length) return false
  for (let index = 0; index < a.length; index++) {
    const left = a[index]!
    const right = b[index]!
    if (
      left.x !== right.x ||
      left.y !== right.y ||
      left.width !== right.width ||
      left.text !== right.text
    ) {
      return false
    }
  }
  return true
}

let scheduledRaf: number | null = null
function scheduleRender(): void {
  if (scheduledRaf !== null) return
  scheduledRaf = requestAnimationFrame(render)
}

function render() {
  scheduledRaf = null
  
  if (video.readyState < 2) {
    scheduleRender()
    return
  }
  
  const vW = video.videoWidth
  const vH = video.videoHeight
  if (!vW || !vH) {
    scheduleRender()
    return
  }

  const sW = stage.clientWidth
  const sH = stage.clientHeight
  
  const rect = video.getBoundingClientRect()
  const displayW = rect.width
  const displayH = rect.height
  const displayX = rect.left
  const displayY = rect.top
  
  const sampleW = 128
  const sampleH = Math.max(1, Math.round(128 * (vH / vW)))
  if (offscreenCanvas.width !== sampleW || offscreenCanvas.height !== sampleH) {
    offscreenCanvas.width = sampleW
    offscreenCanvas.height = sampleH
  }
  
  offCtx.clearRect(0, 0, sampleW, sampleH)
  offCtx.drawImage(video, 0, 0, sampleW, sampleH)
  const imgData = offCtx.getImageData(0, 0, sampleW, sampleH).data
  
  const lefts = new Int32Array(sampleH).fill(-1)
  const rights = new Int32Array(sampleH).fill(-1)
  const threshold = 16
  
  for (let y = 0; y < sampleH; y++) {
    let minX = -1, maxX = -1
    for (let x = 0; x < sampleW; x++) {
      const alpha = imgData[(y * sampleW + x) * 4 + 3]!
      if (alpha > threshold) {
        if (minX === -1) minX = x
        maxX = x
      }
    }
    lefts[y] = minX
    rights[y] = maxX
  }
  
  const lines: PositionedLine[] = []
  let cursor: LayoutCursor = { segmentIndex: 0, graphemeIndex: 0 } // Start from index 0 of REST_BODY
  const paddingX = 16
  const paddingY = 8
  const marginX = 24
  const marginY = 24
  
  dropCapEl.style.left = marginX + 'px'
  dropCapEl.style.top = marginY + 'px'
  
  let lineTop = marginY
  
  while (lineTop + BODY_LINE_HEIGHT <= sH - marginY) {
    const bandTop = lineTop - paddingY
    const bandBottom = lineTop + BODY_LINE_HEIGHT + paddingY
    
    const sampleStartY = Math.max(0, Math.floor((bandTop - displayY) / displayH * sampleH))
    const sampleEndY = Math.min(sampleH - 1, Math.ceil((bandBottom - displayY) / displayH * sampleH))
    
    const blocked: Interval[] = []
    
    // Add video masking intervals
    if (sampleStartY <= sampleEndY && sampleStartY < sampleH && sampleEndY >= 0) {
      let minX = sampleW
      let maxX = -1
      for (let y = Math.max(0, sampleStartY); y <= Math.min(sampleH - 1, sampleEndY); y++) {
        const l = lefts[y]!
        const r = rights[y]!
        if (l !== -1 && l < minX) minX = l
        if (r !== -1 && r > maxX) maxX = r
      }
      
      if (minX <= maxX) {
        const blockLeft = displayX + (minX / sampleW) * displayW - paddingX
        const blockRight = displayX + ((maxX + 1) / sampleW) * displayW + paddingX
        blocked.push({ left: blockLeft, right: blockRight })
      }
    }
    
    // Add Drop Cap obstacle for the first few lines
    if (bandBottom > marginY && bandTop < marginY + dropCapHeight) {
      blocked.push({ left: marginX, right: marginX + dropCapWidth })
    }
    
    const slots = carveTextLineSlots({ left: marginX, right: sW - marginX }, blocked)
    let textExhausted = false
    
    for (let i = 0; i < slots.length; i++) {
      const slot = slots[i]!
      const w = slot.right - slot.left
      if (w < 40) continue
      const line = layoutNextLine(preparedBody, cursor, w)
      if (line === null) {
        textExhausted = true
        break
      }
      lines.push({
        x: Math.round(slot.left),
        y: Math.round(lineTop),
        text: line.text,
        width: line.width
      })
      cursor = line.end
    }
    
    if (textExhausted) break
    lineTop += BODY_LINE_HEIGHT
  }
  
  if (!positionedLinesEqual(lines, lastLines)) {
    syncPool(lines.length)
    for (let i = 0; i < lines.length; i++) {
      const el = linePool[i]!
      const l = lines[i]!
      el.textContent = l.text
      el.style.left = l.x + 'px'
      el.style.top = l.y + 'px'
      el.style.font = BODY_FONT
      el.style.lineHeight = BODY_LINE_HEIGHT + 'px'
    }
    lastLines = lines
  }
  
  scheduleRender()
}

window.addEventListener('resize', scheduleRender)
// Start loop
scheduleRender()
