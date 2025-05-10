import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'], // 入口文件
  format: ['cjs'], // 输出格式
  target: 'node16', // 目标环境
  splitting: false, // 是否拆分文件
  sourcemap: false, // 是否生成 sourcemap
  clean: true, // 是否清理输出目录
  outDir: 'dist', // 输出目录
  treeshake: false, // 树摇优化
  minify: false, // 压缩代码
  shims: true,
})
