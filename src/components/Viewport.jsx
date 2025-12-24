import React, { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, Environment } from '@react-three/drei';
import * as THREE from 'three';

const ContainerMesh = ({ width, height, depth }) => {
    return (
        <mesh>
            <boxGeometry args={[width, height, depth]} />
            <meshBasicMaterial color="#3b82f6" wireframe transparent opacity={0.3} />
        </mesh>
    );
};

const ContentVoxels = ({ container, item, counts }) => {
    const { width: cW, height: cH, depth: cD } = container;
    const { width: iW, height: iH, depth: iD } = item;
    const { x: countX, y: countY, z: countZ } = counts;

    // Use InstancedMesh for performance
    const count = countX * countY * countZ;

    // Create mesh ref
    const meshRef = React.useRef();

    // Color logic - use a subtle gradient or solid color
    const color = new THREE.Color("#3b82f6");

    useMemo(() => {
        if (!meshRef.current) return;

        const tempObject = new THREE.Object3D();
        let i = 0;

        // Calculate start position (bottom-left-back corner of the container)
        // Container is centered at 0,0,0
        const startX = -cW / 2 + iW / 2;
        const startY = -cH / 2 + iH / 2;
        const startZ = -cD / 2 + iD / 2;

        for (let x = 0; x < countX; x++) {
            for (let y = 0; y < countY; y++) {
                for (let z = 0; z < countZ; z++) {
                    tempObject.position.set(
                        startX + x * iW,
                        startY + y * iH,
                        startZ + z * iD
                    );

                    tempObject.updateMatrix();
                    meshRef.current.setMatrixAt(i, tempObject.matrix);
                    i++;
                }
            }
        }
        meshRef.current.instanceMatrix.needsUpdate = true;
    }, [cW, cH, cD, iW, iH, iD, countX, countY, countZ]);

    // If count is too massive, we might want to skip rendering or fallback
    // For now, let's limit to 50k instances
    if (count > 50000) {
        return (
            <group>
                {/* Fallback: Render a solid block representing the filled volume */}
                <mesh position={[
                    -cW / 2 + (countX * iW) / 2,
                    -cH / 2 + (countY * iH) / 2,
                    -cD / 2 + (countZ * iD) / 2
                ]}>
                    <boxGeometry args={[countX * iW, countY * iH, countZ * iD]} />
                    <meshStandardMaterial color="#3b82f6" transparent opacity={0.5} />
                </mesh>
            </group>
        )
    }

    return (
        <instancedMesh ref={meshRef} args={[null, null, count]}>
            <boxGeometry args={[iW * 0.95, iH * 0.95, iD * 0.95]} />
            <meshStandardMaterial color="#3b82f6" transparent opacity={0.8} roughness={0.2} metalness={0.1} />
        </instancedMesh>
    );
};

export default function Viewport({ container, item, counts, gridVisible }) {
    // Adjust camera based on container size
    const maxDim = Math.max(container.width, container.height, container.depth);
    const cameraDist = maxDim * 2;

    return (
        <div className="w-full h-full bg-[#0a0e17] relative">
            <Canvas
                camera={{ position: [cameraDist, cameraDist / 1.5, cameraDist], fov: 45 }}
                dpr={[1, 2]}
            >
                <OrbitControls makeDefault />
                <ambientLight intensity={0.5} />
                <directionalLight position={[10, 10, 10]} intensity={1} />
                <Environment preset="city" />

                <group>
                    <ContainerMesh {...container} />
                    <ContentVoxels container={container} item={item} counts={counts} />
                </group>

                {gridVisible && (
                    <Grid
                        infiniteGrid
                        fadeDistance={50}
                        sectionColor="#4b5563"
                        cellColor="#1f2937"
                        position={[0, -container.height / 2 - 0.1, 0]}
                    />
                )}
            </Canvas>
        </div>
    );
}
