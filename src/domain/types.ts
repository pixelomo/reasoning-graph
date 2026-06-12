type NodeId = string & { readonly __brand: 'NodeId' }
type EdgeId = string & { readonly __brand: 'EdgeId' }

export type Node = 
  | { kind: 'concept'; id: NodeId; label: string; weight: number }
  | { kind: 'relation'; id: NodeId; from: NodeId; to: NodeId; strength: number }
  | { kind: 'rule'; id: NodeId; premise: string[]; conclusion: string }

export type Edge =
  | { kind: 'supports';    id: EdgeId; from: NodeId; to: NodeId; }
  | { kind: 'contradicts'; id: EdgeId; from: NodeId; to: NodeId; }
  | { kind: 'derives';     id: EdgeId; from: NodeId; to: NodeId; }

export function nodeId(raw: string): NodeId { return raw as NodeId }
export function edgeId(raw: string): EdgeId { return raw as EdgeId }

function assertNever(x: never): never {
  throw new Error(`Unhandled variant: ${JSON.stringify(x)}`)
}

export function describeNode(node: Node): string {
  switch (node.kind) {
    case 'concept': return node.label; // narrowed
    case 'relation': return `${node.from} -> ${node.to}`;
    case 'rule': return node.conclusion;
    default: assertNever(node)
  }
}

export function describeEdge(edge: Edge): string {
  switch (edge.kind) {
    case 'supports': return `${edge.from} supports ${edge.to}`;
    case 'contradicts': return `${edge.from} contradicts ${edge.to}`;
    case 'derives': return `${edge.from} derives ${edge.to}`;
    default: assertNever(edge)
  }
}