#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')
const readline = require('readline')

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

/**
 * 询问用户输入
 * @param {string} question 问题文本
 * @returns {Promise<string>} 用户输入的答案
 */
const askQuestion = (question) => {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer)
    })
  })
}

/**
 * 询问目录名称，如果目录已存在则重新询问
 * @returns {Promise<string>} 有效的目录名称
 */
const askForValidDirectory = async () => {
  while (true) {
    const dirName = await askQuestion('请输入要创建的目录名称: ')

    if (!dirName) {
      console.log('错误: 目录名称不能为空')
      continue
    }

    const targetDir = path.resolve(process.cwd(), dirName)

    if (fs.existsSync(targetDir)) {
      console.log(`错误: 目录 "${dirName}" 已存在，请输入其他名称`)
      continue
    }

    return { dirName, targetDir }
  }
}

/**
 * 主函数
 */
const main = async () => {
  try {
    // 询问目录名称，确保目录不存在
    const { dirName, targetDir } = await askForValidDirectory()

    // 创建目录
    fs.mkdirSync(targetDir)
    console.log(`已创建目录: ${targetDir}`)

    // 切换到新目录并初始化package.json
    process.chdir(targetDir)
    console.log('正在初始化 package.json...')
    execSync('npm init -y', { stdio: 'inherit' })

    // 获取当前npm包的路径
    const packageDir = path.resolve(__dirname)
    const sourceIndexJs = path.resolve(packageDir, 'dist', 'index.js')
    const targetIndexJs = path.resolve(targetDir, 'index.js')

    if (!fs.existsSync(sourceIndexJs)) {
      console.error(`错误: 源文件不存在: ${sourceIndexJs}`)
      rl.close()
      return
    }

    fs.copyFileSync(sourceIndexJs, targetIndexJs)
    console.log(`已复制 index.js 到 ${targetDir}`)

    console.log('\n设置完成!')
    console.log('您可以通过以下命令启动项目:')
    console.log(`cd ${dirName}`)
    console.log('node .')
  } catch (error) {
    console.error('发生错误:', error.message)
  } finally {
    rl.close()
  }
}

main()
