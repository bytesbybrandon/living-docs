// Deterministic force-ish layout for the console hero scene.
// Positions are computed once in Node and embedded, so the page looks identical
// without JavaScript and the runtime script only animates.

function mulberry32(seed) {
  let a = seed >>> 0;
  return function random() {
    a |= 0;
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function layoutGraph(graph = {}) {
  const W = 1000;
  const H = 560;
  const seed = Number.isFinite(graph.seed) ? graph.seed : 7;
  const random = mulberry32(seed);
  const count = Math.max(40, Math.min(700, Number(graph.nodeCount) || 230));
  const clusters = 5;
  const centers = Array.from({ length: clusters }, (_, i) => {
    const angle = (i / clusters) * Math.PI * 2 - Math.PI / 2;
    const radius = 300 + random() * 40;
    return { x: W / 2 + Math.cos(angle) * radius, y: H / 2 + Math.sin(angle) * radius * 0.72 };
  });

  const activeId = graph.active?.id || 'active';
  const labels = (graph.labels || []).slice(0, 9);
  const nodes = [];
  const reserved = [
    { x: W * 0.62, y: H * 0.52, id: activeId, label: 'active' },
    ...labels.map((label, i) => {
      const angle = (i / Math.max(1, labels.length)) * Math.PI * 2 + 0.6;
      const radius = 190 + (i % 3) * 70;
      return { x: W / 2 + Math.cos(angle) * radius * 1.15, y: H / 2 + Math.sin(angle) * radius * 0.6, id: label, label };
    })
  ];

  for (const item of reserved) {
    nodes.push({ id: item.id, x: item.x, y: item.y, r: item.id === activeId ? 4.6 : 2.6, active: item.id === activeId, label: item.label === 'active' ? '' : item.label });
  }

  let clusterIndex = 0;
  for (let i = 0; i < count; i++) {
    clusterIndex = i % clusters;
    const center = centers[clusterIndex];
    const angle = random() * Math.PI * 2;
    const spread = Math.pow(random(), 0.62) * (140 + (i % 5) * 22);
    const jitter = random() * 18;
    nodes.push({
      id: `n${i}`,
      x: Math.max(24, Math.min(W - 24, center.x + Math.cos(angle) * spread * 1.55 + jitter)),
      y: Math.max(24, Math.min(H - 24, center.y + Math.sin(angle) * spread * 0.9 + jitter)),
      r: 0.9 + random() * 1.5,
      cluster: clusterIndex,
      label: ''
    });
  }

  const edges = [];
  const byCluster = new Map();
  for (const node of nodes.slice(reserved.length)) {
    if (!byCluster.has(node.cluster)) byCluster.set(node.cluster, []);
    byCluster.get(node.cluster).push(node);
  }
  for (const [, members] of byCluster) {
    for (let i = 0; i < members.length; i++) {
      const from = members[i];
      const links = 1 + Math.floor(random() * 2);
      for (let k = 0; k < links; k++) {
        const to = members[Math.floor(random() * members.length)];
        if (to && to !== from) edges.push([from.id, to.id]);
      }
    }
  }
  const activeNode = nodes.find(node => node.id === activeId);
  const hubs = nodes.filter(node => node.label).slice(0, 7);
  for (const hub of hubs) {
    if (!activeNode || hub === activeNode) continue;
    edges.push([hub.id, activeNode.id]);
  }

  return {
    width: W,
    height: H,
    nodes,
    edges,
    active: activeId,
    labelNodes: nodes.filter(node => node.label).map(node => ({ id: node.id, text: node.label, x: node.x, y: node.y }))
  };
}

export function graphPayload(graph) {
  const layout = layoutGraph(graph);
  const index = new Map(layout.nodes.map((node, i) => [node.id, i]));
  return {
    ok: 1,
    width: layout.width,
    height: layout.height,
    active: index.get(layout.active) ?? -1,
    nodes: layout.nodes.map(node => ({
      x: Math.round(node.x * 10) / 10,
      y: Math.round(node.y * 10) / 10,
      r: Math.round(node.r * 10) / 10
    })),
    edges: layout.edges
      .map(([from, to]) => [index.get(from), index.get(to)])
      .filter(([a, b]) => a !== undefined && b !== undefined)
      .slice(0, 900),
    labels: layout.labelNodes.map(node => ({ text: node.text, x: Math.round(node.x), y: Math.round(node.y) }))
  };
}
