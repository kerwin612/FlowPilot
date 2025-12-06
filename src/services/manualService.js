// Manual service wrapper to read manuals via preload-exposed services
// Returns promises for future extensibility

export const manualService = {
  async listManuals(opts = {}) {
    if (typeof window !== 'undefined' && window.services?.manuals?.listManuals) {
      return window.services.manuals.listManuals(opts) || []
    }
    console.warn('manualService.listManuals 不可用')
    return []
  },
  async getManualDetail(opts = {}) {
    if (typeof window !== 'undefined' && window.services?.manuals?.getManualDetail) {
      return window.services.manuals.getManualDetail(opts) || null
    }
    console.warn('manualService.getManualDetail 不可用')
    return null
  }
}
