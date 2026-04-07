import QRCode from 'qrcode';

const QR_PREVIEW_WIDTH = 280;
const QR_MARGIN = 2;
const QR_MIN_MODULE_PIXEL_SIZE = 6;
const QR_MAX_EXPORT_WIDTH = 1400;
const QR_CAPACITY_FIRST_PASS_LEVEL = 'M';
const QR_CAPACITY_FALLBACK_LEVEL = 'L';

type AdaptiveErrorCorrectionLevel =
  | typeof QR_CAPACITY_FIRST_PASS_LEVEL
  | typeof QR_CAPACITY_FALLBACK_LEVEL;

export interface QRCodeGenerationResult {
  errorCorrectionLevel: AdaptiveErrorCorrectionLevel;
  moduleCount: number;
  version: number;
  width: number;
}

export class QRCodeGenerationError extends Error {
  constructor(
    readonly code: 'data-too-large',
    options?: { cause?: unknown },
  ) {
    super(code);
    this.name = 'QRCodeGenerationError';

    if (options && 'cause' in options) {
      this.cause = options.cause;
    }
  }
}

function isQrDataTooLargeError(error: unknown): error is Error {
  return (
    error instanceof Error &&
    /amount of data is too big to be stored in a qr code/i.test(error.message)
  );
}

function getQrRenderWidth(moduleCount: number) {
  const totalModuleCount = moduleCount + QR_MARGIN * 2;
  return Math.min(
    QR_MAX_EXPORT_WIDTH,
    Math.max(QR_PREVIEW_WIDTH, totalModuleCount * QR_MIN_MODULE_PIXEL_SIZE),
  );
}

export async function generateQRCode(
  canvas: HTMLCanvasElement,
  text: string,
): Promise<QRCodeGenerationResult> {
  let lastDataTooLargeError: Error | null = null;

  for (const errorCorrectionLevel of [
    QR_CAPACITY_FIRST_PASS_LEVEL,
    QR_CAPACITY_FALLBACK_LEVEL,
  ] as const) {
    try {
      const qr = QRCode.create(text, { errorCorrectionLevel });
      const width = getQrRenderWidth(qr.modules.size);

      await QRCode.toCanvas(canvas, text, {
        width,
        margin: QR_MARGIN,
        errorCorrectionLevel,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      });

      return {
        errorCorrectionLevel,
        moduleCount: qr.modules.size,
        version: qr.version,
        width,
      };
    } catch (error) {
      if (isQrDataTooLargeError(error)) {
        lastDataTooLargeError = error;
        continue;
      }

      throw error;
    }
  }

  throw new QRCodeGenerationError('data-too-large', {
    cause: lastDataTooLargeError ?? undefined,
  });
}
