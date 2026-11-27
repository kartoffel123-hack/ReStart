import { describe, expect, it } from 'vitest';
import { sha256Hex } from '../../src/domain/hash.js';

describe('sha256Hex', () => {
    it('matches the published digests for the standard vectors', () => {
        expect(sha256Hex('')).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
        expect(sha256Hex('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
        expect(sha256Hex('abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq')).toBe(
            '248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1'
        );
    });

    it('cross-checks against node:crypto on a multi-block input', async () => {
        const { createHash } = await import('node:crypto');
        for (const text of ['x'.repeat(55), 'y'.repeat(56), 'z'.repeat(63), 'w'.repeat(1_000)]) {
            expect(sha256Hex(text)).toBe(createHash('sha256').update(text, 'utf8').digest('hex'));
        }
    });

    it('handles non-ASCII text the same way a UTF-8 encoder would', async () => {
        const { createHash } = await import('node:crypto');
        const text = 'replace 12-tooth bevel gear — 主齿轮';
        expect(sha256Hex(text)).toBe(createHash('sha256').update(text, 'utf8').digest('hex'));
    });
});
