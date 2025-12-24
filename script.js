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
let containerMesh, itemsMesh, gridHelper;
let itemsGroup;

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
    itemsGroup = new THREE.Group();
    scene.add(itemsGroup);

    // Initial Resize
    window.addEventListener('resize', onResize);
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
    itemsGroup.add(gridHelper);

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
}

// Start
init();
