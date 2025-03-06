import { nodeResolve } from '@rollup/plugin-node-resolve';

export default [{
  input: 'src/vendor/three-bundle.js',
  output: {
    file: 'public/vendor/three-bundle.js',
    format: 'es',
    name: 'Three'
  },
  plugins: [nodeResolve()]
}] 