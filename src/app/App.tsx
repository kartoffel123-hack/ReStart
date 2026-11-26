/**
 * Production host. Owns hash routing only; every screen is a presentation
 * component that the concept gallery renders with the same props (plan 02 §5).
 */
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';

export type RouteId = 'manual' | 'review' | 'concept';

function readRoute(hash: string): RouteId {
    if (hash.startsWith('#/review')) return 'review';
    if (hash.startsWith('#/concept')) return 'concept';
    return 'manual';
}

export function App(): ReactNode {
    const [route, setRoute] = useState<RouteId>(() => readRoute(window.location.hash));

    useEffect(() => {
        const onHashChange = (): void => setRoute(readRoute(window.location.hash));
        window.addEventListener('hashchange', onHashChange);
        return () => window.removeEventListener('hashchange', onHashChange);
    }, []);

    return (
        <div className="rs-app" data-route={route}>
            <p className="rs-boot">ReStart repair manual is booting.</p>
        </div>
    );
}
