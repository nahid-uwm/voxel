import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// DOM Elements
const inputs = {
    width: document.getElementById('width'),
    height: document.getElementById('height'),
    depth: document.getElementById('depth'),
    voxelSize: document.getElementById('voxelSize')
};

const results = {
    volume: document.getElementById('volumeResult'),
    count: document.getElementById('countResult'),
    status: document.getElementById('statusText')
};

const container = document.getElementById('canvas-container');

// State
const state = {
    width: 10,
    height: 10,
    depth: 10,
    voxelSize: 1
};

// Three.js Variables
let scene, camera, renderer, controls;
let boundsMesh, voxelGroup, gridHelper;
const MAX_VOXELS_TO_RENDER = 10000; // Limit for individual cubes

// Initialize Application
function init() {
    initThree();
    addListeners();
    updateCalculation();
    animate();
}

function initThree() {
    // Scene
    scene = new THREE.Scene();
    scene.background = null; // Use CSS background

    // Camera
    camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 10000);
    camera.position.set(20, 20, 20);

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);

    // Controls
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1);
    dirLight.position.set(10, 20, 10);
    scene.add(dirLight);

    const backLight = new THREE.DirectionalLight(0x4488ff, 0.5);
    backLight.position.set(-10, -10, -10);
    scene.add(backLight);

    // Groups
    voxelGroup = new THREE.Group();
    scene.add(voxelGroup);

    // Initial Setup
    updateScene();
    
    // Resize Handler
    window.addEventListener('resize', onWindowResize);
}

function addListeners() {
    Object.values(inputs).forEach(input => {
        input.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            if (val > 0) {
                state[e.target.id] = val;
                updateCalculation();
            }
        });
    });
}

function updateCalculation() {
    const { width, height, depth, voxelSize } = state;

    // Calculate Volume
    const totalVolume = width * height * depth;
    results.volume.innerText = `${totalVolume.toFixed(2)} m³`;

    // Calculate Voxel Count
    // Using Math.ceil to ensure we fill the volume (packing problem logic can vary, 
    // but usually users want to know how many n*n*n cubes fit into W*H*D)
    // If "fill the volume" means pack inside: floor.
    // If "fill the volume" means required to cover: ceil.
    // Prompt says "needed to fill that volume". I will use ceil for coverage logic.
    const countX = Math.ceil(width / voxelSize);
    const countY = Math.ceil(height / voxelSize);
    const countZ = Math.ceil(depth / voxelSize);
    const totalVoxels = countX * countY * countZ;

    results.count.innerText = new Intl.NumberFormat().format(totalVoxels);

    // Update Visualization
    updateScene(countX, countY, countZ, totalVoxels);
}

function updateScene(countX, countY, countZ, totalVoxels) {
    // Clear previous
    while(voxelGroup.children.length > 0){ 
        // Dispose geometries to prevent leaks
        const child = voxelGroup.children[0];
        if(child.geometry) child.geometry.dispose();
        if(child.material) {
            if(Array.isArray(child.material)) child.material.forEach(m => m.dispose());
            else child.material.dispose();
        }
        voxelGroup.remove(child); 
    }

    const { width, height, depth, voxelSize } = state;

    // 1. Draw Bounding Box (Wireframe)
    const boxGeo = new THREE.BoxGeometry(width, height, depth);
    const boxEdges = new THREE.EdgesGeometry(boxGeo);
    const boxMat = new THREE.LineBasicMaterial({ color: 0x4fc3f7, transparent: true, opacity: 0.5 });
    const boxMesh = new THREE.LineSegments(boxEdges, boxMat);
    voxelGroup.add(boxMesh);

    // 2. Draw Voxels or Representative Grid
    // Center the group
    // The box is centered at 0,0,0. 
    // We want the voxels to fill it.
    
    if (totalVoxels > MAX_VOXELS_TO_RENDER) {
        // Render Mode: Simplified (Just Grid)
        results.status.innerText = `Visualizing Simplified View (> ${MAX_VOXELS_TO_RENDER} voxels)`;
        results.status.style.color = '#fbbf24'; // Amber
        
        // Add internal grid planes to show scale
        // Just show the outer box which is already there. Maybe add a dense grid helper inside?
        // Let's standard grid helper at bottom
        const grid = new THREE.GridHelper(Math.max(width, depth), Math.max(countX, countZ), 0x888888, 0x222222);
        grid.position.y = -height / 2;
        voxelGroup.add(grid);

    } else {
        // Render Mode: Instanced Mesh for performance
        results.status.innerText = "Visualizing Individual Voxels";
        results.status.style.color = '#4ade80'; // Green

        const geometry = new THREE.BoxGeometry(voxelSize * 0.95, voxelSize * 0.95, voxelSize * 0.95); // 0.95 for small gap
        const material = new THREE.MeshStandardMaterial({ color: 0x3b82f6, roughness: 0.3, metalness: 0.1 });
        
        const mesh = new THREE.InstancedMesh(geometry, material, totalVoxels);
        
        let i = 0;
        const matrix = new THREE.Matrix4();
        
        // Offset to start from corner -> Centered Box
        // Box is size W, H, D centered at 0.
        // Start X = -W/2 + size/2
        const startX = -width / 2 + voxelSize / 2;
        const startY = -height / 2 + voxelSize / 2;
        const startZ = -depth / 2 + voxelSize / 2;

        for (let x = 0; x < countX; x++) {
            for (let y = 0; y < countY; y++) {
                for (let z = 0; z < countZ; z++) {
                    const posX = startX + x * voxelSize;
                    const posY = startY + y * voxelSize;
                    const posZ = startZ + z * voxelSize;
                    
                    // Clip if it exceeds bounds (since we used ceil, the last one might poke out slightly if we don't clamp visual positions, 
                    // but usually we want to show the 'needed' cubes, so showing them sticking out is correct visualization of 'needed to fill')
                    // However, to look clean, let's keep them centered in their grid slots.
                    
                    matrix.setPosition(posX, posY, posZ);
                    mesh.setMatrixAt(i, matrix);
                    i++;
                }
            }
        }
        
        voxelGroup.add(mesh);
    }
}

function onWindowResize() {
    if (!camera || !renderer) return;
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
}

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}

// Start
init();
