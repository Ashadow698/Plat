import React, { useRef, useState, useCallback, useEffect } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Html } from "@react-three/drei";
import { Physics, useBox, useSphere } from "@react-three/cannon";

// Simple block
function Block({ position }) {
  const [ref] = useBox(() => ({ args: [1, 1, 1], position, type: "Static" }));
  return (
    <mesh ref={ref} position={position} castShadow receiveShadow>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#b0bec5" />
    </mesh>
  );
}

// Ground
function Ground() {
  const [ref] = useBox(() => ({
    args: [200, 1, 200],
    position: [0, -0.5, 0],
    type: "Static",
  }));
  return (
    <mesh ref={ref} receiveShadow>
      <boxGeometry args={[200, 1, 200]} />
      <meshStandardMaterial color="#6b705c" />
    </mesh>
  );
}

// Player sphere
function Player({ setCanPlaceBlock }) {
  const velocity = useRef([0, 0, 0]);
  const [ref, api] = useSphere(() => ({
    mass: 1,
    args: [0.5],
    position: [0, 2, 5],
  }));
  const keys = useRef({});

  useEffect(() => {
    const down = (e) => (keys.current[e.code] = true);
    const up = (e) => (keys.current[e.code] = false);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  useFrame(() => {
    api.velocity.subscribe((v) => (velocity.current = v));
    const speed = 4;
    const impulse = [0, 0, 0];
    if (keys.current["KeyW"]) impulse[2] -= speed;
    if (keys.current["KeyS"]) impulse[2] += speed;
    if (keys.current["KeyA"]) impulse[0] -= speed;
    if (keys.current["KeyD"]) impulse[0] += speed;
    if (keys.current["Space"] && Math.abs(velocity.current[1]) < 0.05) {
      api.applyImpulse([0, 5, 0], [0, 0, 0]);
    }
    api.velocity.set(impulse[0], velocity.current[1], impulse[2]);
  });

  useEffect(() => {
    setCanPlaceBlock(() => (fn) => fn(ref));
  }, [ref, setCanPlaceBlock]);

  return (
    <mesh ref={ref} castShadow>
      <sphereGeometry args={[0.5, 16, 16]} />
      <meshStandardMaterial color="#ef476f" />
    </mesh>
  );
}

export default function App() {
  const [blocks, setBlocks] = useState([
    [-1, 0, 0],
    [1, 0, 0],
    [3, 0, -1],
    [-3, 0, -2],
    [0, 1, -5],
  ]);

  const canPlaceRef = useRef(null);
  const setCanPlaceBlock = useCallback((fn) => (canPlaceRef.current = fn), []);

  const onPlace = useCallback(() => {
    if (!canPlaceRef.current) return;
    canPlaceRef.current((playerRef) => {
      if (!playerRef.current) return;
      const pos = playerRef.current.position;
      const forward = new THREE.Vector3(0, 0, -1);
      const candidate = [
        Math.round(pos.x + forward.x * 2),
        Math.round(pos.y + 0),
        Math.round(pos.z + forward.z * 2),
      ];
      setBlocks((b) => {
        const exists = b.some(
          (bb) => bb[0] === candidate[0] && bb[1] === candidate[1] && bb[2] === candidate[2]
        );
        if (exists) return b;
        return [...b, candidate];
      });
    });
  }, []);

  return (
    <div className="w-full h-screen bg-gray-900 text-white">
      <div className="absolute top-4 left-4 z-20 p-3 rounded-md bg-black/60 backdrop-blur-sm">
        <div className="font-semibold">3D Block Platformer</div>
        <div className="text-sm opacity-80">
          WASD to move · Space to jump · Click to place a block (∞)
        </div>
      </div>

      <Canvas shadows camera={{ position: [0, 5, 10], fov: 60 }}>
        <ambientLight intensity={0.4} />
        <directionalLight
          castShadow
          position={[10, 10, 5]}
          intensity={0.8}
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
        />
        <Physics broadphase="SAP" gravity={[0, -9.81, 0]}>
          <Ground />
          {blocks.map((b, i) => (
            <Block key={i} position={b} />
          ))}
          <Player setCanPlaceBlock={setCanPlaceBlock} />
        </Physics>
        <OrbitControls enablePan={false} enableZoom={true} />
        <Html as="div" fullscreen>
          <div
            onPointerDown={onPlace}
            style={{ width: "100%", height: "100%", cursor: "crosshair" }}
          />
        </Html>
      </Canvas>
    </div>
  );
}
