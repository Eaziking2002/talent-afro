import { Suspense, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { useDataSaverMode } from "@/hooks/useDataSaverMode";
import { AfricaLogoLite } from "./AfricaLogoLite";

/**
 * 3D Africa logo — extruded silhouette with glowing emerald nodes
 * representing major African cities/talent hubs, connected by lines.
 *
 * Falls back to AfricaLogoLite when:
 *  - data-saver mode is on
 *  - reduced motion is preferred
 */

// Africa silhouette in 2D (approximate, normalized coordinates centered near 0)
const AFRICA_PATH: [number, number][] = [
  [-0.05, 1.0], [-0.4, 0.95], [-0.65, 0.78], [-0.78, 0.55], [-0.92, 0.3],
  [-1.05, 0.0], [-1.0, -0.25], [-0.9, -0.5], [-0.78, -0.7], [-0.6, -0.85],
  [-0.35, -0.95], [-0.1, -1.0], [0.15, -0.95], [0.35, -0.78], [0.5, -0.55],
  [0.6, -0.3], [0.7, -0.05], [0.85, 0.15], [0.95, 0.35], [0.85, 0.55],
  [0.7, 0.7], [0.55, 0.78], [0.4, 0.85], [0.35, 1.0], [0.2, 1.05],
  [0.05, 1.0],
];

// Major hubs (city positions in same normalized space)
const HUBS: { name: string; pos: [number, number, number] }[] = [
  { name: "Cairo", pos: [0.3, 0.85, 0.18] },
  { name: "Lagos", pos: [-0.45, 0.05, 0.18] },
  { name: "Nairobi", pos: [0.45, -0.2, 0.18] },
  { name: "Accra", pos: [-0.6, 0.15, 0.18] },
  { name: "Johannesburg", pos: [0.15, -0.78, 0.18] },
  { name: "Cape Town", pos: [-0.1, -0.92, 0.18] },
  { name: "Dakar", pos: [-0.95, 0.3, 0.18] },
  { name: "Addis Ababa", pos: [0.55, -0.05, 0.18] },
  { name: "Casablanca", pos: [-0.55, 0.78, 0.18] },
  { name: "Kinshasa", pos: [0.0, -0.3, 0.18] },
  { name: "Algiers", pos: [-0.2, 0.85, 0.18] },
  { name: "Khartoum", pos: [0.4, 0.4, 0.18] },
];

function AfricaShape() {
  const shape = useMemo(() => {
    const s = new THREE.Shape();
    AFRICA_PATH.forEach(([x, y], i) => {
      if (i === 0) s.moveTo(x, y);
      else s.lineTo(x, y);
    });
    s.closePath();
    return s;
  }, []);

  const geometry = useMemo(
    () =>
      new THREE.ExtrudeGeometry(shape, {
        depth: 0.15,
        bevelEnabled: true,
        bevelThickness: 0.04,
        bevelSize: 0.03,
        bevelSegments: 4,
        curveSegments: 24,
      }),
    [shape]
  );

  return (
    <mesh geometry={geometry} castShadow receiveShadow>
      <meshStandardMaterial
        color="#0A1F44"
        metalness={0.6}
        roughness={0.25}
        emissive="#0A2A6E"
        emissiveIntensity={0.15}
      />
    </mesh>
  );
}

function HubNodes() {
  const groupRef = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.getElapsedTime();
    groupRef.current.children.forEach((child, i) => {
      const mesh = child as THREE.Mesh;
      const mat = mesh.material as THREE.MeshStandardMaterial;
      const pulse = 0.5 + 0.5 * Math.sin(t * 1.5 + i);
      mat.emissiveIntensity = 0.8 + pulse * 1.4;
      mesh.scale.setScalar(0.85 + pulse * 0.25);
    });
  });

  return (
    <group ref={groupRef}>
      {HUBS.map((hub, i) => (
        <mesh key={i} position={hub.pos}>
          <sphereGeometry args={[0.04, 16, 16]} />
          <meshStandardMaterial
            color="#10B981"
            emissive="#10B981"
            emissiveIntensity={1.5}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  );
}

function ConnectionLines() {
  const lines = useMemo(() => {
    const segs: [THREE.Vector3, THREE.Vector3][] = [];
    // Connect each hub to its 2 nearest neighbors (visual mesh)
    HUBS.forEach((a, i) => {
      const dists = HUBS.map((b, j) => ({
        j,
        d: Math.hypot(a.pos[0] - b.pos[0], a.pos[1] - b.pos[1]),
      }))
        .filter((x) => x.j !== i)
        .sort((x, y) => x.d - y.d)
        .slice(0, 2);
      dists.forEach(({ j }) => {
        if (j > i) {
          segs.push([
            new THREE.Vector3(...a.pos),
            new THREE.Vector3(...HUBS[j].pos),
          ]);
        }
      });
    });
    return segs;
  }, []);

  return (
    <group>
      {lines.map(([a, b], i) => {
        const geom = new THREE.BufferGeometry().setFromPoints([a, b]);
        return (
          <line key={i}>
            <primitive object={geom} attach="geometry" />
            <lineBasicMaterial
              color="#34D399"
              transparent
              opacity={0.45}
              toneMapped={false}
            />
          </line>
        );
      })}
    </group>
  );
}

function Scene() {
  return (
    <>
      <ambientLight intensity={0.4} />
      <pointLight position={[3, 3, 3]} intensity={1.2} color="#10B981" />
      <pointLight position={[-3, -2, 2]} intensity={0.6} color="#3B82F6" />
      <directionalLight position={[2, 4, 5]} intensity={0.8} />

      <Float speed={1.2} rotationIntensity={0.4} floatIntensity={0.3}>
        <group rotation={[0, -0.2, 0]}>
          <AfricaShape />
          <HubNodes />
          <ConnectionLines />
        </group>
      </Float>

      <OrbitControls
        enableZoom={false}
        enablePan={false}
        autoRotate
        autoRotateSpeed={0.6}
        minPolarAngle={Math.PI / 2.5}
        maxPolarAngle={Math.PI / 1.7}
      />
    </>
  );
}

export function AfricaLogo3D({ className = "" }: { className?: string }) {
  const { enabled: dataSaver } = useDataSaverMode();
  const reducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  if (dataSaver || reducedMotion) {
    return (
      <div className={className}>
        <AfricaLogoLite className="w-full h-full" />
      </div>
    );
  }

  return (
    <div className={`r3f-container ${className}`}>
      <Canvas
        camera={{ position: [0, 0, 3.2], fov: 45 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
      >
        <Suspense fallback={null}>
          <Scene />
        </Suspense>
      </Canvas>
    </div>
  );
}
