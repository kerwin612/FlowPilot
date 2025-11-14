const CURRENT_VERSION = '2.0.0'

const WorkflowMode = {
  COMPOSED: 'composed',
  COMMAND: 'command'
}

const ItemType = {
  WORKFLOW: 'workflow',
  FOLDER: 'folder'
}

class Version {
  constructor(version = CURRENT_VERSION) {
    this.version = version
    this.updatedAt = Date.now()
  }
}

class Config {
  constructor() {
    this.version = CURRENT_VERSION
    this.platform = null
    this.tabs = []
  }
}

class Tab {
  constructor(id, name) {
    this.id = id
    this.name = name
    this.items = []
  }
}

class Cmd {
  constructor() {
    this.match = ''
    this.command = ''
    this.timeout = 0
    this.runInBackground = false
    this.showWindow = true
    this.env = {}
  }
}

class Executor {
  constructor(key) {
    this.key = key
    this.config = {}
  }
}

class Action {
  constructor(key) {
    this.key = key
    this.config = {}
  }
}

class Workflow {
  constructor(id, name, mode = WorkflowMode.COMPOSED) {
    this.id = id
    this.type = ItemType.WORKFLOW
    this.name = name
    this.mode = mode
    this.icon = null
    
    if (mode === WorkflowMode.COMMAND) {
      this.cmds = [new Cmd()]
    } else {
      this.cmds = []
      this.executors = []
      this.actions = []
    }
    
    this.createdAt = Date.now()
    this.updatedAt = Date.now()
  }
}

class Folder {
  constructor(id, name) {
    this.id = id
    this.type = ItemType.FOLDER
    this.name = name
    this.icon = null
    this.items = []
    this.createdAt = Date.now()
    this.updatedAt = Date.now()
  }
}

class EnvVar {
  constructor(id, name, value) {
    this.id = id
    this.name = name
    this.value = value
    this.enabled = true
    this.description = ''
    this.createdAt = Date.now()
    this.updatedAt = Date.now()
  }
}

class GlobalVar {
  constructor(id, key, value) {
    this.id = id
    this.key = key
    this.value = value
    this.name = ''
    this.tags = []
    this.description = ''
    this.createdAt = Date.now()
    this.updatedAt = Date.now()
  }
}

module.exports = {
  CURRENT_VERSION,
  WorkflowMode,
  ItemType,
  Version,
  Config,
  Tab,
  Cmd,
  Executor,
  Action,
  Workflow,
  Folder,
  EnvVar,
  GlobalVar
}
