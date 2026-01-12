import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { join } from 'path'

// Custom plugin to watch preload files and trigger full reload
const watchPreloadPlugin = () => ({
  name: 'watch-preload',
  configureServer(server) {
    server.watcher.add(join(process.cwd(), 'public/**/*'))
    server.watcher.on('change', (file) => {
      // Normalize path separators for cross-platform compatibility
      const normalizedFile = file.replace(/\\/g, '/')
      if (normalizedFile.includes('public/')) {
        server.ws.send({
          type: 'full-reload',
        })
      }
    })
  }
})

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    watchPreloadPlugin()
  ],
  base: './',
  server: {
    watch: {
      // 根因修复：
      // 1. 检测到项目路径是软链接：/kerwin612/.in_wsl/.home/.lws/FlowPilot -> /mnt/d/workspace/.kerwin612/FlowPilot/
      // 2. 目标路径位于 /mnt/d (Windows NTFS 分区)。
      // 3. WSL 2 对挂载的 Windows 分区 (DrvFs) 的文件变更通知 (inotify) 支持不完整，必须开启轮询 (Polling) 才能可靠监听。
      usePolling: true,
      // 同时覆盖忽略规则，确保点目录 (.kerwin612) 被监听
      ignored: ['**/node_modules/**', '**/.git/**']
    }
  }
})
