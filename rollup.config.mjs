import typescript from '@rollup/plugin-typescript'
import commonjs from '@rollup/plugin-commonjs'
import nodeResolve from '@rollup/plugin-node-resolve'

const external = ['node']

const plugins = [
    nodeResolve(),
    commonjs(),
    typescript({
        tsconfig: './tsconfig.json',
        declaration: true,
        declarationDir: './dist',
        outDir: './dist'
    })
]

export default [
    {
        input: 'src/main.ts',
        output: {
            file: 'dist/main.mjs',
            format: 'esm',
            sourcemap: true
        },
        external,
        plugins
    },
    {
        input: 'src/main.ts',
        output: {
            file: 'dist/main.cjs',
            format: 'cjs',
            sourcemap: true,
            exports: 'named'
        },
        external,
        plugins
    }
]