/**
 * Pixel-level comparison for progress captures (implementation plan §8).
 *
 * A capture only evidences a change if it *looks* different. Byte comparison is the wrong
 * test in both directions — the same screen rendered twice compresses to the same bytes,
 * and the same pixels encoded with a different scanline filter do not — so this module
 * decodes the PNGs the capture tool writes and counts pixels that actually moved.
 *
 * Scope is deliberately narrow: the 8-bit non-interlaced truecolour PNGs Chromium emits,
 * nothing else. Anything else throws rather than being silently misread, because a wrong
 * answer here would quietly mark an unchanged screen as evidence of progress.
 */

import { inflateSync } from 'node:zlib';

export type Raster = Readonly<{
    width: number;
    height: number;
    channels: 3 | 4;
    pixels: Uint8Array;
}>;

/** Per-channel delta below which two pixels are considered the same (antialiasing slack). */
export const PIXEL_DELTA_TOLERANCE = 8;

/** Fraction of changed pixels at or below which two captures are called identical. */
export const VISUALLY_IDENTICAL_FRACTION = 0.002;

const SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

function paeth(a: number, b: number, c: number): number {
    const p = a + b - c;
    const pa = Math.abs(p - a);
    const pb = Math.abs(p - b);
    const pc = Math.abs(p - c);
    if (pa <= pb && pa <= pc) return a;
    if (pb <= pc) return b;
    return c;
}

/** Decode an 8-bit non-interlaced RGB/RGBA PNG into row-major samples. */
export function decodePng(bytes: Uint8Array<ArrayBufferLike>): Raster {
    const source = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    if (source.length < 8 || SIGNATURE.some((byte, index) => source[index] !== byte)) {
        throw new Error('not a PNG: missing the 8-byte PNG signature');
    }

    let width = 0;
    let height = 0;
    let channels: 3 | 4 = 4;
    const idat: Buffer[] = [];
    let offset = 8;
    while (offset + 8 <= source.length) {
        const length = source.readUInt32BE(offset);
        const type = source.toString('ascii', offset + 4, offset + 8);
        const data = source.subarray(offset + 8, offset + 8 + length);
        if (type === 'IHDR') {
            if (idat.length > 0) throw new Error('not a PNG: IHDR must precede IDAT');
            width = data.readUInt32BE(0);
            height = data.readUInt32BE(4);
            const bitDepth = data[8];
            const colorType = data[9];
            const interlace = data[12];
            if (bitDepth !== 8 || (colorType !== 2 && colorType !== 6)) {
                throw new Error(`unsupported PNG: need 8-bit colour, got bit depth ${bitDepth} colour type ${colorType}`);
            }
            if (interlace !== 0) throw new Error(`unsupported PNG: interlace method ${interlace}`);
            channels = colorType === 6 ? 4 : 3;
        } else if (type === 'IDAT') {
            idat.push(Buffer.from(data));
        } else if (type === 'IEND') {
            break;
        }
        offset += 12 + length;
    }
    if (width === 0 || height === 0 || idat.length === 0) {
        throw new Error('not a PNG: missing IHDR or IDAT');
    }

    const stride = width * channels;
    const raw = inflateSync(Buffer.concat(idat));
    if (raw.length < height * (stride + 1)) {
        throw new Error(`unsupported PNG: inflated data shorter than ${height} scanlines`);
    }

    const pixels = new Uint8Array(width * height * channels);
    const previous = new Uint8Array(stride);
    const current = new Uint8Array(stride);
    for (let row = 0; row < height; row += 1) {
        const filter = raw[row * (stride + 1)];
        const start = row * (stride + 1) + 1;
        for (let x = 0; x < stride; x += 1) {
            const encoded = raw[start + x] ?? 0;
            const left = x >= channels ? (current[x - channels] ?? 0) : 0;
            const up = previous[x] ?? 0;
            const upLeft = x >= channels ? (previous[x - channels] ?? 0) : 0;
            let value = encoded;
            if (filter === 1) value += left;
            else if (filter === 2) value += up;
            else if (filter === 3) value += Math.floor((left + up) / 2);
            else if (filter === 4) value += paeth(left, up, upLeft);
            else if (filter !== 0 && filter !== undefined) {
                throw new Error(`unsupported PNG: scanline filter ${filter}`);
            }
            current[x] = value & 0xff;
        }
        pixels.set(current, row * stride);
        previous.set(current);
    }
    return { width, height, channels, pixels };
}

/** Fraction of pixels whose samples differ by more than {@link PIXEL_DELTA_TOLERANCE}. */
export function changedPixelFraction(a: Raster, b: Raster): number {
    if (a.width !== b.width || a.height !== b.height) return 1;
    if (a.channels !== b.channels) return 1;
    const count = a.width * a.height;
    const stride = count * a.channels;
    let changed = 0;
    for (let pixel = 0; pixel < count; pixel += 1) {
        for (let channel = 0; channel < a.channels; channel += 1) {
            const index = pixel * a.channels + channel;
            if (Math.abs((a.pixels[index] ?? 0) - (b.pixels[index] ?? 0)) > PIXEL_DELTA_TOLERANCE) {
                changed += 1;
                break;
            }
        }
    }
    return stride === 0 ? 1 : changed / count;
}

/** Difference between two encoded PNGs; 0 means the two renders are visually identical. */
export function comparePngBuffers(
    a: Uint8Array<ArrayBufferLike>,
    b: Uint8Array<ArrayBufferLike>
): number {
    return changedPixelFraction(decodePng(a), decodePng(b));
}

export function looksIdentical(fraction: number): boolean {
    return fraction <= VISUALLY_IDENTICAL_FRACTION;
}
