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

// Africa silhouette — accurate normalized coordinates (-1..1) centered at origin
// Traced clockwise from Tunisia → Horn of Africa → Cape → West Coast → Morocco
const AFRICA_PATH: [number, number][] = [
  [0.18, 0.95],   // Tunisia
  [0.42, 0.92],   // Libya N
  [0.62, 0.88],   // Egypt N
  [0.72, 0.78],   // Sinai
  [0.78, 0.62],   // Red Sea
  [0.88, 0.50],   // Eritrea
  [1.00, 0.40],   // Horn (Somalia tip)
  [0.95, 0.22],   // Somalia coast
  [0.78, 0.10],   // Kenya coast
  [0.70, -0.10],  // Tanzania coast
  [0.62, -0.32],  // Mozambique
  [0.58, -0.55],  // Mozambique S
  [0.42, -0.78],  // Natal
  [0.18, -0.92],  // Cape coast E
  [-0.05, -0.98], // Cape Agulhas
  [-0.22, -0.92], // Cape Town
  [-0.30, -0.72], // Namibia coast
  [-0.38, -0.48], // Namibia N
  [-0.45, -0.25], // Angola
  [-0.42, -0.05], // Congo coast
  [-0.55, 0.10],  // Gabon
  [-0.78, 0.18],  // Nigeria delta
  [-0.95, 0.30],  // Ghana/Côte d'Ivoire
  [-1.05, 0.42],  // West bulge
  [-1.00, 0.58],  // Senegal
  [-0.88, 0.68],  // Mauritania coast
  [-0.78, 0.82],  // W Sahara
  [-0.55, 0.92],  // Morocco
  [-0.30, 0.98],  // N Morocco
  [-0.05, 0.96],  // Algeria N
];

// Major hubs (city positions in same normalized space, z = front face)
const HUBS: { name: string; pos: [number, number, number] }[] = [
  { name: "Tunis",        pos: [ 0.18,  0.82, 0.18] },
  { name: "Cairo",        pos: [ 0.58,  0.72, 0.18] },
  { name: "Casablanca",   pos: [-0.55,  0.82, 0.18] },
  { name: "Dakar",        pos: [-0.92,  0.45, 0.18] },
  { name: "Lagos",        pos: [-0.42,  0.08, 0.18] },
  { name: "Addis Ababa",  pos: [ 0.62,  0.28, 0.18] },
  { name: "Nairobi",      pos: [ 0.55, -0.05, 0.18] },
  { name: "Kinshasa",     pos: [-0.10, -0.18, 0.18] },
  { name: "Luanda",       pos: [-0.35, -0.38, 0.18] },
  { name: "Johannesburg", pos: [ 0.20, -0.62, 0.18] },
  { name: "Cape Town",    pos: [-0.15, -0.88, 0.18] },
  { name: "Accra",        pos: [-0.72,  0.18, 0.18] },
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
