import * as THREE from "three";
import type { SceneHandle, SceneOpts } from "../scene-types";

/** Hyperspace starfield: points stream toward the camera; scroll warps the speed. */
export function createStarfield(opts: SceneOpts): SceneHandle {
  const N = Math.round(1400 + opts.intensity * 2600);
  const DEPTH = 70;

  const pos = new Float32Array(N * 3);
  const col = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 44;
    pos[i * 3 + 1] = (Math.random() - 0.5) * 44;
    pos[i * 3 + 2] = -Math.random() * DEPTH;
    const c = Math.random() < 0.5 ? opts.accent : opts.accent2;
    const t = 0.55 + Math.random() * 0.45;
    col[i * 3] = c.r * t;
    col[i * 3 + 1] = c.g * t;
    col[i * 3 + 2] = c.b * t;
  }

  const geo = new THREE.BufferGeometry();
  const posAttr = new THREE.BufferAttribute(pos, 3);
  geo.setAttribute("position", posAttr);
  geo.setAttribute("color", new THREE.BufferAttribute(col, 3));

  const mat = new THREE.PointsMaterial({
    size: 0.07 + opts.intensity * 0.05,
    transparent: true,
    opacity: 0.92,
    vertexColors: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  const points = new THREE.Points(geo, mat);
  const group = new THREE.Group();
  group.add(points);

  let speed = 6;
  return {
    group,
    update(dt, progress, vel, pointer) {
      const target = 6 + Math.abs(vel) * 0.5 + progress * 34;
      speed += (target - speed) * 0.08;
      const step = speed * dt;
      for (let i = 0; i < N; i++) {
        let z = posAttr.getZ(i) + step;
        if (z > 6) {
          z = -DEPTH;
          posAttr.setX(i, (Math.random() - 0.5) * 44);
          posAttr.setY(i, (Math.random() - 0.5) * 44);
        }
        posAttr.setZ(i, z);
      }
      posAttr.needsUpdate = true;
      group.rotation.z += dt * 0.02;
      group.position.x += (pointer.x * 0.7 - group.position.x) * 0.04;
      group.position.y += (pointer.y * 0.5 - group.position.y) * 0.04;
    },
  };
}
