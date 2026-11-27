/**
 * A schematic drawing field for the concept gallery (plan 02 §5.2 · ticket 4).
 *
 * The real Three.js view arrives with ticket 7. Until then the gallery draws the piece, a ghost at
 * the pose it started from, and one red arrow with a contrasting edge, because those are the
 * things §5.4 asks a teammate to read off the screen — which piece, which way, what happens next —
 * and arrow legibility and crop are worth settling before a renderer exists.
 *
 * It is a schematic and says so. It is never mounted by the production host.
 */
import type { ReactNode } from 'react';
import './schematic-scene.css';

export type SchematicSceneProps = Readonly<{
    partLabel: string;
    directionLabel: string;
    /** Which way the piece travels. The ghost sits behind it, on the way it came. */
    heading?: 'left' | 'right' | 'up' | 'down';
    /** A neighbour that hides the piece, drawn translucent ahead of it. */
    obstruction?: string;
}>;

/** The piece stays centred; everything else is placed relative to the direction of travel. */
const PART = { x: 196, y: 118, width: 76, height: 64 } as const;
const OFFSET = 86;

type Geometry = Readonly<{
    ghost: Readonly<{ x: number; y: number }>;
    arrow: Readonly<{ x1: number; y1: number; x2: number; y2: number }>;
    head: string;
    obstruction: Readonly<{ x: number; y: number; width: number; height: number }>;
    obstructionLabel: Readonly<{ x: number; y: number }>;
}>;

function geometry(heading: NonNullable<SchematicSceneProps['heading']>): Geometry {
    const centreX = PART.x + PART.width / 2;
    const centreY = PART.y + PART.height / 2;
    const shift = (dx: number, dy: number) => ({ x: centreX + dx, y: centreY + dy });

    switch (heading) {
        case 'left':
            return {
                ghost: shift(OFFSET, 0),
                arrow: { x1: PART.x - 6, y1: centreY, x2: PART.x - 74, y2: centreY },
                head: `${PART.x - 92},${centreY} ${PART.x - 70},${centreY - 13} ${PART.x - 70},${centreY + 13}`,
                obstruction: { x: PART.x - 150, y: 88, width: 56, height: 124 },
                obstructionLabel: { x: PART.x - 122, y: 232 }
            };
        case 'up':
            return {
                ghost: shift(0, OFFSET),
                arrow: { x1: centreX, y1: PART.y - 6, x2: centreX, y2: PART.y - 74 },
                head: `${centreX},${PART.y - 92} ${centreX - 13},${PART.y - 70} ${centreX + 13},${PART.y - 70}`,
                obstruction: { x: 206, y: 8, width: 56, height: 40 },
                obstructionLabel: { x: 234, y: 62 }
            };
        case 'down':
            return {
                ghost: shift(0, -OFFSET),
                arrow: { x1: centreX, y1: PART.y + PART.height + 6, x2: centreX, y2: PART.y + PART.height + 74 },
                head: `${centreX},${PART.y + PART.height + 92} ${centreX - 13},${PART.y + PART.height + 70} ${centreX + 13},${PART.y + PART.height + 70}`,
                obstruction: { x: 206, y: 252, width: 56, height: 40 },
                obstructionLabel: { x: 234, y: 246 }
            };
        case 'right':
            return {
                ghost: shift(-OFFSET, 0),
                arrow: { x1: PART.x + PART.width + 6, y1: centreY, x2: PART.x + PART.width + 74, y2: centreY },
                head: `${PART.x + PART.width + 92},${centreY} ${PART.x + PART.width + 70},${centreY - 13} ${PART.x + PART.width + 70},${centreY + 13}`,
                obstruction: { x: PART.x + PART.width + 100, y: 88, width: 56, height: 124 },
                obstructionLabel: { x: PART.x + PART.width + 128, y: 232 }
            };
    }
}

export function SchematicScene({
    partLabel,
    directionLabel,
    heading = 'right',
    obstruction
}: SchematicSceneProps): ReactNode {
    const scene = geometry(heading);
    const labelX = PART.x + PART.width / 2;
    const labelY = PART.y + PART.height / 2 + 5;

    return (
        <div className="rs-schematic" data-schematic="true">
            <svg
                viewBox="0 0 460 300"
                role="img"
                aria-label={`${partLabel} moves ${directionLabel.toLowerCase()}`}
            >
                <title>{`${partLabel} moves ${directionLabel.toLowerCase()}`}</title>

                {obstruction === undefined ? null : (
                    <>
                        <rect
                            className="rs-schematic__obstruction"
                            x={scene.obstruction.x}
                            y={scene.obstruction.y}
                            width={scene.obstruction.width}
                            height={scene.obstruction.height}
                            rx="6"
                        />
                        <text
                            className="rs-schematic__tag"
                            x={scene.obstructionLabel.x}
                            y={scene.obstructionLabel.y}
                            textAnchor="middle"
                        >
                            {obstruction}
                        </text>
                    </>
                )}

                <rect
                    className="rs-schematic__ghost"
                    x={scene.ghost.x - PART.width / 2}
                    y={scene.ghost.y - PART.height / 2}
                    width={PART.width}
                    height={PART.height}
                    rx="6"
                />

                {/* The arrow is drawn first and the piece over it, so nothing crosses the label. */}
                <line
                    className="rs-schematic__arrow-edge"
                    x1={scene.arrow.x1}
                    y1={scene.arrow.y1}
                    x2={scene.arrow.x2}
                    y2={scene.arrow.y2}
                />
                <line
                    className="rs-schematic__arrow"
                    x1={scene.arrow.x1}
                    y1={scene.arrow.y1}
                    x2={scene.arrow.x2}
                    y2={scene.arrow.y2}
                />
                <polygon className="rs-schematic__head" points={scene.head} />

                <rect
                    className="rs-schematic__part"
                    x={PART.x}
                    y={PART.y}
                    width={PART.width}
                    height={PART.height}
                    rx="6"
                />
                <text
                    className="rs-schematic__tag rs-schematic__tag--part"
                    x={labelX}
                    y={labelY}
                    textAnchor="middle"
                >
                    {partLabel}
                </text>
            </svg>
            <p className="rs-schematic__note">
                dashed outline: where {partLabel} started · schematic, the live view arrives with
                ticket 7
            </p>
        </div>
    );
}
