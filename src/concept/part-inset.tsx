/** The pale inset that shows a buried piece on its own (plan 02 §5.2). Fixture content only. */
import type { ReactNode } from 'react';

export function PartInset({ label }: Readonly<{ label: string }>): ReactNode {
    return (
        <svg viewBox="0 0 160 64" data-testid="part-inset" role="img" aria-label={label}>
            <title>{label}</title>
            <rect x="10" y="24" width="140" height="16" rx="8" fill="#4b5560" stroke="#172127" strokeWidth="3" />
            <circle cx="30" cy="32" r="9" fill="#e6e6e6" stroke="#172127" strokeWidth="3" />
            <circle cx="130" cy="32" r="9" fill="#e6e6e6" stroke="#172127" strokeWidth="3" />
        </svg>
    );
}
