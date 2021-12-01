import { uglify } from 'rollup-plugin-uglify'
import typescript from 'rollup-plugin-typescript'
import strip from '@rollup/plugin-strip'
import dts from 'rollup-plugin-dts'
export default [
  {
    // external: ['pdf-to-printer'],
    input: 'src/index.ts',
    output: {
      file: 'es/index.js',
      format: 'esm',
    },
    plugins: [
      uglify(),
      typescript(),
      strip({
        include: '**/*.(ts|js)',
      }),
    ],
  },
  {
    input: 'src/index.ts',
    output: {
      file: 'typings/index.d.ts',
      format: 'esm',
    },
    plugins: [dts()],
  },
]
