import { describe, expect, it } from 'vitest';
import { selectDataset } from '../../src/app/dataset.js';

describe('the manual and reviewer open the same assembly', () => {
    it('keeps an explicit scanner selection when following a graph link', () => {
        expect(selectDataset('?dataset=4000041', '#/graph?piece=L250').id).toBe('4000041');
        expect(selectDataset('?dataset=30465', '#/graph?piece=L250').id).toBe('30465');
    });
    it('recovers a legacy helicopter bookmark even with the scanner as default', () => {
        expect(selectDataset('', '#/review?piece=30465%2FNAUO21', '4000041').id).toBe('30465');
    });
    it('rejects unknown packages and cross-dataset bookmarks', () => {
        expect(() => selectDataset('?dataset=other', '#/')).toThrow();
        expect(() => selectDataset('?dataset=4000041', '#/graph?piece=30465%2FNAUO21')).toThrow();
    });
});
