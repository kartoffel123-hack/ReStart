/**
 * SHA-256 in plain TypeScript. The procedure fingerprint has to be identical in
 * the Node CLI, the Vitest fixtures and the reviewer's browser worker, so this
 * deliberately avoids node:crypto and any platform hash.
 */
const ROUND_CONSTANTS: readonly number[] = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
];

const INITIAL_HASH: readonly number[] = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
];

function rotateRight(value: number, bits: number): number {
    return ((value >>> bits) | (value << (32 - bits))) >>> 0;
}

function messageWords(source: Uint8Array): Uint32Array {
    const words = new Uint32Array(16);
    const view = new DataView(source.buffer, source.byteOffset, source.byteLength);
    for (let i = 0; i < 16; i += 1) words[i] = view.getUint32(i * 4, false);
    return words;
}

export function sha256Hex(text: string): string {
    const message = new TextEncoder().encode(text);
    const bitLength = message.length * 8;
    const blockCount = Math.ceil((message.length + 9) / 64);
    const padded = new Uint8Array(blockCount * 64);
    padded.set(message);
    padded[message.length] = 0x80;

    const view = new DataView(padded.buffer);
    view.setUint32(padded.length - 8, Math.floor(bitLength / 0x1_0000_0000), false);
    view.setUint32(padded.length - 4, bitLength >>> 0, false);

    const hash: number[] = [...INITIAL_HASH];
    const schedule = new Uint32Array(64);

    for (let offset = 0; offset < padded.length; offset += 64) {
        const words = messageWords(padded.subarray(offset, offset + 64));
        for (let i = 0; i < 16; i += 1) schedule[i] = words[i] ?? 0;
        for (let i = 16; i < 64; i += 1) {
            const s0 = schedule[i - 15] ?? 0;
            const s1 = schedule[i - 2] ?? 0;
            const sigma0 = (rotateRight(s0, 7) ^ rotateRight(s0, 18) ^ (s0 >>> 3)) >>> 0;
            const sigma1 = (rotateRight(s1, 17) ^ rotateRight(s1, 19) ^ (s1 >>> 10)) >>> 0;
            schedule[i] = ((schedule[i - 16] ?? 0) + sigma0 + (schedule[i - 7] ?? 0) + sigma1) >>> 0;
        }

        let a = hash[0] ?? 0;
        let b = hash[1] ?? 0;
        let c = hash[2] ?? 0;
        let d = hash[3] ?? 0;
        let e = hash[4] ?? 0;
        let f = hash[5] ?? 0;
        let g = hash[6] ?? 0;
        let h = hash[7] ?? 0;

        for (let i = 0; i < 64; i += 1) {
            const bigSigma1 = (rotateRight(e, 6) ^ rotateRight(e, 11) ^ rotateRight(e, 25)) >>> 0;
            const choose = ((e & f) ^ (~e & g)) >>> 0;
            const temp1 = (h + bigSigma1 + choose + (ROUND_CONSTANTS[i] ?? 0) + (schedule[i] ?? 0)) >>> 0;
            const bigSigma0 = (rotateRight(a, 2) ^ rotateRight(a, 13) ^ rotateRight(a, 22)) >>> 0;
            const majority = ((a & b) ^ (a & c) ^ (b & c)) >>> 0;
            const temp2 = (bigSigma0 + majority) >>> 0;

            h = g;
            g = f;
            f = e;
            e = (d + temp1) >>> 0;
            d = c;
            c = b;
            b = a;
            a = (temp1 + temp2) >>> 0;
        }

        const round = [a, b, c, d, e, f, g, h];
        for (let i = 0; i < 8; i += 1) hash[i] = ((hash[i] ?? 0) + (round[i] ?? 0)) >>> 0;
    }

    return hash.map((word) => word.toString(16).padStart(8, '0')).join('');
}
