function toBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality))
}

/**
 * Shrinks a photo in the browser before upload: longest side ≤ maxSide, WebP.
 * Safari can't encode WebP and hands back a PNG instead, so it falls back to JPEG there.
 * Throws if the browser can't open the file (e.g. HEIC outside Safari).
 */
export async function shrinkImage(file: Blob, maxSide = 1200, quality = 0.82): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()

  return encode(canvas, quality)
}

/** WebP, or JPEG where the browser can't make WebP (Safari hands back a PNG instead). */
async function encode(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  const webp = await toBlob(canvas, 'image/webp', quality)
  if (webp?.type === 'image/webp') return webp
  const jpeg = await toBlob(canvas, 'image/jpeg', quality)
  if (!jpeg) throw new Error('Could not encode image')
  return jpeg
}

/** Opens any image the browser can show (including SVG, which createImageBitmap can't). */
async function open(photo: Blob): Promise<HTMLImageElement> {
  const img = new Image()
  img.src = URL.createObjectURL(photo)
  try {
    await img.decode()
    return img
  } finally {
    URL.revokeObjectURL(img.src)
  }
}

/**
 * The photo's background colour, to fill the added space with: the most common colour along its outer edge
 * (a product that touches the edges would skew an average). Transparent parts count as white.
 */
function edgeColor(img: HTMLImageElement): string {
  const size = 48
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, size, size)
  ctx.drawImage(img, 0, 0, size, size)
  const px = ctx.getImageData(0, 0, size, size).data

  // Group similar colours (32 steps per channel) and keep a running sum per group.
  const groups = new Map<number, { n: number; r: number; g: number; b: number }>()
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (x > 1 && x < size - 2 && y > 1 && y < size - 2) continue // edge band only
      const i = (y * size + x) * 4
      const [r, g, b] = [px[i]!, px[i + 1]!, px[i + 2]!]
      const key = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3)
      const s = groups.get(key) ?? { n: 0, r: 0, g: 0, b: 0 }
      s.n++
      s.r += r
      s.g += g
      s.b += b
      groups.set(key, s)
    }
  }
  const top = [...groups.values()].reduce((a, b) => (b.n > a.n ? b : a))
  return `rgb(${Math.round(top.r / top.n)} ${Math.round(top.g / top.n)} ${Math.round(top.b / top.n)})`
}

/**
 * "Deixar espaço em volta da foto": puts the photo in the middle of a square with a margin, filled with the
 * photo's own edge colour. Gift frames crop photos to fill them (a tall arch on the list, a wide one on the
 * confirm screen), so a product shot tight to the edges loses its sides; with the square and margin it fits both.
 */
export async function addSpaceAround(photo: Blob, margin = 0.12, maxSide = 1200, quality = 0.82): Promise<Blob> {
  const img = await open(photo)
  const w = img.naturalWidth
  const h = img.naturalHeight
  const side = Math.max(w, h) * (1 + 2 * margin)
  const scale = Math.min(1, maxSide / side)

  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = Math.round(side * scale)
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = edgeColor(img)
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(img, ((side - w) / 2) * scale, ((side - h) / 2) * scale, w * scale, h * scale)
  return encode(canvas, quality)
}
