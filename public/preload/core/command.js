const process = require('node:process')
const child_process = require('node:child_process')
const fs = require('node:fs')
const path = require('node:path')
const os = require('node:os')
const { showNotification } = require('./system.js')

function command(cmd, options = {}) {
  return new Promise((resolve, reject) => {
    const isWindows = process.platform === 'win32'

    console.log('=== Command.js Debug ===')
    console.log('Received cmd:', cmd)
    console.log('Cmd type:', typeof cmd)
    console.log('Cmd length:', cmd.length)
    console.log('Cmd buffer (hex):', Buffer.from(cmd, 'utf8').toString('hex').substring(0, 200))
    console.log('Options:', options)

    // 准备环境变量
    const env = options.env ? { ...process.env, ...options.env } : process.env

    // 后台运行模式
    if (options.detached) {
      try {
        if (isWindows) {
          // Windows: 使用 cmd /c 但配置为完全后台，不显示窗口
          const spawnOptions = {
            detached: true,
            stdio: 'ignore',
            windowsHide: options.showWindow === true ? false : true,
            shell: false,
            windowsVerbatimArguments: true, // 保留参数原样，不做额外转义
            env
          }
          const child = child_process.spawn('cmd.exe', ['/c', cmd], spawnOptions)
          
          // 监听启动错误
          child.on('error', (error) => {
            console.error('后台命令启动失败:', error)
            const friendlyMsg = error.code === 'ENOENT' 
              ? '后台命令启动失败：找不到命令或可执行文件，请检查 PATH 环境变量配置'
              : `后台命令启动失败：${error.message}`
            showNotification(friendlyMsg)
          })
          
          child.unref()
        } else {
          // Linux/Mac: 使用 shell 执行
          const spawnOptions = {
            detached: true,
            stdio: 'ignore',
            shell: true,
            env
          }
          const child = child_process.spawn(cmd, [], spawnOptions)
          
          // 监听启动错误
          child.on('error', (error) => {
            console.error('后台命令启动失败:', error)
            const friendlyMsg = error.code === 'ENOENT' 
              ? '后台命令启动失败：找不到命令或可执行文件，请检查 PATH 环境变量配置'
              : `后台命令启动失败：${error.message}`
            showNotification(friendlyMsg)
          })
          
          child.unref()
        }
        resolve('命令已在后台启动')
      } catch (error) {
        console.error('后台命令启动异常:', error)
        const friendlyMsg = error.code === 'ENOENT' 
          ? '后台命令启动失败：找不到命令或可执行文件，请检查 PATH 环境变量配置'
          : `后台命令启动失败：${error.message}`
        showNotification(friendlyMsg)
        reject(error)
      }
      return
    }

    // 前台运行模式（需要等待输出）
    // Windows 中文路径特殊处理：通过临时批处理文件执行
    if (isWindows && /[\u4e00-\u9fa5]/.test(cmd)) {
      const tempBat = path.join(os.tmpdir(), `temp_${Date.now()}.bat`)
      try {
        // 写入批处理文件（使用 GBK 编码）
        fs.writeFileSync(tempBat, `@echo off\nchcp 65001>nul\n${cmd}`, { encoding: 'utf8' })
        
        const spawnOptions = {
          shell: false,
          windowsHide: true,
          stdio: 'pipe',
          env
        }
        
        const child = child_process.spawn('cmd.exe', ['/c', tempBat], spawnOptions)
        
        let stdout = ''
        let stderr = ''
        
        child.stdout.setEncoding('utf8')
        child.stderr.setEncoding('utf8')
        
        child.stdout.on('data', (data) => { stdout += data })
        child.stderr.on('data', (data) => { stderr += data })
        
        child.on('close', (code) => {
          // 删除临时文件
          try { fs.unlinkSync(tempBat) } catch {}
          
          if (code === 0 || code === null) {
            resolve(stdout.trim())
          } else {
            reject(new Error(`Command failed with code ${code}: ${stderr.trim()}`))
          }
        })
        
        child.on('error', (err) => {
          try { fs.unlinkSync(tempBat) } catch {}
          reject(err)
        })
        
        if (options.timeout) {
          setTimeout(() => {
            child.kill()
            try { fs.unlinkSync(tempBat) } catch {}
            resolve(stdout.trim() || '命令执行超时')
          }, options.timeout)
        }
        
        return
      } catch (err) {
        try { fs.unlinkSync(tempBat) } catch {}
        reject(err)
        return
      }
    }

    const exec = isWindows ? 'cmd.exe' : 'sh'
    const args = isWindows ? ['/c', cmd] : ['-c', cmd]

    const spawnOptions = {
      shell: false, // 不使用额外的 shell 层
      windowsHide: isWindows ? (options.showWindow === true ? false : true) : false,
      windowsVerbatimArguments: isWindows, // Windows 下保留参数原样
      stdio: 'pipe',
      env: {
        ...env,
        // 设置 Windows CMD 使用 UTF-8 编码
        ...(isWindows && { CHCP: '65001' })
      }
    }

    const child = child_process.spawn(exec, args, spawnOptions)

    let stdout = ''
    let stderr = ''

    // 处理编码问题
    const encoding = isWindows ? 'utf8' : 'utf8'
    child.stdout.setEncoding(encoding)
    child.stderr.setEncoding(encoding)

    child.stdout.on('data', (data) => { stdout += data })
    child.stderr.on('data', (data) => { stderr += data })

    child.on('close', (code) => {
      if (code === 0 || code === null) {
        resolve(stdout.trim())
      } else {
        reject(new Error(`Command failed with code ${code}: ${stderr.trim()}`))
      }
    })

    child.on('error', (err) => { reject(err) })

    // 超时处理
    if (options.timeout) {
      setTimeout(() => {
        child.kill()
        resolve(stdout.trim() || '命令执行超时')
      }, options.timeout)
    }
  })
}

module.exports = command
