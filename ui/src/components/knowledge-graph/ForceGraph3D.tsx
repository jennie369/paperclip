// ForceGraph3D — Three.js 3D Force-Directed Graph
// Core visualization component for Mắt Thần CEO
// v2 — Neon Glow + Multi-particle + CameraAutoFit + Style Panel support

import { useRef, useMemo, useCallback, useEffect, memo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Text, Billboard, Line, Stars } from "@react-three/drei";
import * as THREE from "three";
// @ts-ignore
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
  getDepthOpacity,
  getEntityMass,
} from "@/lib/kg-config";
import { useGraphStore } from "./useGraphStore";
import type { GraphStyle } from "./GraphStylePanel";
import { GRAPH_PRESETS } from "./GraphStylePanel";

const DEFAULT_EDGE_DEFAULT_COLOR = "#374151";
const DEFAULT_EDGE_HIGHLIGHT_COLOR = "#FFBD59";
const DEFAULT_EDGE_DEFAULT_OPACITY = 0.2;
const DEFAULT_EDGE_DEFAULT_WIDTH = 1;
const DEFAULT_EDGE_HIGHLIGHT_WIDTH = 3;

interface ForceGraph3DProps {
  entities: KGEntity[];
  relations: KGRelation[];
  selectedEntityId?: string;
  onEntityClick: (entity: KGEntity) => void;
  onEntityDoubleClick: (entity: KGEntity) => void;
  maxNodes?: number;
  compact?: boolean;
  graphStyle?: GraphStyle;
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
// CameraAutoFit — re-frame camera when canvas resizes
// or when nodes change
// ═══════════════════════════════════════════════════════
function CameraAutoFit({ nodes }: { nodes: SimNode[] }) {
  const { camera, size } = useThree();
  const fitted = useRef(false);

  useEffect(() => {
    if (!nodes.length) return;
    // Compute bounding box of all nodes
    const box = new THREE.Box3();
    nodes.forEach((n) => box.expandByPoint(new THREE.Vector3(n.x, n.y, n.z)));
    const sphere = new THREE.Sphere();
    box.getBoundingSphere(sphere);
    const dist = Math.max(sphere.radius * 2.8, 40);
    camera.position.set(0, 0, dist);
    camera.lookAt(sphere.center);
    (camera as THREE.PerspectiveCamera).updateProjectionMatrix?.();
    fitted.current = true;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, size.width, size.height]);

  return null;
}

// ═══════════════════════════════════════════════════════
// Single particle — animates along edge at offset phase
// ═══════════════════════════════════════════════════════
function EdgeParticle({
  from,
  to,
  color,
  size,
  speed,
  phase = 0,
  alpha = 1.0,
  glow = 2.5,
  curve,
}: {
  from: [number, number, number];
  to: [number, number, number];
  color: string;
  size: number;
  speed: number;
  phase?: number;
  alpha?: number;
  glow?: number;
  curve?: THREE.CatmullRomCurve3 | null;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!meshRef.current) return;
    const t = ((state.clock.elapsedTime * speed + phase) % 1 + 1) % 1;
    let x: number, y: number, z: number;
    if (curve) {
      const p = curve.getPoint(t);
      x = p.x; y = p.y; z = p.z;
    } else {
      x = from[0] + (to[0] - from[0]) * t;
      y = from[1] + (to[1] - from[1]) * t;
      z = from[2] + (to[2] - from[2]) * t;
    }
    meshRef.current.position.set(x, y, z);
    if (glowRef.current) glowRef.current.position.set(x, y, z);
  });

  return (
    <>
      {/* Bright core */}
      <mesh ref={meshRef}>
        <sphereGeometry args={[size, 8, 8]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={alpha}
          toneMapped={false}
        />
      </mesh>
      {/* Soft halo glow around each particle */}
      <mesh ref={glowRef}>
        <sphereGeometry args={[size * glow, 8, 8]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.25 * alpha}
          toneMapped={false}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </>
  );
}

// ═══════════════════════════════════════════════════════
// Edge Line + multiple particles
// ═══════════════════════════════════════════════════════
const EdgeLine = memo(function EdgeLine({
  from,
  to,
  highlighted,
  graphStyle,
}: {
  from: [number, number, number];
  to: [number, number, number];
  highlighted: boolean;
  graphStyle: GraphStyle;
}) {
  const edgeColor = highlighted
    ? graphStyle.edgeHighlightColor
    : graphStyle.edgeDefaultColor;
  const edgeOpacity = highlighted
    ? graphStyle.edgeHighlightOpacity
    : graphStyle.edgeDefaultOpacity;
  const edgeWidth = highlighted
    ? graphStyle.edgeHighlightWidth
    : (graphStyle.edgeDefaultWidth ?? 1);

  // Ambient particle count: on highlighted edge use particleCount, else use ambient settings
  const showAmbient = !highlighted && graphStyle.ambientParticles;
  const pCount = highlighted ? graphStyle.particleCount : (showAmbient ? graphStyle.ambientParticleCount : 0);
  const pAlpha = highlighted ? 1.0 : graphStyle.ambientParticleAlpha;
  const pGlow = graphStyle.particleGlow ?? 2.5;
  const ambientSize = graphStyle.ambientParticleSize ?? 0.65;

  // Curved edge — CatmullRom bow in XY plane perpendicular to the segment
  const { points, curve } = useMemo(() => {
    const bowAmt = graphStyle.edgeCurve ?? 0;
    if (bowAmt <= 0.01) {
      return { points: [from, to] as [number, number, number][], curve: null as THREE.CatmullRomCurve3 | null };
    }
    const dx = to[0] - from[0];
    const dy = to[1] - from[1];
    const dz = to[2] - from[2];
    const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (len < 0.001) {
      return { points: [from, to] as [number, number, number][], curve: null as THREE.CatmullRomCurve3 | null };
    }
    const bow = bowAmt * len * 0.2;
    const midX = (from[0] + to[0]) / 2 + (-dy / len) * bow;
    const midY = (from[1] + to[1]) / 2 + (dx / len) * bow;
    const midZ = (from[2] + to[2]) / 2;
    const c = new THREE.CatmullRomCurve3([
      new THREE.Vector3(from[0], from[1], from[2]),
      new THREE.Vector3(midX, midY, midZ),
      new THREE.Vector3(to[0], to[1], to[2]),
    ]);
    const pts = c.getPoints(20).map((v) => [v.x, v.y, v.z] as [number, number, number]);
    return { points: pts, curve: c };
  }, [from, to, graphStyle.edgeCurve]);

  return (
    <group>
      {/* Main edge line */}
      <Line
        points={points}
        color={edgeColor}
        transparent
        opacity={edgeOpacity}
        lineWidth={edgeWidth}
      />
      {/* Extra glow line when highlighted */}
      {highlighted && (
        <Line
          points={points}
          color={graphStyle.edgeHighlightColor}
          transparent
          opacity={0.18}
          lineWidth={edgeWidth * 3}
        />
      )}
      {/* Particles (highlighted or ambient) */}
      {pCount > 0 &&
        Array.from({ length: pCount }).map((_, i) => (
          <EdgeParticle
            key={i}
            from={from}
            to={to}
            color={graphStyle.particleColor}
            size={graphStyle.particleSize * (highlighted ? 1.0 : ambientSize)}
            speed={graphStyle.particleSpeed * (highlighted ? 1.0 : 0.7)}
            phase={i / pCount}
            alpha={pAlpha}
            glow={pGlow}
            curve={curve}
          />
        ))}
    </group>
  );
});

// ═══════════════════════════════════════════════════════
// Entity Node — Billboard hologram style with neon glow
// ═══════════════════════════════════════════════════════
const EntityNode = memo(function EntityNode({
  node,
  isSelected,
  opacity,
  showLabel,
  onClick,
  onDoubleClick,
  graphStyle,
}: {
  node: SimNode;
  isSelected: boolean;
  opacity: number;
  showLabel: boolean;
  onClick: () => void;
  onDoubleClick: () => void;
  graphStyle: GraphStyle;
}) {
  const config = ENTITY_TYPES[node.entity.entity_type as keyof typeof ENTITY_TYPES];
  const isRoot = node.entity.name.includes("Nguyễn Văn Tiệp") || node.entity.name.includes("Vũ Trụ AI");
  const color = isRoot ? "#f97316" : config?.color || "#6B7280";
  const baseMass = getEntityMass(node.entity.entity_type);
  const radius = (1.2 + baseMass * 0.4) * (isRoot ? 2.5 : 1.0) * (graphStyle.nodeSizeMultiplier ?? 1.0);
  const glowRadius = radius * (1.8 + (graphStyle.nodeGlowIntensity ?? 1.0) * 0.8);
  const glowOpacity = isSelected
    ? 0.45 * (graphStyle.nodeGlowIntensity ?? 1.0)
    : 0.18 * opacity * (graphStyle.nodeGlowIntensity ?? 1.0);

  const shape = graphStyle.nodeShape || "circle";

  const renderShapeCore = () => {
    switch (shape) {
      case "circle":
        return <circleGeometry args={[radius * 0.42, 32]} />;
      case "ring":
        return <ringGeometry args={[radius * 0.2, radius * 0.45, 32]} />;
      case "diamond":
        return <circleGeometry args={[radius * 0.42, 4]} />;
      case "hexagon":
        return <circleGeometry args={[radius * 0.42, 6]} />;
      case "cross":
        return <planeGeometry args={[radius * 0.8, radius * 0.2]} />;
      default:
        return <circleGeometry args={[radius * 0.42, 32]} />;
    }
  };

  const renderOuterRing = () => {
    return shape === "circle" || shape === "ring" ? (
      <ringGeometry args={[radius * 0.72, radius, 32]} />
    ) : shape === "diamond" ? (
      <ringGeometry args={[radius * 0.72, radius, 4]} />
    ) : shape === "hexagon" ? (
      <ringGeometry args={[radius * 0.72, radius, 6]} />
    ) : (
      <ringGeometry args={[radius * 0.72, radius, 32]} />
    );
  };

  return (
    <group position={[node.x, node.y, node.z]}>
      <Billboard follow lockX={false} lockY={false} lockZ={false}>
        <group
          onClick={(e) => { e.stopPropagation(); setTimeout(onClick, 0); }}
          onDoubleClick={(e) => { e.stopPropagation(); setTimeout(onDoubleClick, 0); }}
        >
          {/* Outer atmospheric glow (always visible when not very dim) */}
          {opacity > 0.08 && (
            <mesh position={[0, 0, -0.2]}>
              <circleGeometry args={[glowRadius, 32]} />
              <meshBasicMaterial
                color={color}
                transparent
                opacity={glowOpacity}
                blending={THREE.AdditiveBlending}
                depthWrite={false}
                toneMapped={false}
              />
            </mesh>
          )}

          {/* Outer Ring (hologram viền) */}
          <mesh position={[0, 0, 0]}>
            {renderOuterRing()}
            <meshBasicMaterial
              color={isSelected ? "#fff" : color}
              transparent
              opacity={isSelected ? 1.0 : opacity * 0.9}
              toneMapped={false}
            />
          </mesh>

          {/* Core shape — bright solid */}
          <mesh position={[0, 0, 0.05]}>
            {renderShapeCore()}
            <meshBasicMaterial
              color={isSelected ? "#fff" : color}
              transparent
              opacity={isSelected ? 1.0 : opacity}
              toneMapped={false}
            />
            {shape === "cross" && (
              <mesh position={[0, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
                <planeGeometry args={[radius * 0.8, radius * 0.2]} />
                <meshBasicMaterial color={isSelected ? "#fff" : color} transparent opacity={isSelected ? 1.0 : opacity} toneMapped={false} />
              </mesh>
            )}
          </mesh>

          {/* Inner bright halo ring for selected */}
          {isSelected && (
            <mesh position={[0, 0, -0.05]}>
              <ringGeometry args={[radius * 1.25 * (graphStyle.selectionRingSize ?? 1.5), radius * 1.45 * (graphStyle.selectionRingSize ?? 1.5), 32]} />
              <meshBasicMaterial
                color={graphStyle.selectionRingColor}
                transparent
                opacity={0.95}
                toneMapped={false}
                blending={THREE.AdditiveBlending}
                depthWrite={false}
              />
            </mesh>
          )}

          {/* Selected outer orbit ring (dashed effect via thin strip) */}
          {isSelected && (
            <mesh position={[0, 0, -0.08]}>
              <ringGeometry args={[radius * (1.7 * (graphStyle.selectionRingSize ?? 1.5)), radius * (1.8 * (graphStyle.selectionRingSize ?? 1.5)), 32]} />
              <meshBasicMaterial
                color={graphStyle.selectionRingColor}
                transparent
                opacity={0.5}
                toneMapped={false}
              />
            </mesh>
          )}

          {/* Persistent border (from graphStyle.nodeBorderWidth) — drawn behind core */}
          {(graphStyle.nodeBorderWidth ?? 0) > 0.01 && (
            <mesh position={[0, 0, -0.02]}>
              <ringGeometry args={[
                radius * 0.45,
                radius * 0.45 + (graphStyle.nodeBorderWidth ?? 0) * 0.15,
                32,
              ]} />
              <meshBasicMaterial
                color={graphStyle.nodeBorderColor ?? "#ffffff"}
                transparent
                opacity={isSelected ? 1.0 : opacity * 0.95}
                toneMapped={false}
              />
            </mesh>
          )}

          {/* Label — fontSize multiplied by graphStyle.textSize */}
          {showLabel && opacity > 0.2 && (
            <Text
              position={[0, -radius - 1.5, 0.2]}
              fontSize={1.2 * (graphStyle.textSize ?? 1.0)}
              color={opacity > 0.5 ? "#E5E7EB" : "#9CA3AF"}
              anchorX="center"
              anchorY="top"
              outlineWidth={0.06}
              outlineColor="#000000"
            >
              {node.entity.name.length > 18
                ? node.entity.name.slice(0, 16) + "…"
                : node.entity.name}
            </Text>
          )}
        </group>
      </Billboard>
    </group>
  );
});

// ═══════════════════════════════════════════════════════
// Auto-rotate for compact mode
// ═══════════════════════════════════════════════════════
function AutoRotate({ speed = 0.15 }: { speed?: number }) {
  const { camera } = useThree();
  useFrame((_state, delta) => {
    if (speed > 0) {
      camera.position.applyAxisAngle(new THREE.Vector3(0, 1, 0), delta * speed);
      camera.lookAt(0, 0, 0);
    }
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
  graphStyle,
}: ForceGraph3DProps) {
  const { highlightedIds, showLabels } = useGraphStore();
  const containerRef = useRef<HTMLDivElement>(null);

  // Use provided style or default preset (GEM Gold)
  const style = graphStyle ?? GRAPH_PRESETS.gem_gold;

  // Force Three.js Canvas relies on native ResizeObserver via r3f.
  // No longer dispatching window events to avoid animation conflict.


  // ① O(1) entity lookup via Map
  const entityMap = useMemo(
    () => new Map(entities.map((e) => [e.id, e])),
    [entities],
  );
  void entityMap; // suppress unused warning

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

  // Run d3-force-3d simulation
  const { nodes, links } = useMemo(() => {
    const simNodes: SimNode[] = rankedEntities.map((e) => ({
      id: e.id,
      x: (Math.random() - 0.5) * 10,
      y: (Math.random() - 0.5) * 10,
      z: (Math.random() - 0.5) * 10,
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

    // Run simulation synchronously — 200 ticks for good convergence
    const sim = forceSimulation(simNodes, 3)
      .force("charge", forceManyBody().strength(style.chargeStrength ?? forceParams.charge))
      .force(
        "link",
        forceLink(simLinks)
          .id((d: any) => d.id)
          .distance(style.linkDistance ?? forceParams.linkDistance),
      )
      .force("center", forceCenter(0, 0, 0).strength(style.centerStrength ?? forceParams.centerStrength))
      .force("collide", forceCollide(style.collideRadius ?? forceParams.collideRadius))
      .stop();

    for (let i = 0; i < 200; i++) {
      sim.tick();
    }

    return { nodes: simNodes, links: simLinks };
  }, [rankedEntities, visibleRelations, forceParams, style.chargeStrength, style.linkDistance, style.centerStrength, style.collideRadius]);

  // ② Pre-computed node position lookup
  const nodePositions = useMemo(
    () => new Map(nodes.map((n) => [n.id, [n.x, n.y, n.z] as [number, number, number]])),
    [nodes],
  );

  // ⑩ Depth-based opacity — now respects style.nodeBaseOpacity + style.nodeOpacityFloor
  const getNodeOpacity = useCallback(
    (nodeId: string) => {
      if (!selectedEntityId) return style.nodeBaseOpacity ?? 0.9;
      if (nodeId === selectedEntityId) return 1.0;
      const depth = highlightedIds.get(nodeId);
      if (depth !== undefined) return getDepthOpacity(depth);
      return style.nodeOpacityFloor ?? 0.08;
    },
    [selectedEntityId, highlightedIds, style.nodeBaseOpacity, style.nodeOpacityFloor],
  );

  // ⑨ Edge highlight check
  const isEdgeHighlighted = useCallback(
    (link: SimLink) => {
      if (!selectedEntityId) return false;
      const src =
        typeof link.source === "string" ? link.source : (link.source as any).id;
      const tgt =
        typeof link.target === "string" ? link.target : (link.target as any).id;
      return (
        src === selectedEntityId ||
        tgt === selectedEntityId ||
        highlightedIds.has(src) ||
        highlightedIds.has(tgt)
      );
    },
    [selectedEntityId, highlightedIds],
  );

  return (
    <div
      ref={containerRef}
      className={`w-full h-full ${compact ? "min-h-[200px]" : "min-h-[500px]"}`}
    >
      <Canvas
        dpr={[1, 2]}
        className="bg-transparent"
        camera={{
          position: [0, 0, compact ? 60 : 120],
          fov: style.cameraFov ?? 60,
          near: 0.1,
          far: 2000,
        }}
      >
        {/* Scene background — ONLY override when user explicitly picks a color.
            When empty (default), Canvas stays transparent so Paperclip page
            theme (bg-background) shows through. */}
        {style.backgroundColor && style.backgroundColor.trim() !== "" && (
          <color attach="background" args={[style.backgroundColor]} />
        )}

        {/* Starfield background (drei Stars) — only when enabled */}
        {style.starfield && (
          <Stars
            radius={300}
            depth={60}
            count={Math.min(Math.max(style.starfieldDensity ?? 3000, 500), 10000)}
            factor={4}
            saturation={0}
            fade
            speed={style.starfieldSpeed ?? 0.4}
          />
        )}

        <ambientLight intensity={0.5} />
        <pointLight position={[60, 60, 60]} intensity={0.8} />
        <pointLight position={[-60, -60, -60]} intensity={0.3} />

        {/* Auto-fit camera when canvas/nodes change */}
        {!compact && <CameraAutoFit nodes={nodes} />}

        {/* Edges first (render behind nodes) */}
        {links.map((link) => {
          const src =
            typeof link.source === "string" ? link.source : (link.source as any).id;
          const tgt =
            typeof link.target === "string" ? link.target : (link.target as any).id;
          const from = nodePositions.get(src);
          const to = nodePositions.get(tgt);
          if (!from || !to) return null;
          return (
            <EdgeLine
              key={link.relation.id}
              from={from}
              to={to}
              highlighted={isEdgeHighlighted(link)}
              graphStyle={style}
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
            graphStyle={style}
          />
        ))}

        {/* Controls */}
        {compact ? (
          <AutoRotate speed={style.rotationSpeed} />
        ) : (
          <OrbitControls
            enableDamping
            dampingFactor={style.cameraDamping ?? 0.1}
            rotateSpeed={0.5}
            zoomSpeed={0.8}
            minDistance={10}
            maxDistance={400}
            autoRotate
            autoRotateSpeed={style.rotationSpeed != null ? style.rotationSpeed * 5 : 0.75}
          />
        )}
      </Canvas>
    </div>
  );
}
