/**
 * Progress captures are evidence only when they actually differ (implementation plan §8).
 * The capture tool used to compare PNG *bytes*, which failed in both directions: three
 * renders of one shared placeholder produced identical bytes and still shipped as a
 * "distinct" capture set, while two renders that differ only in how the PNG encoder
 * filtered their scanlines would have been reported as distinct when they were not.
 *
 * These fixtures encode PNGs by hand — deflate plus all five scanline filters — so the
 * decoder is checked against the filtering it has to undo, not only against whatever one
 * Chromium build happened to emit.
 */
import { describe, expect, it } from 'vitest';
import { deflateSync } from 'node:zlib';
import {
    VISUALLY_IDENTICAL_FRACTION,
    changedPixelFraction,
    comparePngBuffers,
    decodePng
} from '../../tools/progress/png-diff.js';

function crc32(bytes: Uint8Array): number {
    let crc = ~0;
    for (const byte of bytes) {
        crc ^= byte;
        for (let bit = 0; bit < 8; bit += 1) {
            const mask = -(crc & 1);
            crc = (crc >>> 1) ^ (0xedb88320 & mask);
        }
    }
    return ~crc >>> 0;
}

function chunk(type: string, data: Uint8Array): Buffer {
    const body = Buffer.concat([Buffer.from(type, 'ascii'), Buffer.from(data)]);
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length, 0);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body), 0);
    return Buffer.concat([length, body, crc]);
}

/** Paeth predictor as specified by ISO/IEC 15948 §6.3. */
function paeth(a: number, b: number, c: number): number {
    const p = a + b - c;
    const pa = Math.abs(p - a);
    const pb = Math.abs(p - b);
    const pc = Math.abs(p - c);
    if (pa <= pb && pa <= pc) return a;
    if (pb <= pc) return b;
    return c;
}

/**
 * Encode `pixels` with one chosen filter per row. Per ISO/IEC 15948 §6.3 the predictor
 * reads the *plain* neighbouring bytes (Recon(x) = Filt(x) + Recon(a), and Recon equals the
 * plain value), so the encoder predicts from the original scanline, not from the filtered
 * bytes it just wrote. A decoder that un-filters against the encoded bytes instead of the
 * reconstructed ones disagrees with this fixture.
 */
function encodePng(
    width: number,
    height: number,
    pixels: Uint8Array,
    channels: 3 | 4,
    filters: readonly number[]
): Buffer {
    const stride = width * channels;
    const rows: Buffer[] = [];
    let plainPrevious: Uint8Array<ArrayBufferLike> = new Uint8Array(stride);
    for (let row = 0; row < height; row += 1) {
        const filter = filters[row] ?? 0;
        const encoded = Buffer.alloc(stride);
        const plainRow = pixels.subarray(row * stride, (row + 1) * stride);
        for (let x = 0; x < stride; x += 1) {
            const value = plainRow[x] ?? 0;
            const left = x >= channels ? (plainRow[x - channels] ?? 0) : 0;
            const up = plainPrevious[x] ?? 0;
            const upLeft = x >= channels ? (plainPrevious[x - channels] ?? 0) : 0;
            let predicted = 0;
            if (filter === 1) predicted = left;
            else if (filter === 2) predicted = up;
            else if (filter === 3) predicted = Math.floor((left + up) / 2);
            else if (filter === 4) predicted = paeth(left, up, upLeft);
            else if (filter !== 0) throw new Error(`unsupported filter ${filter}`);
            encoded[x] = (value - predicted) & 0xff;
        }
        rows.push(Buffer.concat([Buffer.from([filter]), encoded]));
        plainPrevious = plainRow;
    }
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(width, 0);
    ihdr.writeUInt32BE(height, 4);
    ihdr[8] = 8;
    ihdr[9] = channels === 4 ? 6 : 2;
    const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    return Buffer.concat([
        signature,
        chunk('IHDR', ihdr),
        chunk('IDAT', deflateSync(Buffer.concat(rows))),
        chunk('IEND', new Uint8Array(0))
    ]);
}

function gradient(width: number, height: number, channels: 3 | 4): Uint8Array {
    const pixels = new Uint8Array(width * height * channels);
    for (let row = 0; row < height; row += 1) {
        for (let column = 0; column < width; column += 1) {
            const offset = (row * width + column) * channels;
            pixels[offset] = (row * 17 + column * 5) & 0xff;
            pixels[offset + 1] = (row * 3 + column * 11) & 0xff;
            pixels[offset + 2] = (row * 29 + column) & 0xff;
            if (channels === 4) pixels[offset + 3] = 255;
        }
    }
    return pixels;
}

function withChangedPixels(pixels: Uint8Array, width: number, count: number, delta: number): Uint8Array {
    const copy = Uint8Array.from(pixels);
    for (let index = 0; index < count; index += 1) {
        const offset = index * 4;
        copy[offset] = Math.min(255, (copy[offset] ?? 0) + delta);
    }
    return copy;
}

describe('progress capture PNG decoder', () => {
    it('reads a truecolour image written with the None filter', () => {
        const pixels = gradient(3, 2, 3);
        const raster = decodePng(encodePng(3, 2, pixels, 3, [0, 0]));
        expect([raster.width, raster.height, raster.channels]).toEqual([3, 2, 3]);
        expect([...raster.pixels]).toEqual([...pixels]);
    });

    it('un-filters every filter type the format allows', () => {
        const pixels = gradient(4, 5, 4);
        const raster = decodePng(encodePng(4, 5, pixels, 4, [0, 1, 2, 3, 4]));
        expect([...raster.pixels]).toEqual([...pixels]);
    });

    it('rejects a PNG it cannot read instead of misreading it', () => {
        const interlaced = encodePng(2, 1, gradient(2, 1, 4), 4, [0]);
        interlaced[28] = 1; // interlace byte of IHDR
        expect(() => decodePng(interlaced)).toThrow(/interlace|unsupported|cannot/i);
        expect(() => decodePng(new Uint8Array([1, 2, 3]))).toThrow(/signature/i);
    });
});

describe('progress capture difference metric', () => {
    it('reports no change when the same pixels are encoded with different filters', () => {
        const pixels = gradient(6, 6, 4);
        const none = encodePng(6, 6, pixels, 4, Array(6).fill(0));
        const paethed = encodePng(6, 6, pixels, 4, Array(6).fill(4));
        expect(Buffer.compare(none, paethed)).not.toBe(0);
        expect(changedPixelFraction(decodePng(none), decodePng(paethed))).toBe(0);
        expect(comparePngBuffers(none, paethed)).toBe(0);
    });

    it('counts the fraction of pixels that changed', () => {
        const pixels = gradient(10, 10, 4);
        const changed = withChangedPixels(pixels, 10, 10, 120);
        expect(comparePngBuffers(encodePng(10, 10, pixels, 4, Array(10).fill(0)), encodePng(10, 10, changed, 4, Array(10).fill(0)))).toBeCloseTo(0.1, 5);
    });

    it('ignores sub-threshold noise so antialiasing is not called a change', () => {
        const pixels = gradient(10, 10, 4);
        const noisy = withChangedPixels(pixels, 10, 40, 4);
        expect(comparePngBuffers(encodePng(10, 10, pixels, 4, Array(10).fill(0)), encodePng(10, 10, noisy, 4, Array(10).fill(0)))).toBe(0);
    });

    it('treats a viewport size change as a total change', () => {
        const small = encodePng(4, 4, gradient(4, 4, 4), 4, Array(4).fill(0));
        const large = encodePng(6, 6, gradient(6, 6, 4), 4, Array(6).fill(0));
        expect(comparePngBuffers(small, large)).toBe(1);
    });

    it('sets the identical threshold low enough that a real change clears it', () => {
        expect(VISUALLY_IDENTICAL_FRACTION).toBeGreaterThan(0);
        expect(VISUALLY_IDENTICAL_FRACTION).toBeLessThan(0.01);
        const pixels = gradient(40, 40, 4);
        const changed = withChangedPixels(pixels, 40, 40, 120);
        const fraction = comparePngBuffers(
            encodePng(40, 40, pixels, 4, Array(40).fill(0)),
            encodePng(40, 40, changed, 4, Array(40).fill(0))
        );
        expect(fraction).toBeGreaterThan(VISUALLY_IDENTICAL_FRACTION);
    });
});
