class Logger {
  constructor(context = '') {
    this.context = context
  }

  _format(level, message, ...args) {
    const prefix = this.context ? `[${this.context}]` : ''
    return `[DAO][${level}]${prefix} ${message}`
  }

  debug(message, ...args) {
    console.log(this._format('DEBUG', message), ...args)
  }

  info(message, ...args) {
    console.log(this._format('INFO', message), ...args)
  }

  warn(message, ...args) {
    console.warn(this._format('WARN', message), ...args)
  }

  error(message, ...args) {
    console.error(this._format('ERROR', message), ...args)
  }
}

class DAOError extends Error {
  constructor(message, code, cause) {
    super(message)
    this.name = 'DAOError'
    this.code = code
    this.cause = cause
    this.timestamp = Date.now()
  }

  static notFound(id, entityType) {
    return new DAOError(
      `${entityType} with id "${id}" not found`,
      'NOT_FOUND'
    )
  }

  static validationError(message) {
    return new DAOError(message, 'VALIDATION_ERROR')
  }

  static storageError(message, cause) {
    return new DAOError(message, 'STORAGE_ERROR', cause)
  }

  static migrationError(message, cause) {
    return new DAOError(message, 'MIGRATION_ERROR', cause)
  }
}

module.exports = {
  Logger,
  DAOError
}
