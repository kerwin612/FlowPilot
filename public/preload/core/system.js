function showNotification(message) {
    try {
      if (window.utools && typeof window.utools.showNotification === 'function') {
        window.utools.showNotification(message)
      } else {
        console.warn('[Notification]', message)
      }
    } catch (err) {
      console.error('showNotification 调用失败:', err)
    }
  }

module.exports = {
  showNotification
}
