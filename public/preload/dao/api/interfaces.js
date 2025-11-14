class IStorage {
  get(key) {
    throw new Error('Method not implemented')
  }

  set(key, value) {
    throw new Error('Method not implemented')
  }

  remove(key) {
    throw new Error('Method not implemented')
  }

  has(key) {
    throw new Error('Method not implemented')
  }

  keys(prefix = '') {
    throw new Error('Method not implemented')
  }

  clear(prefix = '') {
    throw new Error('Method not implemented')
  }
}

class IRepository {
  findById(id) {
    throw new Error('Method not implemented')
  }

  findAll() {
    throw new Error('Method not implemented')
  }

  save(entity) {
    throw new Error('Method not implemented')
  }

  delete(id) {
    throw new Error('Method not implemented')
  }

  exists(id) {
    throw new Error('Method not implemented')
  }

  count() {
    throw new Error('Method not implemented')
  }
}

module.exports = {
  IStorage,
  IRepository
}
