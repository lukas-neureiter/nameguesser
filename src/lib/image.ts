const TARGET_SIZE = 320
const TARGET_BYTES = 80 * 1024
const MAX_BYTES = 120 * 1024
const QUALITY_STEPS = [0.7, 0.6, 0.5, 0.4, 0.3, 0.2]

type DrawableImage = ImageBitmap | HTMLImageElement

export type CropSettings = {
  zoom: number
  offsetX: number
  offsetY: number
}

export type PreparedPersonImage = {
  image: DrawableImage
  width: number
  height: number
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value))
}

function getDataUrlBytes(dataUrl: string): number {
  const base64 = dataUrl.split(',')[1] ?? ''
  const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0
  return Math.max(0, Math.ceil((base64.length * 3) / 4) - padding)
}

function loadHtmlImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    const objectUrl = URL.createObjectURL(file)

    image.onload = () => {
      URL.revokeObjectURL(objectUrl)
      resolve(image)
    }
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('Das Bild konnte nicht gelesen werden.'))
    }
    image.src = objectUrl
  })
}

async function loadImage(file: File): Promise<DrawableImage> {
  if ('createImageBitmap' in window) {
    try {
      return await createImageBitmap(file, { imageOrientation: 'from-image' })
    } catch {
      // Older browsers fall back to the HTML image decoder below.
    }
  }

  return loadHtmlImage(file)
}

function getImageSize(image: DrawableImage): {
  width: number
  height: number
} {
  return image instanceof HTMLImageElement
    ? { width: image.naturalWidth, height: image.naturalHeight }
    : { width: image.width, height: image.height }
}

function getCropRect(
  source: PreparedPersonImage,
  settings: CropSettings,
): { x: number; y: number; size: number } {
  const zoom = clamp(settings.zoom, 1, 3)
  const size = Math.min(source.width, source.height) / zoom
  const maxX = Math.max(0, (source.width - size) / 2)
  const maxY = Math.max(0, (source.height - size) / 2)

  return {
    x: maxX + clamp(settings.offsetX, -1, 1) * maxX,
    y: maxY + clamp(settings.offsetY, -1, 1) * maxY,
    size,
  }
}

function drawCrop(
  context: CanvasRenderingContext2D,
  source: PreparedPersonImage,
  settings: CropSettings,
  outputSize: number,
): void {
  const crop = getCropRect(source, settings)
  context.clearRect(0, 0, outputSize, outputSize)
  context.drawImage(
    source.image,
    crop.x,
    crop.y,
    crop.size,
    crop.size,
    0,
    0,
    outputSize,
    outputSize,
  )
}

export async function preparePersonImage(
  file: File,
): Promise<PreparedPersonImage> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Bitte wähle eine Bilddatei aus.')
  }

  const image = await loadImage(file)
  const { width, height } = getImageSize(image)

  if (width < 1 || height < 1) {
    disposePreparedPersonImage({ image, width, height })
    throw new Error('Das Bild hat keine gültige Größe.')
  }

  return { image, width, height }
}

export function renderPersonCrop(
  canvas: HTMLCanvasElement,
  source: PreparedPersonImage,
  settings: CropSettings,
): void {
  const context = canvas.getContext('2d')
  if (!context) return
  drawCrop(context, source, settings, canvas.width)
}

export function exportPersonCrop(
  source: PreparedPersonImage,
  settings: CropSettings,
): string {
  const crop = getCropRect(source, settings)
  const outputSize = Math.max(1, Math.floor(Math.min(TARGET_SIZE, crop.size)))
  const canvas = document.createElement('canvas')
  canvas.width = outputSize
  canvas.height = outputSize
  const context = canvas.getContext('2d')

  if (!context) {
    throw new Error('Die Bildverarbeitung wird von diesem Browser nicht unterstützt.')
  }

  drawCrop(context, source, settings, outputSize)

  const webpProbe = canvas.toDataURL('image/webp', QUALITY_STEPS[0])
  const mimeType = webpProbe.startsWith('data:image/webp')
    ? 'image/webp'
    : 'image/jpeg'
  let result = webpProbe

  for (const quality of QUALITY_STEPS) {
    result = canvas.toDataURL(mimeType, quality)
    if (getDataUrlBytes(result) <= TARGET_BYTES) {
      break
    }
  }

  if (getDataUrlBytes(result) > MAX_BYTES) {
    throw new Error(
      'Das Bild ist trotz Kompression noch zu groß. Bitte wähle ein anderes Bild.',
    )
  }

  return result
}

export function disposePreparedPersonImage(
  source: PreparedPersonImage,
): void {
  if ('close' in source.image && typeof source.image.close === 'function') {
    source.image.close()
  }
}
