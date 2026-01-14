import * as THREE from "three";
import type { Point2D } from "../../../types";

/**
 * Create a north arrow indicator for the 3D scene
 * Points towards geographic north (negative Z in Three.js convention)
 */
export function createNorthArrow(): THREE.Group {
  const group = new THREE.Group();
  group.name = "NorthArrow";

  const arrowLength = 15;
  const arrowRadius = 1;

  // North arrow shaft
  const shaftGeo = new THREE.CylinderGeometry(
    arrowRadius * 0.5,
    arrowRadius * 0.5,
    arrowLength,
    8
  );
  const northMaterial = new THREE.MeshStandardMaterial({
    color: 0xcc0000,
    roughness: 0.5,
    metalness: 0.3,
  });
  const shaft = new THREE.Mesh(shaftGeo, northMaterial);
  shaft.rotation.x = Math.PI / 2;
  shaft.position.z = -arrowLength / 2;

  // Arrow head (cone)
  const headGeo = new THREE.ConeGeometry(arrowRadius * 1.5, arrowRadius * 4, 8);
  const head = new THREE.Mesh(headGeo, northMaterial);
  head.rotation.x = Math.PI / 2;
  head.position.z = -arrowLength - arrowRadius * 2;

  // South end (smaller)
  const southMaterial = new THREE.MeshStandardMaterial({
    color: 0x666666,
    roughness: 0.7,
    metalness: 0.2,
  });
  const tailGeo = new THREE.SphereGeometry(arrowRadius * 0.8, 8, 8);
  const tail = new THREE.Mesh(tailGeo, southMaterial);
  tail.position.z = arrowRadius * 0.5;

  // N label
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#cc0000";
  ctx.font = "bold 48px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("N", 32, 32);

  const texture = new THREE.CanvasTexture(canvas);
  const labelMaterial = new THREE.SpriteMaterial({ map: texture });
  const label = new THREE.Sprite(labelMaterial);
  label.position.set(0, 0, -arrowLength - arrowRadius * 6);
  label.scale.set(10, 10, 1);

  group.add(shaft);
  group.add(head);
  group.add(tail);
  group.add(label);

  return group;
}

/**
 * Create a scale bar for the 3D scene
 */
export function createScaleBar(): THREE.Group {
  const group = new THREE.Group();
  group.name = "ScaleBar";
  return group;
}

/**
 * Update scale bar dimensions and position
 */
export function updateScaleBar(
  group: THREE.Group,
  center: Point2D,
  size: number,
  _scale: number
): void {
  // Clear existing children
  while (group.children.length > 0) {
    group.remove(group.children[0]);
  }

  // Calculate scale bar length (target ~50m in real units)
  const targetLength = 50;
  const scaleBarLength = targetLength;
  const halfSize = size / 2;

  // Position at corner of scene
  const posX = center.x - halfSize + 20;
  const posZ = center.y + halfSize - 20;

  // Bar geometry
  const barGeo = new THREE.BoxGeometry(scaleBarLength, 1, 2);
  const barMat = new THREE.MeshStandardMaterial({
    color: 0x333333,
    roughness: 0.8,
  });
  const bar = new THREE.Mesh(barGeo, barMat);
  bar.position.set(posX + scaleBarLength / 2, 0.5, posZ);

  // Tick marks
  const tickGeo = new THREE.BoxGeometry(1, 3, 2);
  const startTick = new THREE.Mesh(tickGeo, barMat);
  startTick.position.set(posX, 1.5, posZ);
  const endTick = new THREE.Mesh(tickGeo, barMat);
  endTick.position.set(posX + scaleBarLength, 1.5, posZ);

  // Label
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 32;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#333333";
  ctx.font = "bold 20px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(`${targetLength}m`, 64, 16);

  const texture = new THREE.CanvasTexture(canvas);
  const labelMat = new THREE.SpriteMaterial({ map: texture });
  const label = new THREE.Sprite(labelMat);
  label.position.set(posX + scaleBarLength / 2, 8, posZ);
  label.scale.set(20, 5, 1);

  group.add(bar);
  group.add(startTick);
  group.add(endTick);
  group.add(label);
}

/**
 * Create ground plane for the scene
 */
export function createGroundPlane(size: number): THREE.Mesh {
  const groundGeo = new THREE.PlaneGeometry(size * 2, size * 2);
  const groundMat = new THREE.MeshStandardMaterial({
    color: 0xcccccc,
    roughness: 0.9,
    metalness: 0.0,
    side: THREE.DoubleSide,
  });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.1;
  ground.receiveShadow = true;
  ground.name = "Ground";

  return ground;
}

/**
 * Create grid helper for the scene
 */
export function createGrid(size: number): THREE.GridHelper {
  const grid = new THREE.GridHelper(size * 2, 40, 0x888888, 0xdddddd);
  grid.position.y = 0;
  return grid;
}

/**
 * Create ambient and hemisphere lights
 */
export function createAmbientLighting(): THREE.Light[] {
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
  const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.4);
  hemiLight.position.set(0, 100, 0);

  return [ambientLight, hemiLight];
}

/**
 * Create directional sun light with shadow support
 */
export function createSunLight(shadowMapSize: number = 2048): THREE.DirectionalLight {
  const sunLight = new THREE.DirectionalLight(0xffffff, 1.5);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.width = shadowMapSize;
  sunLight.shadow.mapSize.height = shadowMapSize;
  sunLight.shadow.camera.near = 1;
  sunLight.shadow.camera.far = 500;
  sunLight.shadow.bias = -0.0001;
  sunLight.shadow.normalBias = 0.02;

  return sunLight;
}

/**
 * Update sun light shadow camera to fit scene bounds
 */
export function updateSunLightShadow(
  sunLight: THREE.DirectionalLight,
  size: number
): void {
  const shadowSize = size * 1.5;
  sunLight.shadow.camera.left = -shadowSize;
  sunLight.shadow.camera.right = shadowSize;
  sunLight.shadow.camera.top = shadowSize;
  sunLight.shadow.camera.bottom = -shadowSize;
  sunLight.shadow.camera.updateProjectionMatrix();
}
