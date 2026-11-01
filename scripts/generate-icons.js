import fs from "fs";
import path from "path";
import zlib from "zlib";

function createPNG(size, bgHex, fgHex) {
  // Simple uncompressed / deflate PNG generator
  const width = size;
  const height = size;

  // RGBA buffer
  const rgba = Buffer.alloc(width * height * 4);

  // Parse colors
  const parseHex = (hex) => [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
  const [bgR, bgG, bgB] = parseHex(bgHex);
  const [fgR, fgG, fgB] = parseHex(fgHex);

  const radius = size * 0.44;
  const center = size / 2;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const dx = x - center;
      const dy = y - center;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= radius) {
        // Rounded icon background
        // Draw branch pattern inside
        const isBranch =
          (Math.abs(x - center * 0.7) < size * 0.08 && y > size * 0.25 && y < size * 0.75) ||
          (Math.sqrt((x - center * 0.7) ** 2 + (y - center * 0.35) ** 2) < size * 0.14) ||
          (Math.sqrt((x - center * 1.3) ** 2 + (y - center * 0.35) ** 2) < size * 0.14) ||
          (Math.sqrt((x - center * 0.7) ** 2 + (y - center * 0.68) ** 2) < size * 0.14) ||
          (x > center * 0.7 && x < center * 1.3 && Math.abs(y - (center * 0.35 + (x - center * 0.7) * 0.5)) < size * 0.08);

        if (isBranch) {
          rgba[idx] = fgR;
          rgba[idx + 1] = fgG;
          rgba[idx + 2] = fgB;
          rgba[idx + 3] = 255;
        } else {
          rgba[idx] = bgR;
          rgba[idx + 1] = bgG;
          rgba[idx + 2] = bgB;
          rgba[idx + 3] = 255;
        }
      } else {
        // Transparent
        rgba[idx] = 0;
        rgba[idx + 1] = 0;
        rgba[idx + 2] = 0;
        rgba[idx + 3] = 0;
      }
    }
  }

  // Build IDAT scanlines
  const scanlines = Buffer.alloc(height * (width * 4 + 1));
  for (let y = 0; y < height; y++) {
    scanlines[y * (width * 4 + 1)] = 0; // Filter None
    rgba.copy(scanlines, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }

  const compressed = zlib.deflateSync(scanlines);

  // PNG Header
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  const makeChunk = (type, data) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type);
    const body = Buffer.concat([typeBuf, data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body), 0);
    return Buffer.concat([len, body, crc]);
  };

  // CRC-32 table
  function crc32(buf) {
    let crc = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      let byte = buf[i];
      for (let j = 0; j < 8; j++) {
        const bit = (crc ^ byte) & 1;
        crc = (crc >>> 1) ^ (bit ? 0xedb88320 : 0);
        byte >>>= 1;
      }
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  const ihdrChunk = makeChunk("IHDR", ihdr);
  const idatChunk = makeChunk("IDAT", compressed);
  const iendChunk = makeChunk("IEND", Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

const iconsDir = path.resolve("public/icons");
fs.mkdirSync(iconsDir, { recursive: true });

for (const size of [16, 48, 128]) {
  const png = createPNG(size, "#0284c7", "#38bdf8");
  fs.writeFileSync(path.join(iconsDir, `icon-${size}.png`), png);
  console.log(`Generated icon-${size}.png`);
}
