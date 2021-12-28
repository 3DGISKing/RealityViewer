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
            // why tmp?
            // for "browser host reload"
            file: 'build/tmp/reality.js',
            format: 'umd',
            name: 'Reality',
            globals: globals,
            sourcemap: true,
        },
        plugins:[
            nodeResolve({
                // use "jsnext:main" if possible
                // see https://github.com/rollup/rollup/wiki/jsnext:main
                jsnext: true
            }),
            json()
        ]
    }
]