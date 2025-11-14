// 默认配置 - 按平台拆分
const CONFIG_VERSION = '1.0'

module.exports = {
  version: CONFIG_VERSION,
  win32: require('./defaults/win32'),
  linux: require('./defaults/linux'),
  darwin: require('./defaults/darwin')
}
