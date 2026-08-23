export interface LayoutInput {
  id: string;
  startMin: number;
  endMin: number;
}

export interface LayoutSlot {
  col: number;
  cols: number;
}

/**
 * Side-by-side layout for overlapping calendar blocks (classic day-view algorithm): blocks
 * that overlap in time are grouped into a cluster and each gets a lane within it, so two
 * things at the same hour render as narrower columns next to each other instead of one
 * hiding the other. Blocks that don't overlap anything keep the full width (cols: 1).
 */
export function layoutOverlaps(blocks: LayoutInput[]): Map<string, LayoutSlot> {
  const result = new Map<string, LayoutSlot>();
  const sorted = [...blocks].sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin);

  let cluster: LayoutInput[] = [];
  let clusterEnd = -Infinity;

  const flush = () => {
    if (cluster.length === 0) return;
    const laneEnds: number[] = [];
    const laneOf = new Map<string, number>();
    for (const b of cluster) {
      let lane = laneEnds.findIndex((end) => end <= b.startMin);
      if (lane === -1) {
        lane = laneEnds.length;
        laneEnds.push(b.endMin);
      } else {
        laneEnds[lane] = b.endMin;
      }
      laneOf.set(b.id, lane);
    }
    const cols = laneEnds.length;
    for (const b of cluster) result.set(b.id, { col: laneOf.get(b.id)!, cols });
    cluster = [];
    clusterEnd = -Infinity;
  };

  for (const b of sorted) {
    if (cluster.length > 0 && b.startMin >= clusterEnd) flush();
    cluster.push(b);
    clusterEnd = Math.max(clusterEnd, b.endMin);
  }
  flush();

  return result;
}
