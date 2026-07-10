import request from '@/utils/request'

// 进程/端口监控：管理员侧规则管理 + 状态查看
export function processRules () {
  return request({ url: '/process_monitor/rules', method: 'get' })
}
export function createProcessRule (data) {
  return request({ url: '/process_monitor/rule/create', method: 'post', data })
}
export function updateProcessRule (data) {
  return request({ url: '/process_monitor/rule/update', method: 'post', data })
}
export function deleteProcessRule (data) {
  return request({ url: '/process_monitor/rule/delete', method: 'post', data })
}
export function processStatus (params) {
  return request({ url: '/process_monitor/status', method: 'get', params })
}
// 复用告警规则列表，用于规则表单的下拉选择
export function alertConfigList () {
  return request({ url: '/alert_config/list', method: 'get' })
}
