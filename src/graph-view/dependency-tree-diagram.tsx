import { useMemo } from 'react';
import {
    Background,
    Controls,
    MarkerType,
    MiniMap,
    Position,
    ReactFlow,
    type Edge,
    type Node
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { graphlib, layout } from '@dagrejs/dagre';
import type {
    DependencyRelation,
    DependencyTree,
    DependencyTreeNode
} from '../domain/dependency-tree.js';

export type TreeDirection = 'TB' | 'LR';

export interface DependencyTreeDiagramProps {
    tree: DependencyTree;
    direction?: TreeDirection;
    highlightedId?: string;
    activeStepPieceId?: string;
    compact?: boolean;
    onSelectNode?: (occurrenceId: string) => void;
    onReroot?: (occurrenceId: string) => void;
}

const NODE_WIDTH = 228;
const NODE_HEIGHT = 82;

const RELATION_STYLE: Record<
    DependencyRelation,
    { stroke: string; strokeWidth: number; strokeDasharray?: string }
> = {
    requires: { stroke: '#b92324', strokeWidth: 2.2 },
    'candidate-blocker': { stroke: '#c58f00', strokeWidth: 2, strokeDasharray: '4 3' },
    'intact-unit': { stroke: '#14683d', strokeWidth: 2, strokeDasharray: '6 3' },
    'connected-to': { stroke: '#0b57d0', strokeWidth: 1.5 },
    contains: { stroke: '#5c666d', strokeWidth: 1.2, strokeDasharray: '6 4' }
};

function nodeBackground(node: DependencyTreeNode): string {
    if (node.role === 'target') return '#fde8e8';
    if (node.role === 'intact-unit') return '#e8f7ee';
    if (node.removalOrder !== null) return '#fff4cc';
    if (node.role === 'assembly') return '#f3f5f6';
    return '#e8f7ee';
}

function nodeBorder(
    node: DependencyTreeNode,
    isHighlighted: boolean,
    isActiveStep: boolean
): string {
    if (isActiveStep) return '3px solid #c81e1e';
    if (isHighlighted) return '3px solid #0b57d0';
    if (node.role === 'target') return '2.5px solid #c81e1e';
    if (node.role === 'intact-unit') return '2px solid #14683d';
    if (node.removalOrder !== null) return '2px solid #c58f00';
    if (node.role === 'assembly') return '1.5px dashed #5c666d';
    return '2px solid #14683d';
}

function renderNodeLabel(node: DependencyTreeNode, isActiveStep: boolean) {
    const shortId = node.id.split('/').at(-1) ?? node.id;
    const roleTag =
        node.role === 'target'
            ? 'GESUCHT'
            : node.role === 'intact-unit'
              ? 'INTAKTE BAUGRUPPE'
              : node.removalOrder !== null
                ? 'VERBINDUNG LÖSEN'
                : node.role === 'assembly'
                  ? 'BAUGRUPPE'
                  : 'BLEIBT';

    const orderBadge =
        node.removalOrder !== null && node.reassemblyOrder !== null
            ? `Aus #${node.removalOrder} · Ein #${node.reassemblyOrder}`
            : node.inManual
              ? `Step ${node.manualStepOrdinals.join(', ')}`
              : null;

    const dofLabel =
        node.remainingTranslationalDof !== null
            ? node.remainingTranslationalDof === 0
                ? 'DOF 0 (gesperrt)'
                : `DOF ${node.remainingTranslationalDof}`
            : node.evidenceTier;

    return (
        <div className="rs-tree-node">
            <div className="rs-tree-node__top">
                <span className={`rs-tree-node__tag rs-tree-node__tag--${node.role}`}>
                    {roleTag}
                </span>
                {orderBadge && (
                    <span
                        className={`rs-tree-node__manual ${
                            isActiveStep ? 'rs-tree-node__manual--active' : ''
                        }`}
                    >
                        {orderBadge}
                    </span>
                )}
            </div>
            <div className="rs-tree-node__name">{node.commonName}</div>
            <div className="rs-tree-node__meta">
                <code>{shortId}</code>
                <span>·</span>
                <span>{dofLabel}</span>
            </div>
        </div>
    );
}

/**
 * Interactive graphical dependency tree for a single target occurrence.
 * Uses dagre on non-cycle edges for a crisp hierarchical tree layout while still
 * rendering cycle back-edges transparently so nothing is hidden.
 */
export function DependencyTreeDiagram({
    tree,
    direction = 'TB',
    highlightedId,
    activeStepPieceId,
    compact = false,
    onSelectNode,
    onReroot
}: DependencyTreeDiagramProps) {
    const { nodes, edges } = useMemo(() => {
        if (tree.nodes.length === 0) {
            return { nodes: [] as Node[], edges: [] as Edge[] };
        }

        const dag = new graphlib.Graph()
            .setGraph({
                rankdir: direction,
                nodesep: compact ? 24 : 36,
                ranksep: compact ? 64 : 88,
                marginx: 20,
                marginy: 20
            })
            .setDefaultEdgeLabel(() => ({}));

        for (const node of tree.nodes) {
            dag.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
        }

        // Feed only acyclic tree edges to dagre so rank levels stay crisp and hierarchical.
        for (const edge of tree.edges) {
            if (!edge.isCycle && dag.hasNode(edge.source) && dag.hasNode(edge.target)) {
                dag.setEdge(edge.source, edge.target);
            }
        }

        layout(dag);

        const sourcePosition = direction === 'TB' ? Position.Bottom : Position.Right;
        const targetPosition = direction === 'TB' ? Position.Top : Position.Left;

        const flowNodes: Node[] = tree.nodes.map((node) => {
            const pos = dag.node(node.id);
            const isHighlighted = highlightedId === node.id;
            const isActiveStep = activeStepPieceId === node.id;

            return {
                id: node.id,
                position: {
                    x: (pos?.x ?? 0) - NODE_WIDTH / 2,
                    y: (pos?.y ?? 0) - NODE_HEIGHT / 2
                },
                sourcePosition,
                targetPosition,
                data: {
                    label: renderNodeLabel(node, isActiveStep)
                },
                style: {
                    width: NODE_WIDTH,
                    minHeight: NODE_HEIGHT,
                    padding: 0,
                    borderRadius: 6,
                    background: nodeBackground(node),
                    border: nodeBorder(node, isHighlighted, isActiveStep),
                    boxShadow: isActiveStep
                        ? '0 0 0 4px rgba(185, 35, 36, 0.22)'
                        : isHighlighted
                          ? '0 0 0 4px rgba(11, 87, 208, 0.2)'
                          : '0 1px 2px rgba(23, 33, 39, 0.08)'
                }
            };
        });

        const flowEdges: Edge[] = tree.edges.map((edge) => {
            const base = RELATION_STYLE[edge.relation];
            return {
                id: edge.id,
                source: edge.source,
                target: edge.target,
                ...(compact ? {} : { label: edge.label }),
                animated: edge.relation === 'requires' && !edge.isCycle,
                ...(edge.relation === 'connected-to'
                    ? {}
                    : {
                          markerEnd: {
                              type: MarkerType.ArrowClosed,
                              color: base.stroke,
                              width: 16,
                              height: 16
                          }
                      }),
                style: {
                    stroke: base.stroke,
                    strokeWidth: edge.isCycle ? 1.2 : base.strokeWidth,
                    ...(edge.isCycle
                        ? { strokeDasharray: '2 4' }
                        : base.strokeDasharray
                          ? { strokeDasharray: base.strokeDasharray }
                          : {}),
                    opacity: edge.isCycle ? 0.45 : 0.92
                },
                labelStyle: {
                    fontSize: 11,
                    fill: '#172127',
                    fontWeight: 500
                },
                labelBgStyle: {
                    fill: '#ffffff',
                    fillOpacity: 0.9
                },
                labelBgPadding: [4, 2] as [number, number]
            };
        });

        return { nodes: flowNodes, edges: flowEdges };
    }, [tree, direction, highlightedId, activeStepPieceId, compact]);

    return (
        <div
            className={`rs-tree-canvas ${compact ? 'rs-tree-canvas--compact' : ''}`}
            data-testid="dependency-tree-diagram"
        >
            <ReactFlow
                key={`${tree.rootId}:${direction}:${tree.edges.length}`}
                nodes={nodes}
                edges={edges}
                fitView
                fitViewOptions={{ padding: 0.16 }}
                nodesDraggable={false}
                nodesConnectable={false}
                minZoom={0.15}
                maxZoom={2}
                onNodeClick={(_, node) => onSelectNode?.(node.id)}
                onNodeDoubleClick={(_, node) => onReroot?.(node.id)}
            >
                <Background gap={20} size={1} color="#d5dade" />
                <Controls showInteractive={false} />
                {!compact && (
                    <MiniMap
                        pannable
                        zoomable
                        nodeColor={(node) =>
                            typeof node.style?.background === 'string'
                                ? node.style.background
                                : '#ffffff'
                        }
                    />
                )}
            </ReactFlow>
        </div>
    );
}
