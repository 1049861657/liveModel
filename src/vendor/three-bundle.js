/**
 * Three.js组件统一打包导出
 * 使用Rollup构建，包含所有需要的Three.js相关组件
 */

// 核心组件导出
export * as THREE from 'three';

// 加载器导出
export { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
export { ColladaLoader } from 'three/examples/jsm/loaders/ColladaLoader.js';
export { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
export { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';

// 控制器导出
export { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'; 