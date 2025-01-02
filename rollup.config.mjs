import { nodeResolve } from '@rollup/plugin-node-resolve';

export default [{
  input: 'src/vendor/model-viewer-bundle.js',
  output: {
    file: 'public/vendor/model-viewer-bundle.js',
    format: 'es',
    name: 'ModelViewer'
  },
  plugins: [nodeResolve()]
}, {
  input: 'src/vendor/three-bundle.js',
  output: {
    file: 'public/vendor/three-bundle.js',
    format: 'es',
    name: 'Three'
  },
  plugins: [nodeResolve()]
}] 