import jsQR from "jsqr";
import QRCode from "qrcode";
import { describe, expect, it } from "vitest";

// O QR que o participante mostra precisa ser lido pelo leitor da tela de check-in (jsQR no iPhone).
describe("QR de entrada", () => {
  it("o código gerado volta igual na leitura", () => {
    const codigo = "PZKX2VLP";
    const qr = QRCode.create(codigo, { errorCorrectionLevel: "M" });
    const escala = 8;
    const margem = 4;
    const lado = (qr.modules.size + margem * 2) * escala;
    const rgba = new Uint8ClampedArray(lado * lado * 4).fill(255);
    for (let y = 0; y < qr.modules.size; y++)
      for (let x = 0; x < qr.modules.size; x++) {
        if (!qr.modules.get(y, x)) continue;
        for (let dy = 0; dy < escala; dy++)
          for (let dx = 0; dx < escala; dx++) {
            const i = (((y + margem) * escala + dy) * lado + (x + margem) * escala + dx) * 4;
            rgba[i] = rgba[i + 1] = rgba[i + 2] = 0;
          }
      }
    expect(jsQR(rgba, lado, lado)?.data).toBe(codigo);
  });
});
