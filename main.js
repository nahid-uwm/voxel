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
let boundsMesh, voxelGroup, gridHelper, highlightMesh;
let raycaster, mouse;
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

    // Interaction
    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();

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

    // Highlight Mesh
    const hlGeo = new THREE.BoxGeometry(1, 1, 1);
    const hlEdges = new THREE.EdgesGeometry(hlGeo);
    // Yellow highlight, slightly larger/thicker or just contrasting
    const hlMat = new THREE.LineBasicMaterial({ color: 0xffff00, depthTest: false, transparent: true, opacity: 0.8 });
    highlightMesh = new THREE.LineSegments(hlEdges, hlMat);
    highlightMesh.visible = false;
    scene.add(highlightMesh);

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

    // Interaction Listeners
    renderer.domElement.addEventListener('click', onMouseClick);
    renderer.domElement.addEventListener('contextmenu', onRightClick);

    // UI Listeners
    document.querySelector('.close-info').addEventListener('click', () => {
        document.getElementById('voxelInfo').classList.add('hidden');
    });

    document.getElementById('btnUnhide').addEventListener('click', unhideAll);
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
    while (voxelGroup.children.length > 0) {
        // Dispose geometries to prevent leaks
        const child = voxelGroup.children[0];
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
            if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
            else child.material.dispose();
        }
        voxelGroup.remove(child);
    }

    // Hide highlight on reset
    if (highlightMesh) highlightMesh.visible = false;

    const { width, height, depth, voxelSize } = state;

    // Update Highlight scale to slightly larger than voxel
    if (highlightMesh) {
        // Re-create geometry or just scale?
        // BoxGeometry is 1,1,1. We can just scale mesh.
        const hsize = voxelSize * 1.05; // 5% larger
        highlightMesh.scale.set(hsize, hsize, hsize);
    }

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

// Interaction Functions

function onMouseClick(event) {
    // Calculate mouse position in normalized device coordinates
    // (-1 to +1) for both components
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);

    // Intersect against voxel group children
    // In InstancedMesh mode, we intersect the mesh itself
    const intersects = raycaster.intersectObjects(voxelGroup.children);

    if (intersects.length > 0) {
        const intersection = intersects[0];

        if (intersection.object.isInstancedMesh) {
            const instanceId = intersection.instanceId;
            const mesh = intersection.object;
            const matrix = new THREE.Matrix4();
            mesh.getMatrixAt(instanceId, matrix);
            const position = new THREE.Vector3();
            position.setFromMatrixPosition(matrix);

            showVoxelInfo(position);

            // Highlight
            highlightMesh.position.copy(position);
            highlightMesh.visible = true;
        }
    } else {
        // Hide info if clicked outside
        document.getElementById('voxelInfo').classList.add('hidden');
        highlightMesh.visible = false;
    }
}

function onRightClick(event) {
    event.preventDefault(); // Prevent context menu

    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);

    const intersects = raycaster.intersectObjects(voxelGroup.children);

    if (intersects.length > 0) {
        const intersection = intersects[0];

        if (intersection.object.isInstancedMesh) {
            const instanceId = intersection.instanceId;
            const mesh = intersection.object;

            // Hide by setting scale to 0
            const matrix = new THREE.Matrix4();
            mesh.getMatrixAt(instanceId, matrix);

            // Preserve position, just scale to 0
            const position = new THREE.Vector3();
            const quaternion = new THREE.Quaternion();
            const scale = new THREE.Vector3();

            matrix.decompose(position, quaternion, scale);

            // If already hidden (scale 0), do nothing (though raycast shouldn't hit it easily if scale is 0? 
            // Actually Three.js raycaster might hit if bounding sphere is used, but for precise it won't. 
            // However, let's just set 0)

            const zeroScale = new THREE.Vector3(0, 0, 0);
            matrix.compose(position, quaternion, zeroScale);

            mesh.setMatrixAt(instanceId, matrix);
            mesh.instanceMatrix.needsUpdate = true;

            // Show Unhide Button
            document.getElementById('btnUnhide').style.display = 'flex';
        }
    }
}

function showVoxelInfo(position) {
    const infoPanel = document.getElementById('voxelInfo');
    const equations = {
        x: document.getElementById('eqX'),
        y: document.getElementById('eqY'),
        z: document.getElementById('eqZ')
    };
    const values = {
        x: document.getElementById('valX'),
        y: document.getElementById('valY'),
        z: document.getElementById('valZ')
    };

    // The position is relative to world center (0,0,0)
    // The container is centered at (0,0,0)

    // Format values
    const format = (n) => n.toFixed(3);

    // Equations: Just showing the value as x = ... relative to origin is simple.
    // User asked: "relative position of that voxel's center to the center of the main container"
    // Since main container is at 0,0,0, world position IS the relative position.

    values.x.innerText = `${format(position.x)} m`;
    values.y.innerText = `${format(position.y)} m`;
    values.z.innerText = `${format(position.z)} m`;

    // Equation: Maybe show how it's derived? 
    // center_container +/- offset? 
    // Or just "Δx = ..."
    equations.x.innerText = `Δx = ${format(position.x)}`;
    equations.y.innerText = `Δy = ${format(position.y)}`;
    equations.z.innerText = `Δz = ${format(position.z)}`;

    infoPanel.classList.remove('hidden');
}

function unhideAll() {
    // Re-run updateScene to reset everything
    // Or iterate all instances and reset scale?
    // Resetting via updateScene is easier and cleaner.
    updateCalculation();
    document.getElementById('btnUnhide').style.display = 'none';
}

// Start
init();
