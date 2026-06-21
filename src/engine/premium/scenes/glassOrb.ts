import * as THREE from "three";
import type { SceneHandle, SceneOpts } from "../scene-types";

/** Refractive glass orb floating over a colored gradient backdrop the orb bends. */
export function createGlassOrb(opts: SceneOpts): SceneHandle {
  const group = new THREE.Group();

  // Backdrop: a large inward-facing sphere with an accent->accent2 vertical gradient
  // so the transmissive orb has something colorful to refract.
  const bgGeo = new THREE.SphereGeometry(60, 32, 32);
  const bgMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    uniforms: {
      top: { value: opts.accent.clone() },
      bottom: { value: opts.accent2.clone() },
    },
    vertexShader:
      "varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
    fragmentShader:
      "uniform vec3 top; uniform vec3 bottom; varying vec3 vP;" +
      "void main(){ float h = clamp(vP.y/60.0*0.5+0.5,0.0,1.0);" +
      "vec3 c = mix(bottom, top, h) * 0.5; gl_FragColor = vec4(c,1.0); }",
  });
  group.add(new THREE.Mesh(bgGeo, bgMat));

  // The orb.
  const geo = new THREE.IcosahedronGeometry(2.15, 32);
  const mat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color("#ffffff"),
    metalness: 0,
    roughness: 0.04,
    transmission: 1,
    thickness: 2.4,
    ior: 1.45,
    clearcoat: 1,
    clearcoatRoughness: 0.08,
    iridescence: 1,
    iridescenceIOR: 1.3,
    attenuationColor: opts.accent.clone(),
    attenuationDistance: 1.8,
  });
  const orb = new THREE.Mesh(geo, mat);
  group.add(orb);

  const l1 = new THREE.PointLight(opts.accent.getHex(), 18, 40);
  l1.position.set(6, 5, 7);
  const l2 = new THREE.PointLight(opts.accent2.getHex(), 14, 40);
  l2.position.set(-7, -4, 5);
  group.add(l1, l2, new THREE.AmbientLight(0x303048, 1.4));

  return {
    group,
    update(dt, progress, _vel, pointer) {
      orb.rotation.y += dt * 0.22;
      orb.rotation.x += dt * 0.08;
      orb.position.y = Math.sin(performance.now() * 0.0006) * 0.22;
      orb.scale.setScalar(1 + progress * 0.18);
      group.rotation.y += (pointer.x * 0.4 - group.rotation.y) * 0.04;
      group.rotation.x += (-pointer.y * 0.3 - group.rotation.x) * 0.04;
    },
  };
}
