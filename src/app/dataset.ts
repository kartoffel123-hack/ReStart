import { createContext, useContext } from 'react';
import defaultSelection from './default-dataset.json';

const datasets = {
    '30465': { id: '30465', label: 'LEGO Technic helicopter 30465', noun: 'helicopter' },
    '4000041': { id: '4000041', label: 'LEGO CT scanner 4000041', noun: 'scanner' }
} as const;
export type DatasetId = keyof typeof datasets;
if(defaultSelection.id!=='30465' && defaultSelection.id!=='4000041') throw new Error('Invalid default dataset');
export const defaultDataset: DatasetId = defaultSelection.id;

export function selectDataset(search: string, hash: string, fallback: DatasetId = defaultDataset) {
    const requested = new URLSearchParams(search).get('dataset');
    const piece = new URLSearchParams(hash.split('?')[1]).get('piece');
    const prefix = piece?.split('/')[0];
    const owner = prefix === '30465' || prefix === '4000041' ? prefix : undefined;
    if (requested && owner && requested !== owner) throw new Error('The piece belongs to a different dataset.');
    const id = requested ?? owner ?? fallback;
    if (id !== '30465' && id !== '4000041') throw new Error('Unknown repair dataset.');
    return datasets[id];
}

export const DatasetContext = createContext<(typeof datasets)[DatasetId]>(datasets[defaultDataset]);
export function useDataset() {
    const selected = useContext(DatasetContext);
    return { ...selected, base: `${import.meta.env.BASE_URL}models/${selected.id}/` };
}
