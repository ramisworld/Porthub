import type * as THREE from "three";

export interface SceneOpts {
  accent: THREE.Color;
  accent2: THREE.Color;
  intensity: number; // 0..1
}

export interface SceneHandle {
  group: THREE.Object3D;
  update: (
    dt: number,
    progress: number,
    vel: number,
    pointer: { x: number; y: number },
  ) => void;
}
