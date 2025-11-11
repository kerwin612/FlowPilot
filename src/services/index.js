import configService from './configService'
import workflowService from './workflowService'
import searchService from './searchService'
import systemService from './systemService'
import featureService from './featureService'

export { configService, workflowService, searchService, systemService, featureService }

// 默认导出一个服务集合
export default {
  config: configService,
  workflow: workflowService,
  search: searchService,
  system: systemService,
  feature: featureService
}
