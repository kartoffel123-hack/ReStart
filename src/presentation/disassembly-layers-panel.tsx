import type { AssemblyModel } from '../domain/schema.js';
import type {
    DisassemblyLayers,
    DisassemblyOption,
    DisassemblyOptionStatus
} from '../domain/disassembly-layers.js';
import { formatAxisLabel } from '../domain/dof.js';

const STATUS_LABEL: Record<DisassemblyOptionStatus, string> = {
    available: 'No known blocker',
    blocked: 'Blocked in this snapshot',
    deferred: 'Held as a support',
    unassessed: 'Not assessed'
};

function pieceLabel(model: AssemblyModel, id: string): string {
    const occurrence = model.occurrences.find((item) => item.id === id);
    return occurrence ? `${occurrence.commonName} (${id.split('/').at(-1)})` : id;
}

function OptionCard({
    option,
    model
}: {
    option: DisassemblyOption;
    model: AssemblyModel;
}) {
    return (
        <li className="rs-layer-option" data-status={option.status}>
            <div className="rs-layer-option__head">
                <strong>{option.memberIds.map((id) => pieceLabel(model, id)).join(' + ')}</strong>
                <span className="rs-layer-option__status">{STATUS_LABEL[option.status]}</span>
            </div>
            <div className="rs-layer-option__meta">
                <span>{option.source === 'modeled-operation' ? 'Modeled operation' : 'Geometry candidate'}</span>
                {option.direction && <span>{formatAxisLabel(option.direction)}</span>}
                {option.strokeMm !== null && <span>{option.strokeMm.toFixed(1)} mm</span>}
                <span>evidence: {option.evidenceTier}</span>
            </div>
            {option.applied && (
                <p className="rs-layer-option__note">Used only to calculate the next illustrative layer.</p>
            )}
            {option.provisional && (
                <p className="rs-layer-option__note">Provisional; this option is not a validated motion.</p>
            )}
            {option.blockers.length > 0 && (
                <ul className="rs-layer-option__blockers">
                    {option.blockers.map((blocker, index) => (
                        <li key={`${option.id}:${blocker.id}:${index}`}>
                            Blocked by {pieceLabel(model, blocker.id)} — {blocker.reason}
                        </li>
                    ))}
                </ul>
            )}
            {option.clearedBlockers.length > 0 && (
                <p className="rs-layer-option__note">
                    Previously blocked by: {option.clearedBlockers
                        .map((blocker) => pieceLabel(model, blocker.id)).join('; ')}
                </p>
            )}
        </li>
    );
}

export function DisassemblyLayersPanel({
    layers,
    model
}: {
    layers: DisassemblyLayers;
    model: AssemblyModel;
}) {
    return (
        <section className="rs-assembly-layers" aria-label="Assembly-wide disassembly layers">
            <p className="rs-assembly-layers__disclaimer">
                Availability snapshots, not a repair route. Geometry-only exits are provisional.
                Items in one layer are not instructions to remove them simultaneously.
            </p>
            {layers.layers.length === 0 && (
                <p>No component has a currently available modeled operation or unblocked geometric candidate.</p>
            )}
            {layers.layers.map((layer) => (
                <section className="rs-assembly-layer" key={layer.index}>
                    <h3>Layer {layer.index}</h3>
                    <p>
                        Components provisionally peeled in this illustrative pass:{' '}
                        {layer.pieceIds.map((id) => pieceLabel(model, id)).join('; ') || 'none'}
                    </p>
                    {layer.deferredPieceIds.length > 0 && (
                        <p>
                            Kept in place as supports: {layer.deferredPieceIds
                                .map((id) => pieceLabel(model, id)).join('; ')}
                        </p>
                    )}
                    <ul className="rs-layer-options">
                        {layer.options.map((option) => (
                            <OptionCard key={option.id} option={option} model={model} />
                        ))}
                    </ul>
                </section>
            ))}
            {layers.stalled.length > 0 && (
                <details className="rs-assembly-layer">
                    <summary>
                        Still blocked: {layers.stalled.length} exit options
                    </summary>
                    <ul className="rs-layer-options">
                        {layers.stalled.map((option) => (
                            <OptionCard key={option.id} option={option} model={model} />
                        ))}
                    </ul>
                </details>
            )}
            {layers.unassessedPieceIds.length > 0 && (
                <section className="rs-assembly-layer" aria-label="Pieces without a removal assessment">
                    <h3>Not assessed</h3>
                    <p>
                        No full-removal operation or geometric candidate is available for:{' '}
                        {layers.unassessedPieceIds.map((id) => pieceLabel(model, id)).join('; ')}
                    </p>
                </section>
            )}
            {layers.remainingPieceIds.length > 0 && (
                <p className="rs-assembly-layers__summary">
                    {layers.assessedPieceIds.length} of {model.occurrences.filter((item) => item.kind === 'piece').length}
                    {' '}components have a modeled option or candidate exit. {layers.remainingPieceIds.length}
                    {' '}remain blocked, deferred, or not yet peeled; {layers.unassessedPieceIds.length} have no assessment.
                </p>
            )}
        </section>
    );
}
