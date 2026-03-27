import QRCode from 'qrcode';

export async function generateQRCode(
  canvas: HTMLCanvasElement,
  text: string,
): Promise<void> {
  await QRCode.toCanvas(canvas, text, {
    width: 280,
    margin: 2,
    errorCorrectionLevel: 'H',
    color: {
      dark: '#000000',
      light: '#ffffff',
    },
  });
}
