/**
 * Which example state the concept gallery shows (implementation plan §8.6).
 *
 * The gallery's named states are the subject of the design review, yet a screenshot holds one of
 * them. As long as the choice lived only in component state, every capture of `#/concept` was a
 * photograph of the first card, and the two states nobody could link to -- the step the mechanic
 * actually acts on, and a restoration -- had never been reviewed as an image.
 *
 * Reading the state from the address makes each one addressable; writing it back keeps a shared
 * link pointing at the state it shows. Pure and DOM-free, so the gallery, its tests and the
 * capture tool's `waitFor` contract all agree on one rule.
 */

/** `#/concept?state=restore` → `'restore'`. No query string → `null`. */
export function readStateParam(hash: string): string | null {
    const queryStart = hash.indexOf('?');
    if (queryStart < 0) return null;
    return new URLSearchParams(hash.slice(queryStart + 1)).get('state');
}

/** The address that shows `scenarioId`, with the route part kept as it was. */
export function writeStateParam(hash: string, scenarioId: string): string {
    const queryStart = hash.indexOf('?');
    const route = queryStart < 0 ? hash : hash.slice(0, queryStart);
    return `${route.length > 0 ? route : '#/concept'}?state=${encodeURIComponent(scenarioId)}`;
}

/**
 * The state to show: the one named in the address when it is a real one, otherwise the first.
 * An unknown name falls back rather than rendering nothing, and the caller still learns which
 * state was chosen, so a capture that asked for a state it did not get can say so.
 */
export function resolveScenarioId<T extends Readonly<{ id: string }>>(
    hash: string,
    scenarios: readonly T[]
): string {
    const wanted = readStateParam(hash);
    const match = scenarios.find((entry) => entry.id === wanted);
    return match?.id ?? scenarios[0]?.id ?? '';
}
