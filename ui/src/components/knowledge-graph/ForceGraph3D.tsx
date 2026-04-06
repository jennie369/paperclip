// ForceGraph3D — Three.js 3D Force-Directed Graph with 10 GoClaw Optimizations
// Core visualization component for Mắt Thần CEO

import { useRef, useMemo, useCallback, useEffect, memo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Text, Html } from "@react-three/drei";
import * as THREE from "three";
import {
  forceSimulation,
  forceManyBody,
  forceLink,
  forceCenter,
  forceCollide,
} from "d3-force-3d";
import type { KGEntity, KGRelation } from "@/api/kg-types";
import {
  ENTITY_TYPES,
  getForceParams,
  getTickCap,
  getDepthOpacity,
  EDGE_DEFAULT,
  EDGE_HIGHLIGHT,
} from "@/lib/kg-config";
import { useGraphStore } from "./useGraphStore";

interface ForceGraph3DProps {
  entities: KGEntity[];
  relations: KGRelation[];
  selectedEntityId?: string;
  onEntityClick: (entity: KGEntity) => void;
  onEntityDoubleClick: (entity: KGEntity) => void;
  maxNodes?: number;
  compact?: boolean;
}

interface SimNode {
  id: string;
  x: number;
  y: number;
  z: number;
  entity: KGEntity;
  degree: number;
}

interface SimLink {
  source: string;
  target: string;
  relation: KGRelation;
}

// ═══════════════════════════════════════════════════════
// ③ Memoized EntityNode — skip viewport interactions
// ═══════════════════════════════════════════════════════
const EntityNode = memo(function EntityNode({
  node,
  isSelected,
  opacity,
  showLabel,
  onClick,
  onDoubleClick,
}: {
  node: SimNode;
  isSelected: boolean;
  opacity: number;
  showLabel: boolean;
  onClick: () => void;
  onDoubleClick: () => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const config = ENTITY_TYPES[node.entity.entity_type as keyof typeof ENTITY_TYPES];
  const color = config?.color || "#6B7280";
  const mass = config?.mass || 1.0;
  const radius = 1.2 + mass * 0.6;

  return (
    <group position={[node.x, node.y, node.z]}>
      {/* Node sphere */}
      <mesh
        ref={meshRef}
        onClick={(e) => {
          e.stopPropagation();
          // ⑧ Deferred dialog: setTimeout(0) → INP < 100ms
          setTimeout(onClick, 0);
        }}
        onDoubleClick={(e) => {
          e.stopPropagation();
          setTimeout(onDoubleClick, 0);
        }}
      >
        <sphereGeometry args={[radius, 16, 16]} />
        <meshStandardMaterial
          color={color}
          transparent
          opacity={opacity}
          emissive={isSelected ? color : "#000000"}
          emissiveIntensity={isSelected ? 0.6 : 0}
        />
      </mesh>

      {/* Selection glow ring */}
      {isSelected && (
        <mesh>
          <ringGeometry args={[radius + 0.4, radius + 0.8, 32]} />
          <meshBasicMaterial color="#FFBD59" transparent opacity={0.7} side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* Label */}
      {showLabel && opacity > 0.2 && (
        <Text
          position={[0, radius + 1.2, 0]}
          fontSize={1.2}
          color={opacity > 0.5 ? "#E5E7EB" : "#9CA3AF"}
          anchorX="center"
          anchorY="bottom"
          outlineWidth={0.05}
          outlineColor="#000000"
        >
          {node.entity.name.length > 18
            ? node.entity.name.slice(0, 16) + "…"
            : node.entity.name}
        </Text>
      )}
    </group>
  );
});

// ═══════════════════════════════════════════════════════
// Edge Line component
// ═══════════════════════════════════════════════════════
const EdgeLine = memo(function EdgeLine({
  from,
  to,
  highlighted,
}: {
  from: [number, number, number];
  to: [number, number, number];
  highlighted: boolean;
}) {
  const points = useMemo(
    () => [new THREE.Vector3(...from), new THREE.Vector3(...to)],
    [from, to],
  );
  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry().setFromPoints(points);
    return g;
  }, [points]);

  const style = highlighted ? EDGE_HIGHLIGHT : EDGE_DEFAULT;

  return (
    <line geometry={geometry}>
      <lineBasicMaterial
        color={style.color}
        transparent
        opacity={style.opacity}
        linewidth={style.width}
      />
    </line>
  );
});

// ═══════════════════════════════════════════════════════
// Auto-rotate for compact mode
// ═══════════════════════════════════════════════════════
function AutoRotate() {
  const { camera } = useThree();
  useFrame((_state, delta) => {
    camera.position.applyAxisAngle(new THREE.Vector3(0, 1, 0), delta * 0.15);
    camera.lookAt(0, 0, 0);
  });
  return null;
}

// ═══════════════════════════════════════════════════════
// Main ForceGraph3D Component
// ═══════════════════════════════════════════════════════
export default function ForceGraph3D({
  entities,
  relations,
  selectedEntityId,
  onEntityClick,
  onEntityDoubleClick,
  maxNodes = 50,
  compact = false,
}: ForceGraph3DProps) {
  const { highlightedIds, showLabels } = useGraphStore();

  // ① O(1) entity lookup via Map
  const entityMap = useMemo(
    () => new Map(entities.map((e) => [e.id, e])),
    [entities],
  );

  // ⑤ Degree centrality sorting → top N
  const { rankedEntities, visibleRelations } = useMemo(() => {
    const degreeMap = new Map<string, number>();
    for (const r of relations) {
      degreeMap.set(r.source_entity_id, (degreeMap.get(r.source_entity_id) || 0) + 1);
      degreeMap.set(r.target_entity_id, (degreeMap.get(r.target_entity_id) || 0) + 1);
    }

    const ranked = [...entities]
      .sort((a, b) => (degreeMap.get(b.id) || 0) - (degreeMap.get(a.id) || 0))
      .slice(0, maxNodes);

    const visibleIds = new Set(ranked.map((e) => e.id));
    const visible = relations.filter(
      (r) => visibleIds.has(r.source_entity_id) && visibleIds.has(r.target_entity_id),
    );

    return {
      rankedEntities: ranked.map((e) => ({
        ...e,
        degree: degreeMap.get(e.id) || 0,
      })),
      visibleRelations: visible,
    };
  }, [entities, relations, maxNodes]);

  // ⑥ Adaptive force params
  const forceParams = useMemo(
    () => getForceParams(rankedEntities.length),
    [rankedEntities.length],
  );

  // ④ Tick cap
  const tickCap = useMemo(
    () => getTickCap(rankedEntities.length),
    [rankedEntities.length],
  );

  // Run d3-force-3d simulation
  const { nodes, links } = useMemo(() => {
    const simNodes: SimNode[] = rankedEntities.map((e) => ({
      id: e.id,
      x: (Math.random() - 0.5) * 50,
      y: (Math.random() - 0.5) * 50,
      z: (Math.random() - 0.5) * 50,
      entity: e,
      degree: e.degree,
    }));

    const nodeIds = new Set(simNodes.map((n) => n.id));
    const simLinks: SimLink[] = visibleRelations
      .filter((r) => nodeIds.has(r.source_entity_id) && nodeIds.has(r.target_entity_id))
      .map((r) => ({
        source: r.source_entity_id,
        target: r.target_entity_id,
        relation: r,
      }));

    // Run simulation synchronously with tick cap
    const sim = forceSimulation(simNodes, 3)
      .force("charge", forceManyBody().strength(forceParams.charge))
      .force(
        "link",
        forceLink(simLinks)
          .id((d: any) => d.id)
          .distance(forceParams.linkDistance),
      )
      .force("center", forceCenter(0, 0, 0).strength(forceParams.centerStrength))
      .force("collide", forceCollide(forceParams.collideRadius))
      .stop();

    for (let i = 0; i < tickCap; i++) {
      sim.tick();
    }

    return { nodes: simNodes, links: simLinks };
  }, [rankedEntities, visibleRelations, forceParams, tickCap]);

  // ② Pre-computed node position lookup
  const nodePositions = useMemo(
    () => new Map(nodes.map((n) => [n.id, [n.x, n.y, n.z] as [number, number, number]])),
    [nodes],
  );

  // ⑩ Depth-based opacity
  const getNodeOpacity = useCallback(
    (nodeId: string) => {
      if (!selectedEntityId) return 0.85;
      if (nodeId === selectedEntityId) return 1.0;
      const depth = highlightedIds.get(nodeId);
      if (depth !== undefined) return getDepthOpacity(depth);
      return 0.1; // unconnected
    },
    [selectedEntityId, highlightedIds],
  );

  // ⑨ Edge highlight check
  const isEdgeHighlighted = useCallback(
    (link: SimLink) => {
      if (!selectedEntityId) return false;
      return (
        link.source === selectedEntityId ||
        link.target === selectedEntityId ||
        highlightedIds.has(link.source) ||
        highlightedIds.has(link.target)
      );
    },
    [selectedEntityId, highlightedIds],
  );

  return (
    <div className="w-full h-full" style={{ minHeight: compact ? 200 : 500 }}>
      <Canvas
        camera={{
          position: [0, 0, compact ? 80 : 120],
          fov: 60,
          near: 0.1,
          far: 1000,
        }}
        style={{ background: "transparent" }}
      >
        <ambientLight intensity={0.6} />
        <pointLight position={[50, 50, 50]} intensity={0.8} />
        <pointLight position={[-50, -50, -50]} intensity={0.3} />

        {/* Edges */}
        {links.map((link) => {
          const from = nodePositions.get(
            typeof link.source === "string" ? link.source : (link.source as any).id,
          );
          const to = nodePositions.get(
            typeof link.target === "string" ? link.target : (link.target as any).id,
          );
          if (!from || !to) return null;
          return (
            <EdgeLine
              key={link.relation.id}
              from={from}
              to={to}
              highlighted={isEdgeHighlighted(link)}
            />
          );
        })}

        {/* Nodes */}
        {nodes.map((node) => (
          <EntityNode
            key={node.id}
            node={node}
            isSelected={node.id === selectedEntityId}
            opacity={getNodeOpacity(node.id)}
            showLabel={compact ? false : showLabels}
            onClick={() => onEntityClick(node.entity)}
            onDoubleClick={() => onEntityDoubleClick(node.entity)}
          />
        ))}

        {/* Controls */}
        {compact ? (
          <AutoRotate />
        ) : (
          <OrbitControls
            enableDamping
            dampingFactor={0.1}
            rotateSpeed={0.5}
            zoomSpeed={0.8}
            minDistance={20}
            maxDistance={300}
          />
        )}
      </Canvas>
    </div>
  );
}
