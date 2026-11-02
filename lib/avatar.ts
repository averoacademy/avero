import sharp from "sharp";

/**
 * Resizes and compresses an uploaded base64 avatar image to ~10-25 KB (max 256x256 JPEG).
 * Prevents multi-megabyte base64 strings from polluting the MongoDB User document and
 * causing 15-30 second query stalls.
 */
export async function optimizeAvatarImage(avatarStr: string): Promise<string> {
  if (!avatarStr || typeof avatarStr !== "string") {
    return "";
  }

  // If it's a URL (http/https), return as is
  if (avatarStr.startsWith("http://") || avatarStr.startsWith("https://")) {
    return avatarStr;
  }

  // If it's a base64 data URI
  if (avatarStr.startsWith("data:image/")) {
    try {
      const match = avatarStr.match(/^data:image\/[a-zA-Z0-9+.-]+;base64,(.+)$/);
      const base64Data = match ? match[1] : avatarStr.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, "");
      const buffer = Buffer.from(base64Data, "base64");

      const compressedBuffer = await sharp(buffer)
        .resize(256, 256, { fit: "cover", withoutEnlargement: true })
        .jpeg({ quality: 80, mozjpeg: true })
        .toBuffer();

      return `data:image/jpeg;base64,${compressedBuffer.toString("base64")}`;
    } catch (err) {
      console.warn("Avatar optimization failed, using original:", err);
      return avatarStr;
    }
  }

  return avatarStr;
}
