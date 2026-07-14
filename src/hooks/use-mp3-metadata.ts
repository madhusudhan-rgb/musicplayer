/**
 * use-mp3-metadata.ts
 *
 * Reads ID3v2 tags (title, artist, album, cover art) from an MP3 URI.
 *
 * Android requirement — in your DocumentPicker call use:
 *   copyToCacheDirectory: false
 * This gives you a content:// URI which expo-file-system can read directly.
 * The default (true) creates a file:// copy with OS-level restricted permissions
 * that no read method can access.
 */

import * as FileSystem from "expo-file-system/legacy";
import { useEffect, useState } from "react";

interface Mp3Metadata {
  title?: string;
  artist?: string;
  album?: string;
  year?: string;
  genre?: string;
  trackNumber?: string;
  coverArt?: string;
  mimeType?: string;
}

export function useMp3Metadata(uri: string | null) {
  const [metadata, setMetadata] = useState<Mp3Metadata | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!uri) {
      setMetadata(null);
      return;
    }
    let cancelled = false;
    const loadMetadata = async () => {
      setLoading(true);
      try {
        const meta = await parseMP3Metadata(uri);
        if (!cancelled) setMetadata(meta);
      } catch (error) {
        console.warn("Failed to load metadata:", error);
        if (!cancelled) setMetadata(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    loadMetadata();
    return () => {
      cancelled = true;
    };
  }, [uri]);

  return { metadata, loading };
}

// ─── File reading ─────────────────────────────────────────────────────────────
// expo-file-system supports both content:// (Android) and file:// URIs.
// content:// URIs come from DocumentPicker with copyToCacheDirectory: false.

async function readFileAsBase64(uri: string): Promise<string> {
  return FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
}

// ─── Base64 / byte helpers ────────────────────────────────────────────────────

function arrayToBase64(bytes: Uint8Array): string {
  const B64 =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let result = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const b1 = bytes[i];
    const b2 = i + 1 < bytes.length ? bytes[i + 1] : 0;
    const b3 = i + 2 < bytes.length ? bytes[i + 2] : 0;
    result += B64.charAt(b1 >> 2);
    result += B64.charAt(((b1 & 3) << 4) | (b2 >> 4));
    result +=
      i + 1 < bytes.length ? B64.charAt(((b2 & 15) << 2) | (b3 >> 6)) : "=";
    result += i + 2 < bytes.length ? B64.charAt(b3 & 63) : "=";
  }
  return result;
}

function base64ToArray(b64: string): Uint8Array {
  const B64 =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
  const len = b64.length;
  const bytes = new Uint8Array(Math.floor((len * 3) / 4));
  let p = 0;
  for (let i = 0; i < len; i += 4) {
    const c1 = B64.indexOf(b64[i] || "A");
    const c2 = B64.indexOf(b64[i + 1] || "A");
    const c3 = B64.indexOf(b64[i + 2] || "A");
    const c4 = B64.indexOf(b64[i + 3] || "A");
    bytes[p++] = (c1 << 2) | (c2 >> 4);
    if (c3 !== 64) bytes[p++] = ((c2 & 0x0f) << 4) | (c3 >> 2);
    if (c4 !== 64) bytes[p++] = ((c3 & 0x03) << 6) | c4;
  }
  return bytes.slice(0, p);
}

// ─── Main parser ──────────────────────────────────────────────────────────────

async function parseMP3Metadata(uri: string): Promise<Mp3Metadata> {
  const metadata: Mp3Metadata = {};

  const base64Content = await readFileAsBase64(uri);
  const bytes = base64ToArray(base64Content);

  if (bytes.length < 10) return metadata;

  // ID3v2 magic: "ID3"
  if (bytes[0] !== 0x49 || bytes[1] !== 0x44 || bytes[2] !== 0x33) {
    return metadata;
  }

  const id3Version = bytes[3]; // 3 = v2.3, 4 = v2.4

  // bytes[5] is the flags byte — NOT part of the tag size.
  // Tag size is a synchsafe 4-byte integer at bytes 6–9.
  const tagSize =
    ((bytes[6] & 0x7f) << 21) |
    ((bytes[7] & 0x7f) << 14) |
    ((bytes[8] & 0x7f) << 7) |
    (bytes[9] & 0x7f);

  let offset = 10;

  while (offset < tagSize + 10 && offset + 10 <= bytes.length) {
    if (bytes[offset] === 0) break; // padding

    const frameId = String.fromCharCode(
      bytes[offset],
      bytes[offset + 1],
      bytes[offset + 2],
      bytes[offset + 3]
    );

    // ID3v2.3 uses plain big-endian uint32 for frame sizes.
    // ID3v2.4 uses synchsafe uint32.
    let frameSize: number;
    if (id3Version >= 4) {
      frameSize =
        ((bytes[offset + 4] & 0x7f) << 21) |
        ((bytes[offset + 5] & 0x7f) << 14) |
        ((bytes[offset + 6] & 0x7f) << 7) |
        (bytes[offset + 7] & 0x7f);
    } else {
      frameSize =
        (bytes[offset + 4] << 24) |
        (bytes[offset + 5] << 16) |
        (bytes[offset + 6] << 8) |
        bytes[offset + 7];
    }

    if (frameSize <= 0 || frameSize > 20_000_000) {
      offset += 10;
      continue;
    }

    const frameEnd = offset + 10 + frameSize;
    if (frameEnd > bytes.length) break;

    const frameData = bytes.slice(offset + 10, frameEnd);

    switch (frameId) {
      case "TIT2":
        metadata.title = decodeText(frameData);
        break;
      case "TPE1":
        metadata.artist = decodeText(frameData);
        break;
      case "TALB":
        metadata.album = decodeText(frameData);
        break;
      case "TDRC":
        metadata.year = decodeText(frameData);
        break;
      case "TYER":
        if (!metadata.year) metadata.year = decodeText(frameData);
        break;
      case "TCON":
        metadata.genre = decodeText(frameData);
        break;
      case "TRCK":
        metadata.trackNumber = decodeText(frameData);
        break;
      case "APIC": {
        const apic = parseAPIC(frameData);
        if (apic) {
          metadata.coverArt = apic.base64;
          metadata.mimeType = apic.mime;
        }
        break;
      }
    }

    offset = frameEnd;
  }

  return metadata;
}

// ─── Text decoding ────────────────────────────────────────────────────────────
// ID3 encoding byte:
//   0 = ISO-8859-1   single null terminator
//   1 = UTF-16 + BOM double null terminator
//   2 = UTF-16BE     double null terminator
//   3 = UTF-8        single null terminator

function decodeText(data: Uint8Array): string {
  if (data.length < 1) return "";
  const encoding = data[0];

  if (encoding === 1) {
    // UTF-16 with BOM (FF FE = LE, FE FF = BE)
    if (data.length < 3) return "";
    const isLE = data[1] === 0xff && data[2] === 0xfe;
    let start = 3;
    let end = start;
    while (end + 1 < data.length) {
      if (data[end] === 0 && data[end + 1] === 0) break;
      end += 2;
    }
    let text = "";
    for (let i = start; i + 1 <= end; i += 2) {
      const ch = isLE
        ? data[i] | (data[i + 1] << 8)
        : (data[i] << 8) | data[i + 1];
      if (ch !== 0) text += String.fromCharCode(ch);
    }
    return text.trim();
  }

  if (encoding === 2) {
    // UTF-16BE without BOM
    let start = 1;
    let end = start;
    while (end + 1 < data.length) {
      if (data[end] === 0 && data[end + 1] === 0) break;
      end += 2;
    }
    let text = "";
    for (let i = start; i + 1 <= end; i += 2) {
      const ch = (data[i] << 8) | data[i + 1];
      if (ch !== 0) text += String.fromCharCode(ch);
    }
    return text.trim();
  }

  if (encoding === 3) {
    let end = 1;
    while (end < data.length && data[end] !== 0) end++;
    return decodeUtf8(data.slice(1, end)).trim();
  }

  // ISO-8859-1 (encoding 0 or unknown)
  let end = 1;
  while (end < data.length && data[end] !== 0) end++;
  let text = "";
  for (let i = 1; i < end; i++) text += String.fromCharCode(data[i]);
  return text.trim();
}

function decodeUtf8(bytes: Uint8Array): string {
  let text = "";
  let i = 0;
  while (i < bytes.length) {
    const b = bytes[i];
    if (b < 0x80) {
      text += String.fromCharCode(b);
      i += 1;
    } else if ((b & 0xe0) === 0xc0 && i + 1 < bytes.length) {
      text += String.fromCharCode(((b & 0x1f) << 6) | (bytes[i + 1] & 0x3f));
      i += 2;
    } else if ((b & 0xf0) === 0xe0 && i + 2 < bytes.length) {
      text += String.fromCharCode(
        ((b & 0x0f) << 12) |
          ((bytes[i + 1] & 0x3f) << 6) |
          (bytes[i + 2] & 0x3f)
      );
      i += 3;
    } else if ((b & 0xf8) === 0xf0 && i + 3 < bytes.length) {
      const cp =
        ((b & 0x07) << 18) |
        ((bytes[i + 1] & 0x3f) << 12) |
        ((bytes[i + 2] & 0x3f) << 6) |
        (bytes[i + 3] & 0x3f);
      const hi = 0xd800 + ((cp - 0x10000) >> 10);
      const lo = 0xdc00 + ((cp - 0x10000) & 0x3ff);
      text += String.fromCharCode(hi, lo);
      i += 4;
    } else {
      i += 1;
    }
  }
  return text;
}

// ─── APIC (cover art) ─────────────────────────────────────────────────────────

function parseAPIC(data: Uint8Array): { base64: string; mime: string } | null {
  if (data.length < 4) return null;
  try {
    const encoding = data[0];

    // MIME type: null-terminated ASCII at offset 1
    let mimeEnd = 1;
    while (mimeEnd < data.length && data[mimeEnd] !== 0) mimeEnd++;
    let mimeType = "image/jpeg";
    if (mimeEnd > 1) {
      let m = "";
      for (let i = 1; i < mimeEnd; i++) m += String.fromCharCode(data[i]);
      if (m) mimeType = m;
    }

    // Picture type byte (1 byte after MIME null), then description
    let imageStart = mimeEnd + 2;

    if (encoding === 1 || encoding === 2) {
      // UTF-16 description: double-null on even boundary
      while (imageStart + 1 < data.length) {
        if (data[imageStart] === 0 && data[imageStart + 1] === 0) break;
        imageStart += 2;
      }
      imageStart += 2;
    } else {
      // ISO-8859-1 / UTF-8 description: single null
      while (imageStart < data.length && data[imageStart] !== 0) imageStart++;
      imageStart++;
    }

    if (imageStart >= data.length) return null;

    const imageData = data.slice(imageStart);
    if (imageData.length === 0) return null;

    return { base64: arrayToBase64(imageData), mime: mimeType };
  } catch {
    return null;
  }
}
