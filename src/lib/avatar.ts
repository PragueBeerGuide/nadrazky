import "server-only";
import sharp from "sharp";

export const AVATAR_SIDE = 256;
const FORMATS = new Set(["jpeg", "png", "webp", "gif", "avif", "heif"]);

export class AvatarError extends Error {}

/**
 * Turns an uploaded picture into the stored profile picture: upright (EXIF), cropped to a
 * centred 256×256 square, WebP. Re-encoding drops metadata such as the camera's GPS position.
 */
export async function processAvatar(input: Buffer) {
  let format: string | undefined;
  try {
    format = (await sharp(input).metadata()).format;
  } catch {
    throw new AvatarError("not an image");
  }
  if (!format || !FORMATS.has(format)) throw new AvatarError("unsupported format");
  return sharp(input, { animated: false })
    .rotate()
    .resize(AVATAR_SIDE, AVATAR_SIDE, { fit: "cover", position: "attention" })
    .webp({ quality: 82 })
    .toBuffer();
}
