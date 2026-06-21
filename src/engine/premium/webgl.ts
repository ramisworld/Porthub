import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { RGBShiftShader } from "three/examples/jsm/shaders/RGBShiftShader.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import type { DesignSpec } from "../spec";
import type { SceneHandle } from "./scene-types";
import { createStarfield } from "./scenes/starfield";
import { createGlassOrb } from "./scenes/glassOrb";

export interface WebGLHandle {
  setProgress: (progress: number, vel: number) => void;
}

export function initWebGL(spec: DesignSpec): WebGLHandle {
  const canvas = document.createElement("canvas");
  canvas.id = "ph-webgl";
  canvas.style.cssText =
    "position:fixed;inset:0;z-index:0;pointer-events:none";
  document.body.appendChild(canvas);

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.setSize(window.innerWidth, window.innerHeight);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    2000,
  );
  camera.position.z = 6;

  const accent = new THREE.Color(spec.theme.accent);
  const accent2 = new THREE.Color(spec.theme.accent2);
  const sceneOpts = { accent, accent2, intensity: spec.webgl.intensity };

  const handle: SceneHandle =
    spec.webgl.scene === "glassOrb"
      ? createGlassOrb(sceneOpts)
      : createStarfield(sceneOpts);
  scene.add(handle.group);

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  if (spec.postfx.bloom > 0.01) {
    composer.addPass(
      new UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        spec.postfx.bloom * 1.4,
        0.6,
        0.2,
      ),
    );
  }
  if (spec.postfx.chromatic > 0.01) {
    const rgb = new ShaderPass(RGBShiftShader);
    (rgb.uniforms.amount as { value: number }).value =
      spec.postfx.chromatic * 0.0026;
    composer.addPass(rgb);
  }
  composer.addPass(new OutputPass());

  const pointer = { x: 0, y: 0 };
  window.addEventListener(
    "pointermove",
    (e) => {
      pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
    },
    { passive: true },
  );

  const onResize = () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  };
  window.addEventListener("resize", onResize);

  const clock = new THREE.Clock();
  let progress = 0;
  let vel = 0;
  const loop = () => {
    const dt = Math.min(clock.getDelta(), 0.05);
    handle.update(dt, progress, vel, pointer);
    composer.render();
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);

  return {
    setProgress(p, v) {
      progress = p;
      vel = v;
    },
  };
}
