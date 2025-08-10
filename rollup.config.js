import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';

/**
 * @type {import('rollup').RollupOptions}
 */
const config = {
  input: '../scm-slang/src/index.ts',
  output: {
    file: 'dist/index.js',
    format: 'umd',
    name: 'ScmSlangRunner',
    sourcemap: false  // Disable source map to avoid CORS issues
  },
  plugins: [
    resolve(),
    commonjs(),
    typescript({
      tsconfig: '../scm-slang/tsconfig.json'
    })
  ]
};

export default config; 