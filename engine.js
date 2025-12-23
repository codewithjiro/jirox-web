import { calculateAlphaMap } from "./alphaMap.js";
import { removeWatermark } from "./blendModes.js";

export class WatermarkEngine {
  constructor(bg48, bg96) {
    this.bg48 = bg48;
    this.bg96 = bg96;
    this.alphaMaps = {};
  }

  static async create() {
    const loadImage = (src) =>
      new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(`Missing: ${src}`);
        img.src = src;
      });
    const [bg48, bg96] = await Promise.all([
      loadImage("./assets/bg_48.png"),
      loadImage("./assets/bg_96.png"),
    ]);
    return new WatermarkEngine(bg48, bg96);
  }

  async process(imageFile) {
    const img = await new Promise((r) => {
      const i = new Image();
      i.onload = () => r(i);
      i.src = URL.createObjectURL(imageFile);
    });
    const canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0);

    const isLarge = img.width > 1024 && img.height > 1024;
    const size = isLarge ? 96 : 48;
    const config = {
      size,
      x: img.width - (isLarge ? 64 : 32) - size,
      y: img.height - (isLarge ? 64 : 32) - size,
      width: size,
      height: size,
    };

    if (!this.alphaMaps[size]) {
      const c2 = document.createElement("canvas");
      c2.width = size;
      c2.height = size;
      const ctx2 = c2.getContext("2d");
      ctx2.drawImage(size === 48 ? this.bg48 : this.bg96, 0, 0);
      this.alphaMaps[size] = calculateAlphaMap(
        ctx2.getImageData(0, 0, size, size)
      );
    }

    removeWatermark(
      ctx.getImageData(0, 0, img.width, img.height),
      this.alphaMaps[size],
      config
    );
    // Direct pixel update for performance
    const finalData = ctx.getImageData(0, 0, img.width, img.height);
    removeWatermark(finalData, this.alphaMaps[size], config);
    ctx.putImageData(finalData, 0, 0);

    return {
      blob: await new Promise((r) => canvas.toBlob(r, "image/png")),
      originalSrc: img.src,
    };
  }
}
