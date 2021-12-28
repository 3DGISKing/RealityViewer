import { terser } from "rollup-plugin-terser";
import obfuscator from 'rollup-plugin-javascript-obfuscator'
import nodeResolve from 'rollup-plugin-node-resolve';
import json from '@rollup/plugin-json';

const globals = {
    Potree: 'Potree',
};

export default [
    {
        input: 'src/Reality.js',
        treeshake: false,
        external: ['Potree'],
        output: {
            file: 'build_release/reality.js',
            format: 'umd',
            name: 'Reality',
            globals: globals,
            sourcemap: false
        },
        plugins: [
            terser(),
            obfuscator({
                compact: true
            }),
            nodeResolve({
                // use "jsnext:main" if possible
                // see https://github.com/rollup/rollup/wiki/jsnext:main
                jsnext: true
            }),
            json()
        ]
    }
]