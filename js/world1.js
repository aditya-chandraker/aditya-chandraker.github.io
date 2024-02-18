// imports -----------------------------------------------------------------------------------
import * as THREE from "three";

import Stats from "three/addons/libs/stats.module.js";

import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

import { Octree } from "three/addons/math/Octree.js";
import { OctreeHelper } from "three/addons/helpers/OctreeHelper.js";

import { Capsule } from "three/addons/math/Capsule.js";

// import { GUI } from 'three/addons/libs/lil-gui.module.min.js';

// variables --------------------------------------------------------------------------------
const clock = new THREE.Clock();

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);
scene.fog = new THREE.Fog(0x0f0f0f, 0, 30);

const camera = new THREE.PerspectiveCamera(
  70,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.rotation.order = "YXZ";

// const axesHelper = new THREE.AxesHelper(115);
// scene.add(axesHelper);

const container = document.getElementById("container");

const stats = new Stats();
stats.domElement.style.position = "absolute";
stats.domElement.style.top = "0px";
container.appendChild(stats.domElement);

// lights -----------------------------------------------------------------------------------
const pointlights = [];

const pointlight1 = new THREE.PointLight(0xffffff, 5, 70);
pointlight1.position.set(-0.6, 4, 0); // xyz
pointlights.push(pointlight1);

const pointlight2 = new THREE.PointLight(0xffffff, 5, 30);
pointlight2.position.set(5, 4, -6.6);
pointlights.push(pointlight2);

const pointlight3 = new THREE.PointLight(0xffffff, 5, 50);
pointlight3.position.set(21, 4, -2);
pointlights.push(pointlight3);

const pointlight4 = new THREE.PointLight(0xffffff, 5, 50);
pointlight4.position.set(16, 4, -12);
pointlights.push(pointlight4);

for (let i = 0; i < pointlights.length; i++) {
  pointlights[i].castShadow = true;
  pointlights[i].shadow.camera.near = 0.01;
  pointlights[i].shadow.camera.far = 500;
  pointlights[i].shadow.camera.right = 30;
  pointlights[i].shadow.camera.left = -30;
  pointlights[i].shadow.camera.top = 30;
  pointlights[i].shadow.camera.bottom = -30;
  pointlights[i].shadow.mapSize.width = 1024;
  pointlights[i].shadow.mapSize.height = 1024;
  pointlights[i].shadow.radius = 4;
  pointlights[i].shadow.bias = -0.00006;
  // pointlights[i].display = none;
  pointlights[i].visible = false;
  scene.add(pointlights[i]);
}

pointlights[0].visible = true;

const ambientLight = new THREE.AmbientLight(0x999999, .5); // color, intensity
scene.add(ambientLight);

// portal test

// Create two cameras, one for each side of the portal
// const camera1 = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
// const camera2 = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

// Create two render targets, one for each camera
// const renderTarget1 = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight);
// const renderTarget2 = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight);

// Create two planes, one for each side of the portal
// const plane1 = new THREE.Mesh(new THREE.PlaneGeometry(3, 10), new THREE.MeshBasicMaterial({ map: renderTarget2.texture }));
// const plane2 = new THREE.Mesh(new THREE.PlaneGeometry(3, 10), new THREE.MeshBasicMaterial({ map: renderTarget1.texture }));

// Position and rotate the planes so they form a portal
// plane1.position.set(0, 0, -2);
// plane1.rotation.y = Math.PI;
// plane2.position.set(0, 0, 2);

// renderer ---------------------------------------------------------------------------------

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap; // THREE.VSMShadowMap;
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.physicallyCorrectLights = true;
renderer.gammaFactor = 2.2;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
container.appendChild(renderer.domElement);

// Render the scene from the perspective of each camera to its corresponding render target
// renderer.setRenderTarget(renderTarget1);
// renderer.render(scene, camera1);
// renderer.setRenderTarget(renderTarget2);
// renderer.render(scene, camera2);

// Render the scene normally, but use the render targets as textures for the portal planes
// renderer.setRenderTarget(null);
// scene.add(plane1);
// scene.add(plane2);
// renderer.render(scene, camera);

// balls ------------------------------------------------------------------------------------

const GRAVITY = 50;

const NUM_SPHERES = 100;
const SPHERE_RADIUS = 0.2;

const STEPS_PER_FRAME = 5;

const sphereGeometry = new THREE.IcosahedronGeometry(SPHERE_RADIUS, 5);
const sphereMaterial = new THREE.MeshLambertMaterial({ color: 0xbbbb44 });

const spheres = [];
let sphereIdx = 0;

for (let i = 0; i < NUM_SPHERES; i++) {
  const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
  sphere.castShadow = true;
  sphere.receiveShadow = true;

  scene.add(sphere);

  spheres.push({
    mesh: sphere,
    collider: new THREE.Sphere(new THREE.Vector3(0, -100, 0), SPHERE_RADIUS),
    velocity: new THREE.Vector3(),
  });
}

const worldOctree = new Octree();

const playerCollider = new Capsule(
  new THREE.Vector3(0, 0.35, 0),
  new THREE.Vector3(0, 1, 0),
  0.35
);

const playerVelocity = new THREE.Vector3();
const playerDirection = new THREE.Vector3();

let playerOnFloor = false;
let mouseTime = 0;

const keyStates = {};

const vector1 = new THREE.Vector3();
const vector2 = new THREE.Vector3();
const vector3 = new THREE.Vector3();

function throwBall() {
  const sphere = spheres[sphereIdx];

  camera.getWorldDirection(playerDirection);

  sphere.collider.center
    .copy(playerCollider.end)
    .addScaledVector(playerDirection, playerCollider.radius * 1.5);

  // throw the ball with more force if we hold the button longer, and if we move forward

  const impulse =
    15 + 30 * (1 - Math.exp((mouseTime - performance.now()) * 0.001));

  sphere.velocity.copy(playerDirection).multiplyScalar(impulse);
  sphere.velocity.addScaledVector(playerVelocity, 2);

  sphereIdx = (sphereIdx + 1) % spheres.length;
}

// gui --------------------------------------------------------------------------------------

document.addEventListener("keydown", (event) => {
  keyStates[event.code] = true;
});

document.addEventListener("keyup", (event) => {
  keyStates[event.code] = false;
});

document.addEventListener("click", (event) => {
  const tagName = event.target.tagName.toLowerCase();
  console.log(tagName);
  switch (tagName) {
    case "button":
      switch (event.target.id) {
        case "up":
          playerVelocity.add(getForwardVector().multiplyScalar(5));
          break;
        case "left":
          playerVelocity.add(getSideVector().multiplyScalar(-5));
          break;
        case "down":
          playerVelocity.add(getForwardVector().multiplyScalar(-5));
          break;
        case "right":
          playerVelocity.add(getSideVector().multiplyScalar(5));
          break;
        case "space":
          playerVelocity.y = 30;
          break;
      }
      break;
  }
});

container.addEventListener("mousedown", () => {
  document.body.requestPointerLock();

  mouseTime = performance.now();
});

document.addEventListener("mouseup", () => {
  // checks if its just a tap and if the screen is mobile
  if (
    document.pointerLockElement !== null &&
      !window.matchMedia("(max-width: 767px)").matches
  )
  throwBall();
});

document.body.addEventListener("mousemove", (event) => {
  if (document.pointerLockElement === document.body) {
    camera.rotation.y -= event.movementX / 500;
    camera.rotation.x -= event.movementY / 500;
  }
});

let touchStartX = 0;
let touchStartY = 0;
let touchMoveX = 0;
let touchMoveY = 0;

container.addEventListener("touchstart", () => {
  touchStartX = event.touches[0].clientX;
  touchStartY = event.touches[0].clientY;
});

document.addEventListener("touchmove", (event) => {
  touchMoveX = event.touches[0].clientX;
  touchMoveY = event.touches[0].clientY;
  const deltaX = touchMoveX - touchStartX;
  const deltaY = touchMoveY - touchStartY;
  camera.rotation.y -= deltaX / 2500;
  camera.rotation.x -= deltaY / 2500;
});

// document.addEventListener('touchend', () => {
//     // checks if its just a tap and if the screen is mobile
//     if (Math.abs(touchMoveX - touchStartX) < 10 && Math.abs(touchMoveY - touchStartY) < 10 && window.matchMedia('(max-width: 767px)').matches) throwBall();
// });

// Resize ------------------------------------------------------------------------------------

window.addEventListener("resize", onWindowResize);

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

// Player Interactions -----------------------------------------------------------------------

function playerCollisions() {
  const result = worldOctree.capsuleIntersect(playerCollider);

  playerOnFloor = false;

  if (result) {
    playerOnFloor = result.normal.y > 0;

    if (!playerOnFloor) {
      playerVelocity.addScaledVector(
        result.normal,
        -result.normal.dot(playerVelocity)
      );
    }

    playerCollider.translate(result.normal.multiplyScalar(result.depth));
  }
}

function updatePlayer(deltaTime) {
  let damping = Math.exp(-4 * deltaTime) - 1;

  if (!playerOnFloor) {
    playerVelocity.y -= GRAVITY * deltaTime;

    // small air resistance
    damping *= 0.1;
  }

  playerVelocity.addScaledVector(playerVelocity, damping);

  const deltaPosition = playerVelocity.clone().multiplyScalar(deltaTime);
  playerCollider.translate(deltaPosition);

  playerCollisions();

  camera.position.copy(playerCollider.end);
}

function playerSphereCollision(sphere) {
  const center = vector1
  .addVectors(playerCollider.start, playerCollider.end)
  .multiplyScalar(0.5);

  const sphere_center = sphere.collider.center;

  const r = playerCollider.radius + sphere.collider.radius;
  const r2 = r * r;

  // approximation: player = 3 spheres

  for (const point of [playerCollider.start, playerCollider.end, center]) {
    const d2 = point.distanceToSquared(sphere_center);

    if (d2 < r2) {
      const normal = vector1.subVectors(point, sphere_center).normalize();
      const v1 = vector2
      .copy(normal)
      .multiplyScalar(normal.dot(playerVelocity));
      const v2 = vector3
      .copy(normal)
      .multiplyScalar(normal.dot(sphere.velocity));

      playerVelocity.add(v2).sub(v1);
      sphere.velocity.add(v1).sub(v2);

      const d = (r - Math.sqrt(d2)) / 2;
      sphere_center.addScaledVector(normal, -d);
    }
  }
}

function spheresCollisions() {
  for (let i = 0, length = spheres.length; i < length; i++) {
    const s1 = spheres[i];

    for (let j = i + 1; j < length; j++) {
      const s2 = spheres[j];

      const d2 = s1.collider.center.distanceToSquared(s2.collider.center);
      const r = s1.collider.radius + s2.collider.radius;
      const r2 = r * r;

      if (d2 < r2) {
        const normal = vector1
        .subVectors(s1.collider.center, s2.collider.center)
        .normalize();
        const v1 = vector2.copy(normal).multiplyScalar(normal.dot(s1.velocity));
        const v2 = vector3.copy(normal).multiplyScalar(normal.dot(s2.velocity));

        s1.velocity.add(v2).sub(v1);
        s2.velocity.add(v1).sub(v2);

        const d = (r - Math.sqrt(d2)) / 2;

        s1.collider.center.addScaledVector(normal, d);
        s2.collider.center.addScaledVector(normal, -d);
      }
    }
  }
}

function updateSpheres(deltaTime) {
  spheres.forEach((sphere) => {
    sphere.collider.center.addScaledVector(sphere.velocity, deltaTime);

    const result = worldOctree.sphereIntersect(sphere.collider);

    if (result) {
      sphere.velocity.addScaledVector(
        result.normal,
        -result.normal.dot(sphere.velocity) * 1.5
      );
      sphere.collider.center.add(result.normal.multiplyScalar(result.depth));
    } else {
      sphere.velocity.y -= GRAVITY * deltaTime;
    }

    const damping = Math.exp(-1.5 * deltaTime) - 1;
    sphere.velocity.addScaledVector(sphere.velocity, damping);

    playerSphereCollision(sphere);
  });

  spheresCollisions();

  for (const sphere of spheres) {
    sphere.mesh.position.copy(sphere.collider.center);
  }
}

// Game Physics Functions --------------------------------------------------------------------

function getForwardVector() {
  camera.getWorldDirection(playerDirection);
  playerDirection.y = 0;
  playerDirection.normalize();

  return playerDirection;
}

function getSideVector() {
  camera.getWorldDirection(playerDirection);
  playerDirection.y = 0;
  playerDirection.normalize();
  playerDirection.cross(camera.up);

  return playerDirection;
}

function controls(deltaTime) {
  // gives a bit of air control
  const speedDelta = deltaTime * (playerOnFloor ? 15 : 8);

  if (keyStates["KeyW"]) {
    playerVelocity.add(getForwardVector().multiplyScalar(speedDelta));
  }

  if (keyStates["KeyS"]) {
    playerVelocity.add(getForwardVector().multiplyScalar(-speedDelta));
  }

  if (keyStates["KeyA"]) {
    playerVelocity.add(getSideVector().multiplyScalar(-speedDelta));
  }

  if (keyStates["KeyD"]) {
    playerVelocity.add(getSideVector().multiplyScalar(speedDelta));
  }

  if (playerOnFloor) {
    if (keyStates["Space"]) {
      playerVelocity.y = 15;
    }
  }
}

function teleportPlayerIfOob() {
  if (camera.position.y <= -25) {
    playerCollider.start.set(0, 0.35, 0);
    playerCollider.end.set(0, 1, 0);
    playerCollider.radius = 0.35;
    camera.position.copy(playerCollider.end);
    camera.rotation.set(0, 0, 0);
  }
}

// load the house model ----------------------------------------------------------------------

const loader = new GLTFLoader().setPath("assets/");

// loader.load("houseNoLight.glb", (gltf) => {
 loader.load("house_projects.glb", (gltf) => {
  scene.add(gltf.scene);

  worldOctree.fromGraphNode(gltf.scene);

  gltf.scene.traverse((child) => {
    if (child.isMesh) {
      // console.log(child);

      if (
        child.name.includes("text") ||
          child.name.includes("picture") ||
          child.name.includes("house") ||
          child.name.includes("floor") ||
          child.name.includes("bed")
      ) {
        child.castShadow = false;
      } else {
        child.castShadow = true;
      }

      if (false) {
        child.receiveShadow = false;
      } else {
        child.receiveShadow = true;
      }

      if (child.material.map) {
        child.material.map.anisotropy = 4;
      }
    }

    // if (child.isLight) {
    //     // child.castShadow = true;
    //     // child.shadow.camera.near = 0.01;
    //     // child.shadow.camera.far = 500;
    //     // child.shadow.camera.right = 30;
    //     // child.shadow.camera.left = - 30;
    //     // child.shadow.camera.top = 30;
    //     // child.shadow.camera.bottom = - 30;
    //     // child.shadow.mapSize.width = 1024;
    //     // child.shadow.mapSize.height = 1024;
    //     child.shadow.radius = 4;
    //     child.shadow.bias = - 0.00006;
    //     child.castShadow = true;
    //     // child.shadow.camera.near = 0.01;
    //     // child.shadow.camera.far = 500;
    //     child.shadow.camera.right = 1;
    //     child.shadow.camera.left = - 1;
    //     child.shadow.camera.top = 1;
    //     child.shadow.camera.bottom = - 1;
    //     // child.shadow.mapSize.width = 1024;
    //     // child.shadow.mapSize.height = 1024;
    //     child.shadow.bias = - 0.00006;
    //     // child.shadow.camera.updateProjectionMatrix();
    //     // child.shadow.blurSamples = 25
    // }
  });

  // const helper = new OctreeHelper(worldOctree);
  // helper.visible = false;
  // scene.add(helper);

  // const gui = new GUI({ width: 200 });
  // gui.add({ debug: false }, 'debug')
  //     .onChange(function (value) {

  //         helper.visible = value;

  //     });

  animate();
});

const cameraDistanceThreshold = 8; // Change this to the desired distance threshold

function updateLights() {
  // Update the camera and other objects in the scene

  const cameraPosition = camera.position;

  for (let i = 0; i < pointlights.length; i++) {
    const pointlight = pointlights[i];
    const distance = cameraPosition.distanceTo(pointlight.position);
    pointlight.visible = distance < cameraDistanceThreshold;
  }
}

function checkpoint() {
  console.log(camera.position);
  if (
    camera.position.y > 0.8 &&
      camera.position.x < -3 &&
      camera.position.z < -5
  ) {
  }
}

var frame_i = 0;

function animate() {
  const deltaTime = Math.min(0.05, clock.getDelta()) / STEPS_PER_FRAME;

  // we look for collisions in substeps to mitigate the risk of
  // an object traversing another too quickly for detection.

  for (let i = 0; i < STEPS_PER_FRAME; i++) {
    controls(deltaTime);

    updatePlayer(deltaTime);

    updateSpheres(deltaTime);
  }

  if (frame_i % 30 == 0) {
    teleportPlayerIfOob();
    updateLights();
    checkpoint();
  }

  frame_i += 1;


  stats.update();

  setTimeout( function() {

    requestAnimationFrame( animate );

  }, 1000 / 28 );

  renderer.render(scene, camera);

}

// Fade in ----------------------------------------------------------------------------------
container.style.display = "block";
container.style.opacity = 0;
const fadeIn = setInterval(() => {
  container.style.opacity = Number(container.style.opacity) + 0.1;
  if (container.style.opacity >= 1) {
    clearInterval(fadeIn);
  }
}, 100);
