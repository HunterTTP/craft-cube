import * as THREE from 'three';
import { OrbitControls } from 'OrbitControls';

let camera, scene, renderer;
let plane;
let pointer, raycaster, isShiftDown = false;
let rollOverMesh, rollOverMaterial;
let cubeGeo, cubeMaterial;
let isCameraRotating = false;
let controls, gridHelper;
let toggleCameraControl = false;

const objects = [];

init();
animate();

function init() {

    camera = new THREE.PerspectiveCamera( 40, window.innerWidth / window.innerHeight, 1, 10000 );
    camera.position.set( 300, 1000, 1300 );
    camera.lookAt( 0, 0, 0 );

    scene = new THREE.Scene();
    scene.background = new THREE.Color( 0x333333 );
    updateControlPanelTextColor(scene.background.getHexString());

    // roll-over helpers
    const rollOverGeo = new THREE.BoxGeometry( 50, 50, 50 );
    rollOverMaterial = new THREE.MeshBasicMaterial( { color: 0xFFFFFF, opacity: 0.5, transparent: true } );
    rollOverMesh = new THREE.Mesh( rollOverGeo, rollOverMaterial );
    scene.add( rollOverMesh );

    // cubes
    cubeGeo = new THREE.BoxGeometry( 50, 50, 50 );
    cubeMaterial = new THREE.MeshLambertMaterial({ color: 0xFFFFFF, opacity: 0.5, transparent: true });
    document.getElementById("transparencySlider").addEventListener("input", onTransparencySliderChange);

    // grid
    gridHelper = new THREE.GridHelper( 1000, 20 );
    scene.add( gridHelper );

    // plane
    raycaster = new THREE.Raycaster();
    pointer = new THREE.Vector2();

    const geometry = new THREE.PlaneGeometry( 1000, 1000 );
    geometry.rotateX( - Math.PI / 2 );

    plane = new THREE.Mesh( geometry, new THREE.MeshBasicMaterial( { visible: false } ) );
    scene.add( plane );

    objects.push( plane );

    // lights
    const ambientLight = new THREE.AmbientLight( 0x606060 );
    scene.add( ambientLight );

    const directionalLight = new THREE.DirectionalLight( 0xffffff );
    directionalLight.position.set( 1, 0.75, 0.5 ).normalize();
    scene.add( directionalLight );

    renderer = new THREE.WebGLRenderer( { antialias: true } );
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize( window.innerWidth, window.innerHeight );
    document.body.appendChild( renderer.domElement );

    // Add OrbitControls
    controls = new OrbitControls(camera, renderer.domElement);
    controls.maxPolarAngle = Math.PI;
    controls.enablePan = false;
    controls.mouseButtons = {
      LEFT: null,
      MIDDLE: null,
      RIGHT: THREE.MOUSE.ROTATE
    };

    if (toggleCameraControl) {
      controls.touches = {
        ONE: THREE.TOUCH.ROTATE,
        TWO: null
      };
    } else {
      controls.touches = {
        ONE: null,
        TWO: null
      };
    }

    controls.addEventListener('start', () => isCameraRotating = true);
    controls.addEventListener('end', () => isCameraRotating = false);


    // listeners
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('touchstart', onTouchStart, { passive: false });
    document.addEventListener('mousemove', onPointerMove);
    document.addEventListener('keydown', onDocumentKeyDown);
    document.addEventListener('keyup', onDocumentKeyUp);
    window.addEventListener('resize', onWindowResize);
    document.getElementById("colorPicker").addEventListener("input", onColorPickerChange);
    document.getElementById("backgroundColorPicker").addEventListener("input", onBackgroundColorPickerChange);
    document.getElementById("saveButton").addEventListener("click", onSaveButtonClick);
    document.getElementById("loadButton").addEventListener("click", onLoadButtonClick);
    document.getElementById("clearAllButton").addEventListener("click", onClearAllButtonClick);
    document.getElementById("toggleGridButton").addEventListener("click", toggleGridVisibility);
    document.getElementById("control-panel-toggle").addEventListener("click", () => {
        const controlPanel = document.getElementById("control-panel");
        controlPanel.classList.toggle("expanded");
    });
    document.getElementById("toggleCameraControl").addEventListener("click", () => {
      toggleCameraControl = !toggleCameraControl;
      const toggleCameraControlButton = document.getElementById("toggleCameraControl");

      if (toggleCameraControl) {
        toggleCameraControlButton.textContent = 'Touch Camera Mode: ON';

        // Update OrbitControls touch settings when camera control is toggled on
        controls.touches = {
          ONE: THREE.TOUCH.ROTATE,
          TWO: null
        };
      } else {
        toggleCameraControlButton.textContent = 'Touch Camera Mode: OFF';

        // Update OrbitControls touch settings when camera control is toggled off
        controls.touches = {
          ONE: null,
          TWO: null
        };
      }
    });

}

function onWindowResize() {

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize( window.innerWidth, window.innerHeight );

    render();

}

function onColorPickerChange(event) {
    const newColor = event.target.value;
    cubeMaterial.color.set(newColor);
    rollOverMaterial.color.set(newColor);
}

function onTransparencySliderChange(event) {
  const transparency = event.target.value / 100;
  cubeMaterial.opacity = transparency;
}

function onPointerMove(event) {
    const target = event.target;
    if (target.closest('#control-panel.expanded') && !target.closest('#control-panel-toggle')) {
        return;
    }

    if (isCameraRotating) {
        rollOverMesh.visible = false;
        return;
    }

    pointer.set((event.clientX / window.innerWidth) * 2 - 1, -(event.clientY / window.innerHeight) * 2 + 1);

    raycaster.setFromCamera(pointer, camera);

    const intersects = raycaster.intersectObjects(objects, false);

    if (intersects.length > 0) {
        rollOverMesh.visible = true;

        const intersect = intersects[0];

        rollOverMesh.position.copy(intersect.point).add(intersect.face.normal);
        rollOverMesh.position.divideScalar(50).floor().multiplyScalar(50).addScalar(25);

        render();

    } else {
        rollOverMesh.visible = false;
    }
}

function onMouseDown(event) {
    const target = event.target;
    if (target.closest('#control-panel.expanded') && !target.closest('#control-panel-toggle')) {
        return;
    }

    pointer.set((event.clientX / window.innerWidth) * 2 - 1, -(event.clientY / window.innerHeight) * 2 + 1);

    raycaster.setFromCamera(pointer, camera);

    const intersects = raycaster.intersectObjects(objects, false);

    if (intersects.length > 0 && event.button !== 2) {
        const intersect = intersects[0];

        // delete cube
        if (isShiftDown) {
            deleteCube(intersect);
        // create cube
        } else {
            createCube(intersect);
        }

        render();
    }
}

function onTouchStart(event) {
    const target = event.target;

    if (target.closest('#control-panel.expanded') && !target.closest('#control-panel-toggle')) {
        return;
    }

    pointer.set((event.touches[0].clientX / window.innerWidth) * 2 - 1, -(event.touches[0].clientY / window.innerHeight) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    const intersects = raycaster.intersectObjects(objects, false);

    if (intersects.length > 0 && !toggleCameraControl) {
        // Prevent scrolling
        event.preventDefault();

        const intersect = intersects[0];
        createCube(intersect);
        render();
    }
}

function onDocumentKeyDown( event ) {

    switch ( event.keyCode ) {

        case 16: isShiftDown = true; break;

    }

}

function onDocumentKeyUp( event ) {

    switch ( event.keyCode ) {

        case 16: isShiftDown = false; break;

    }

}

function render() {

    renderer.render( scene, camera );

}

function onBackgroundColorPickerChange(event) {
    const newColor = event.target.value;
    scene.background.set(newColor);
    render();

    updateControlPanelTextColor(newColor);
}

function updateControlPanelTextColor(backgroundColor) {
    const textColor = getContrastColor(backgroundColor.substring(1));
    const labels = document.querySelectorAll("#control-panel-content label");
    labels.forEach(label => {
        label.style.color = textColor;
    });
}

function getContrastColor(hexColor) {
    const r = parseInt(hexColor.substr(0, 2), 16);
    const g = parseInt(hexColor.substr(2, 2), 16);
    const b = parseInt(hexColor.substr(4, 2), 16);
    const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    return (yiq >= 128) ? 'black' : 'white';
}

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    render();
}

function onSaveButtonClick() {
    saveState();

}

function onLoadButtonClick() {
    loadState();

}

function toggleGridVisibility() {
    gridHelper.visible = !gridHelper.visible;
    render();
}

function onClearAllButtonClick() {
    for (let i = objects.length - 1; i >= 0; i--) {
        const obj = objects[i];
        if (obj !== plane) {
            scene.remove(obj);
            objects.splice(i, 1);
        }
    }
    render();
}

function saveState() {
    const state = {
        backgroundColor: scene.background.getHexString(),
        cubes: objects.slice(1).map(object => {
            return {
                position: object.position.toArray(),
                color: object.material.color.getHexString(),
                opacity: object.material.opacity
            };
        })
    };
    const jsonString = JSON.stringify(state);
    localStorage.setItem('craftCubeState', jsonString);
}

function loadState() {
    const jsonString = localStorage.getItem('craftCubeState');
    if (jsonString) {
        const state = JSON.parse(jsonString);

        // Set background color
        scene.background = new THREE.Color(`#${state.backgroundColor}`);

        // Remove all existing cubes
        for (const object of objects.slice(1)) {
            scene.remove(object);
        }
        objects.length = 1; // Keep only the plane

        // Add cubes from the saved state
        for (const cubeState of state.cubes) {
            const material = new THREE.MeshLambertMaterial({
                color: `#${cubeState.color}`,
                opacity: cubeState.opacity,
                transparent: true
            });
            const cube = new THREE.Mesh(cubeGeo, material);
            cube.position.fromArray(cubeState.position);
            scene.add(cube);
            objects.push(cube);
        }
        render();
    }
}

function createCube(intersect) {
    const newMaterial = new THREE.MeshLambertMaterial({
        color: cubeMaterial.color.clone(),
        opacity: cubeMaterial.opacity,
        transparent: true,
    });

    const voxel = new THREE.Mesh(cubeGeo, newMaterial);
    voxel.position.copy(intersect.point).add(intersect.face.normal);
    voxel.position.divideScalar(50).floor().multiplyScalar(50).addScalar(25);
    scene.add(voxel);

    objects.push(voxel);
}

function deleteCube(intersect) {
    if (intersect.object !== plane) {
        scene.remove(intersect.object);
        objects.splice(objects.indexOf(intersect.object), 1);
    }
}