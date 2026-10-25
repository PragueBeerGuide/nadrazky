import sharp from "sharp";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { AVATAR_SIDE, AvatarError, processAvatar } = await import("./avatar");

const photo = (width: number, height: number, format: "png" | "jpeg") =>
  sharp({ create: { width, height, channels: 3, background: { r: 18, g: 48, b: 106 } } })[format]().toBuffer();

describe("processAvatar", () => {
  it("crops any photo to a 256×256 WebP", async () => {
    for (const input of [await photo(1200, 800, "jpeg"), await photo(300, 900, "png")]) {
      const out = await processAvatar(input);
      const meta = await sharp(out).metadata();
      expect(meta).toMatchObject({ format: "webp", width: AVATAR_SIDE, height: AVATAR_SIDE });
    }
  });

  it("drops the photo's metadata", async () => {
    const tagged = await sharp(await photo(400, 400, "jpeg"))
      .withExif({ IFD0: { Copyright: "secret" } })
      .jpeg()
      .toBuffer();
    expect((await sharp(tagged).metadata()).exif).toBeDefined();
    expect((await sharp(await processAvatar(tagged)).metadata()).exif).toBeUndefined();
  });

  it("refuses anything that isn't an image", async () => {
    await expect(processAvatar(Buffer.from("<svg onload=alert(1)>"))).rejects.toBeInstanceOf(AvatarError);
    await expect(processAvatar(Buffer.from("not a picture at all"))).rejects.toBeInstanceOf(AvatarError);
  });
});
