import BinaryBitmap from '@zxing/library/esm/core/BinaryBitmap'
import DecodeHintType from '@zxing/library/esm/core/DecodeHintType'
import RGBLuminanceSource from '@zxing/library/esm/core/RGBLuminanceSource'
import HybridBinarizer from '@zxing/library/esm/core/common/HybridBinarizer'
import QRCodeReader from '@zxing/library/esm/core/qrcode/QRCodeReader'

function toGrayscaleBuffer(imageBuffer: Uint8ClampedArray, invert: boolean): Uint8ClampedArray {
  const grayscaleBuffer = new Uint8ClampedArray(imageBuffer.length / 4)

  for (let i = 0, j = 0; i < imageBuffer.length; i += 4, j++) {
    let gray = 0xff
    const alpha = imageBuffer[i + 3]

    if (alpha !== 0) {
      const pixelR = imageBuffer[i]
      const pixelG = imageBuffer[i + 1]
      const pixelB = imageBuffer[i + 2]

      gray = (306 * pixelR + 601 * pixelG + 117 * pixelB + 0x200) >> 10
    }

    grayscaleBuffer[j] = invert ? 0xff - gray : gray
  }

  return grayscaleBuffer
}

export function decodeQrCanvasWithZxing(
  canvas: HTMLCanvasElement,
  invert: boolean,
): string | null {
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) {
    return null
  }

  try {
    const hints = new Map([[DecodeHintType.TRY_HARDER, true]])
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height)
    const luminanceSource = new RGBLuminanceSource(
      toGrayscaleBuffer(imageData.data, invert),
      canvas.width,
      canvas.height,
    )
    const binaryBitmap = new BinaryBitmap(new HybridBinarizer(luminanceSource))
    const result = new QRCodeReader().decode(binaryBitmap, hints)

    return result.getText()
  } catch {
    return null
  }
}
