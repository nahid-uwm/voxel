// State
const state = {
    container: { width: 5.89, height: 2.39, depth: 2.35 },
    item: { width: 1.20, height: 0.144, depth: 0.80 },
    aspectLock: false,
    gridVisible: true
};

const presets = {
    container: {
        '20ft': { w: 5.89, h: 2.39, d: 2.35 },
        '40ft': { w: 12.03, h: 2.39, d: 2.35 },
        '40hc': { w: 12.03, h: 2.69, d: 2.35 }
    },
    item: {
        'euro': { w: 1.20, h: 0.144, d: 0.80 },
        'us': { w: 1.22, h: 0.15, d: 1.02 },
        'box': { w: 0.40, h: 0.40, d: 0.40 }
    }
};

// DOM Elements
const ui = {
    cPre: document.getElementById('containerPreset'),
    cW: document.getElementById('cWidth'),
    cH: document.getElementById('cHeight'),
    cD: document.getElementById('cDepth'),

    iPre: document.getElementById('itemPreset'),
    iW: document.getElementById('iWidth'),
    iH: document.getElementById('iHeight'),
    iD: document.getElementById('iDepth'),

    lock: document.getElementById('aspectLock'),

    resTotal: document.getElementById('resTotal'),
    resEff: document.getElementById('resEff'),
    resX: document.getElementById('resX'),
    resY: document.getElementById('resY'),
    resZ: document.getElementById('resZ'),
    resCVol: document.getElementById('resCVol'),
    resIVol: document.getElementById('resIVol'),

    btnGrid: document.getElementById('btnGrid'),
    btnReset: document.getElementById('btnReset'),
    loading: document.getElementById('loading')
};

// Three.js Globals
let scene, camera, renderer, controls;
let containerMesh, itemsMesh, gridHelper, highlightMesh, voxelAxes;
let guideLines = { x: null, y: null, z: null };
let labelPos = { x: new THREE.Vector3(), y: new THREE.Vector3(), z: new THREE.Vector3() };
let labelsVisible = false;
let itemsGroup;
let raycaster, mouse;

// Initialization
function init() {
    initThree();
    initUI();
    updateCalculation();
    animate();

    // Hide loading
    setTimeout(() => {
        ui.loading.classList.add('hidden');
    }, 500);
}

function initThree() {
    const viewport = document.getElementById('viewport');

    // Scene
    scene = new THREE.Scene();

    // Camera
    camera = new THREE.PerspectiveCamera(45, viewport.clientWidth / viewport.clientHeight, 0.1, 1000);
    camera.position.set(10, 10, 10);

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(viewport.clientWidth, viewport.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    viewport.appendChild(renderer.domElement);

    // Controls
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;

    // Lights
    const ambLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(5, 10, 7);
    scene.add(dirLight);

    // Setup Groups
    // Setup Groups
    itemsGroup = new THREE.Group();
    scene.add(itemsGroup);

    // Highlight Mesh
    const hlGeo = new THREE.BoxGeometry(1, 1, 1);
    const hlEdges = new THREE.EdgesGeometry(hlGeo);
    const hlMat = new THREE.LineBasicMaterial({ color: 0xffff00, depthTest: false, transparent: true, opacity: 0.8 });
    highlightMesh = new THREE.LineSegments(hlEdges, hlMat);
    highlightMesh.visible = false;
    highlightMesh.visible = false;
    scene.add(highlightMesh);

    // Global Axes (Godot-like) - X: Red, Y: Green, Z: Blue
    const globalAxes = new THREE.AxesHelper(100);
    // AxesHelper colors are R, G, B by default.
    scene.add(globalAxes);

    // Selected Voxel Axes
    voxelAxes = new THREE.AxesHelper(2); // Slightly larger than voxel (1.2m usually)
    voxelAxes.visible = false;
    // Ensure it renders on top if needed, or just let it depth test
    scene.add(voxelAxes);

    // Ensure it renders on top if needed, or just let it depth test
    scene.add(voxelAxes);

    // Guide Lines (Dotted)
    const dashMatX = new THREE.LineDashedMaterial({ color: 0xff4d4d, dashSize: 0.2, gapSize: 0.1, depthTest: false, opacity: 0.7, transparent: true });
    const dashMatY = new THREE.LineDashedMaterial({ color: 0x4dff4d, dashSize: 0.2, gapSize: 0.1, depthTest: false, opacity: 0.7, transparent: true });
    const dashMatZ = new THREE.LineDashedMaterial({ color: 0x4d4dff, dashSize: 0.2, gapSize: 0.1, depthTest: false, opacity: 0.7, transparent: true });

    guideLines.x = new THREE.Line(new THREE.BufferGeometry(), dashMatX);
    guideLines.y = new THREE.Line(new THREE.BufferGeometry(), dashMatY);
    guideLines.z = new THREE.Line(new THREE.BufferGeometry(), dashMatZ);

    scene.add(guideLines.x);
    scene.add(guideLines.y);
    scene.add(guideLines.z);

    // Interaction
    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();

    // Initial Resize
    window.addEventListener('resize', onResize);

    // Canvas Listeners
    renderer.domElement.addEventListener('click', onMouseClick);
    renderer.domElement.addEventListener('contextmenu', onRightClick);
}

function initUI() {
    // Fill Inputs
    syncInputs();

    // Listeners
    ui.cPre.addEventListener('change', () => {
        const p = presets.container[ui.cPre.value];
        if (p) {
            state.container = { width: p.w, height: p.h, depth: p.d };
            syncInputs();
            updateCalculation();
        }
    });

    ['cW', 'cH', 'cD'].forEach(id => {
        ui[id].addEventListener('input', (e) => {
            ui.cPre.value = 'custom';
            state.container = {
                width: parseFloat(ui.cW.value) || 0,
                height: parseFloat(ui.cH.value) || 0,
                depth: parseFloat(ui.cD.value) || 0
            };
            updateCalculation();
        });
    });

    ui.iPre.addEventListener('change', () => {
        const p = presets.item[ui.iPre.value];
        if (p) {
            state.item = { width: p.w, height: p.h, depth: p.d };
            state.aspectLock = false;
            ui.lock.checked = false;
            syncInputs();
            updateCalculation();
        }
    });

    ['iW', 'iH', 'iD'].forEach(key => {
        ui[key].addEventListener('input', (e) => {
            ui.iPre.value = 'custom';
            let val = parseFloat(e.target.value) || 0;

            if (state.aspectLock) {
                state.item = { width: val, height: val, depth: val };
                syncInputs(); // Update other inputs
            } else {
                state.item = {
                    width: parseFloat(ui.iW.value) || 0,
                    height: parseFloat(ui.iH.value) || 0,
                    depth: parseFloat(ui.iD.value) || 0
                };
            }
            updateCalculation();
        });
    });

    ui.lock.addEventListener('change', (e) => {
        state.aspectLock = e.target.checked;
        if (state.aspectLock) {
            // Sync to width
            const w = state.item.width;
            state.item = { width: w, height: w, depth: w };
            syncInputs();
            updateCalculation();
        }
    });

    ui.btnGrid.addEventListener('click', () => {
        state.gridVisible = !state.gridVisible;
        if (gridHelper) gridHelper.visible = state.gridVisible;
    });

    ui.btnReset.addEventListener('click', () => {
        controls.reset();
        fitCamera();
    });

    // Interaction UI Listeners
    document.querySelector('.close-info').addEventListener('click', () => {
        document.getElementById('voxelInfo').classList.add('hidden');
        if (highlightMesh) highlightMesh.visible = false;
        if (voxelAxes) voxelAxes.visible = false;
        hideGuides();
    });

    document.getElementById('btnUnhide').addEventListener('click', () => {
        updateCalculation(); // Rebuilds scene, unhiding everything
        document.getElementById('btnUnhide').style.display = 'none';
    });
}

function syncInputs() {
    ui.cW.value = state.container.width;
    ui.cH.value = state.container.height;
    ui.cD.value = state.container.depth;

    ui.iW.value = state.item.width;
    ui.iH.value = state.item.height;
    ui.iD.value = state.item.depth;
}

function updateCalculation() {
    const { container, item } = state;

    // Packing Logic (Floor)
    const cX = Math.floor(container.width / item.width);
    const cY = Math.floor(container.height / item.height);
    const cZ = Math.floor(container.depth / item.depth);

    const total = cX * cY * cZ;
    const cVol = container.width * container.height * container.depth;
    const iVolSingle = item.width * item.height * item.depth;
    const iVolTotal = total * iVolSingle;

    const eff = cVol > 0 ? (iVolTotal / cVol) * 100 : 0;

    // Update UI
    ui.resTotal.innerText = total.toLocaleString();
    ui.resEff.innerText = eff.toFixed(1) + '%';

    ui.resX.innerText = cX;
    ui.resY.innerText = cY;
    ui.resZ.innerText = cZ;

    ui.resCVol.innerText = cVol.toFixed(3) + ' m³';
    ui.resIVol.innerText = iVolTotal.toFixed(3) + ' m³';

    // Update 3D
    updateScene(cX, cY, cZ, total);
}

function updateScene(X, Y, Z, total) {
    // Cleanup
    while (itemsGroup.children.length > 0) {
        const c = itemsGroup.children[0];
        if (c.geometry) c.geometry.dispose();
        if (c.material) c.material.dispose();
        itemsGroup.remove(c);
    }

    const { container, item } = state;

    // 1. Container Wireframe
    const geoC = new THREE.BoxGeometry(container.width, container.height, container.depth);
    const edgesC = new THREE.EdgesGeometry(geoC);
    const matC = new THREE.LineBasicMaterial({ color: 0x3b82f6, transparent: true, opacity: 0.3 });
    const meshC = new THREE.LineSegments(edgesC, matC);
    itemsGroup.add(meshC);

    // Grid Helper at bottom of container
    gridHelper = new THREE.GridHelper(Math.max(container.width, container.depth) * 2, 20, 0x334155, 0x1e293b);
    gridHelper.position.y = -container.height / 2 - 0.05;
    gridHelper.visible = state.gridVisible;
    gridHelper.visible = state.gridVisible;
    itemsGroup.add(gridHelper);

    // Hide highlight on update
    if (highlightMesh) highlightMesh.visible = false;
    if (voxelAxes) voxelAxes.visible = false;
    hideGuides();

    // Update Highlight scale
    if (highlightMesh) {
        const hsizeW = item.width * 1.05;
        const hsizeH = item.height * 1.05;
        const hsizeD = item.depth * 1.05;
        highlightMesh.scale.set(hsizeW, hsizeH, hsizeD);
    }

    // 2. Items Visualization
    // Optimization: If > 20000 items, render a solid block representing the filled volume to avoid lag
    // If <= 20000, render InstancedMesh

    // Calculate filled bounds
    const filledW = X * item.width;
    const filledH = Y * item.height;
    const filledD = Z * item.depth;

    // Start position (Bottom-Left-Back of Container)
    const startX = -container.width / 2;
    const startY = -container.height / 2;
    const startZ = -container.depth / 2;

    if (total > 20000) {
        // Fallback Block
        const blockGeo = new THREE.BoxGeometry(filledW, filledH, filledD);
        const blockMat = new THREE.MeshStandardMaterial({
            color: 0x3b82f6,
            transparent: true,
            opacity: 0.6
        });
        const block = new THREE.Mesh(blockGeo, blockMat);

        // Center the block in the filled area
        block.position.set(
            startX + filledW / 2,
            startY + filledH / 2,
            startZ + filledD / 2
        );
        itemsGroup.add(block);

    } else if (total > 0) {
        // Instanced Mesh
        const geometry = new THREE.BoxGeometry(item.width * 0.96, item.height * 0.96, item.depth * 0.96);
        const material = new THREE.MeshStandardMaterial({ color: 0x3b82f6, roughness: 0.4, metalness: 0.2 });
        const mesh = new THREE.InstancedMesh(geometry, material, total);

        const dummy = new THREE.Object3D();
        let i = 0;

        for (let x = 0; x < X; x++) {
            for (let y = 0; y < Y; y++) {
                for (let z = 0; z < Z; z++) {
                    dummy.position.set(
                        startX + item.width / 2 + x * item.width,
                        startY + item.height / 2 + y * item.height,
                        startZ + item.depth / 2 + z * item.depth
                    );
                    dummy.updateMatrix();
                    mesh.setMatrixAt(i++, dummy.matrix);
                }
            }
        }
        mesh.instanceMatrix.needsUpdate = true;
        itemsGroup.add(mesh);
    }
}

function onResize() {
    const viewport = document.getElementById('viewport');
    camera.aspect = viewport.clientWidth / viewport.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(viewport.clientWidth, viewport.clientHeight);
}

function fitCamera() {
    // Simple fit logic if needed, usually defaults work ok
}

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
    updateLabels();
}

function updateLabels() {
    if (!labelsVisible) return;

    const elements = {
        x: document.getElementById('lblX'),
        y: document.getElementById('lblY'),
        z: document.getElementById('lblZ')
    };

    ['x', 'y', 'z'].forEach(axis => {
        const pos = labelPos[axis].clone();
        pos.project(camera); // -1 to 1

        const x = (pos.x * 0.5 + 0.5) * window.innerWidth;
        const y = -(pos.y * 0.5 - 0.5) * window.innerHeight;

        const el = elements[axis];
        if (Math.abs(pos.z) > 1) {
            el.classList.add('hidden'); // Behind camera
        } else {
            el.style.left = `${x}px`;
            el.style.top = `${y}px`;
            el.classList.remove('hidden');
        }
    });
}

function hideGuides() {
    if (guideLines.x) {
        guideLines.x.visible = false;
        guideLines.y.visible = false;
        guideLines.z.visible = false;
    }
    labelsVisible = false;
    ['lblX', 'lblY', 'lblZ'].forEach(id => document.getElementById(id).classList.add('hidden'));
}

// Interaction Functions

function onMouseClick(event) {
    // Correct mouse coordinates for canvas position
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);

    // Intersect recursively
    const intersects = raycaster.intersectObjects(itemsGroup.children, true);

    if (intersects.length > 0) {
        // Find the first instanced mesh
        const hit = intersects.find(i => i.object.isInstancedMesh);

        if (hit) {
            const instanceId = hit.instanceId;
            const mesh = hit.object;
            const matrix = new THREE.Matrix4();
            mesh.getMatrixAt(instanceId, matrix);
            const position = new THREE.Vector3();
            position.setFromMatrixPosition(matrix);

            showVoxelInfo(position, instanceId);

            // Highlight
            highlightMesh.position.copy(position);
            highlightMesh.visible = true;

            // Show Voxel Axis
            voxelAxes.position.copy(position);
            voxelAxes.visible = true;

            return;
        }
    }

    // If we missed everything or hit non-voxel
    document.getElementById('voxelInfo').classList.add('hidden');
    highlightMesh.visible = false;
    if (voxelAxes) voxelAxes.visible = false;
    hideGuides();
}

function onRightClick(event) {
    event.preventDefault(); // No context menu

    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(itemsGroup.children, true);

    const hit = intersects.find(i => i.object.isInstancedMesh);
    if (hit) {
        const instanceId = hit.instanceId;
        const mesh = hit.object;

        const matrix = new THREE.Matrix4();
        mesh.getMatrixAt(instanceId, matrix);

        const position = new THREE.Vector3();
        const quaternion = new THREE.Quaternion();
        const scale = new THREE.Vector3();
        matrix.decompose(position, quaternion, scale);

        // Hide by scaling to 0
        const zeroScale = new THREE.Vector3(0, 0, 0);
        matrix.compose(position, quaternion, zeroScale);

        mesh.setMatrixAt(instanceId, matrix);
        mesh.instanceMatrix.needsUpdate = true;

        document.getElementById('btnUnhide').style.display = 'flex';

        // Hide highlight if we just hid the highlighted voxel
        // (optional, but good UX)
        if (highlightMesh.visible && highlightMesh.position.distanceTo(position) < 0.01) {
            highlightMesh.visible = false;
            if (voxelAxes) voxelAxes.visible = false;
            document.getElementById('voxelInfo').classList.add('hidden');
        }
    }
}

function updateGuides(target) {
    // Path: (0,0,0) -> (x,0,0) -> (x,y,0) -> (x,y,z)

    // X Segment
    const p0 = new THREE.Vector3(0, 0, 0);
    const p1 = new THREE.Vector3(target.x, 0, 0);
    guideLines.x.geometry.setFromPoints([p0, p1]);
    guideLines.x.computeLineDistances();
    guideLines.x.visible = true;

    // Y Segment
    const p2 = new THREE.Vector3(target.x, target.y, 0);
    guideLines.y.geometry.setFromPoints([p1, p2]);
    guideLines.y.computeLineDistances();
    guideLines.y.visible = true;

    // Z Segment
    const p3 = target.clone();
    guideLines.z.geometry.setFromPoints([p2, p3]);
    guideLines.z.computeLineDistances();
    guideLines.z.visible = true;

    // Label Positions (Midpoints)
    labelPos.x.copy(p0).lerp(p1, 0.5);
    labelPos.y.copy(p1).lerp(p2, 0.5);
    labelPos.z.copy(p2).lerp(p3, 0.5);

    // Label Content
    document.getElementById('lblX').innerText = `x: ${target.x.toFixed(2)}`;
    document.getElementById('lblY').innerText = `y: ${target.y.toFixed(2)}`;
    document.getElementById('lblZ').innerText = `z: ${target.z.toFixed(2)}`;

    labelsVisible = true;
}

function showVoxelInfo(position, instanceId) {
    const infoPanel = document.getElementById('voxelInfo');

    // Update DOM
    document.getElementById('valX').innerText = position.x.toFixed(3) + ' m';
    document.getElementById('valY').innerText = position.y.toFixed(3) + ' m';
    document.getElementById('valZ').innerText = position.z.toFixed(3) + ' m';

    // Calculate Indices
    const { container, item } = state;
    const cY = Math.floor(container.height / item.height);
    const cZ = Math.floor(container.depth / item.depth);

    // Start Positions (-Container/2)
    const sx = -container.width / 2;
    const sy = -container.height / 2;
    const sz = -container.depth / 2;

    // Decode instanceId: i = x * (Y*Z) + y * Z + z
    // z changes fastest
    let rem = instanceId;
    const z = rem % cZ;
    rem = Math.floor(rem / cZ);
    const y = rem % cY;
    const x = Math.floor(rem / cY); // Remaining is x

    // Format equation: Start + (Index + 0.5) * Size
    // We display: "Start + (i + 0.5) * Size" with numbers

    const fmt = (n) => n.toFixed(2);

    document.getElementById('eqX').innerText = `x = ${fmt(sx)} + (${x} + 0.5) * ${fmt(item.width)}`;
    document.getElementById('eqY').innerText = `y = ${fmt(sy)} + (${y} + 0.5) * ${fmt(item.height)}`;
    document.getElementById('eqZ').innerText = `z = ${fmt(sz)} + (${z} + 0.5) * ${fmt(item.depth)}`;

    infoPanel.classList.remove('hidden');
}

// Start
init();
