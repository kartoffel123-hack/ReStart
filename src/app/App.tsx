/**
 * Production host. Owns hash routing only; every screen is a presentation
 * component that the concept gallery renders with the same props (plan 02 §5).
 *
 * The concept gallery is development-only, so a production build never ships it: the route
 * resolves to the same placeholder the mechanic route uses until ticket 7 wires the real loader.
 */
import { lazy, Suspense, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { PlaceholderScreen, type PlaceholderRoute } from '../presentation/placeholder-screen.js';
import { ConceptGallery } from '../concept/gallery.js';
import { StudPilot } from './stud-pilot.js';
import { DatasetContext, selectDataset } from './dataset.js';

export type RouteId = PlaceholderRoute | 'graph' | 'dof';

export function readRoute(hash: string): RouteId {
    if (hash.startsWith('#/dof')) return 'dof';
    if (hash.startsWith('#/graph')) return 'graph';
    if (hash.startsWith('#/review')) return 'review';
    if (hash.startsWith('#/concept')) return 'concept';
    return 'manual';
}

const DEV_ONLY = import.meta.env.DEV;
const Reviewer = lazy(async () => ({default:(await import('./reviewer.js')).Reviewer}));
const DependencyGraph = lazy(async () => ({
    default: (await import('./dependency-graph.js')).DependencyGraphScreen
}));
const DofOverview = lazy(async () => ({
    default: (await import('./dof-overview.js')).DofOverviewScreen
}));

export function App(): ReactNode {
    const [hash, setHash] = useState(() => window.location.hash);

    useEffect(() => {
        const onHashChange = (): void => setHash(window.location.hash);
        window.addEventListener('hashchange', onHashChange);
        return () => window.removeEventListener('hashchange', onHashChange);
    }, []);

    useEffect(() => {
        // Keep hash-only navigation and a later refresh on this generation's
        // assembly, even if a deployment changes the default in the meantime.
        const url = new URL(window.location.href);
        if (url.searchParams.has('dataset')) return;
        const dataset = selectDataset('', hash);
        url.searchParams.set('dataset', dataset.id);
        window.history.replaceState(window.history.state, '', url);
    }, [hash]);

    let dataset;
    try { dataset = selectDataset(window.location.search, hash); }
    catch (error) { return <main role="alert">{String(error)} <a href="./">Open the default manual</a></main>; }
    return <DatasetContext.Provider key={dataset.id} value={dataset}><Screen key={hash} route={readRoute(hash)}/></DatasetContext.Provider>;
}

function Screen({route}: {route: RouteId}): ReactNode {
    if (route === 'manual') return <div data-route="manual"><StudPilot /></div>;
    if (route === 'dof') return <Suspense fallback={<p>Loading DOF &amp; timing table…</p>}><DofOverview /></Suspense>;
    if (route === 'graph') return <Suspense fallback={<p>Loading dependency graph…</p>}><DependencyGraph /></Suspense>;
    if (route === 'review') return <Suspense fallback={<p>Loading reviewer…</p>}><Reviewer/></Suspense>;
    if (route === 'concept' && DEV_ONLY) {
        return (
            <div className="rs-app" data-route={route}>
                <ConceptGallery />
            </div>
        );
    }

    return (
        <div className="rs-app" data-route={route}>
            <PlaceholderScreen route={route} />
        </div>
    );
}
