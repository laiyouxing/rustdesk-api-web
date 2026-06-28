import request from '@/utils/request'

export function list() {
  return request({ url: '/alert_config/list' })
}

export function create(data) {
  return request({ url: '/alert_config/create', method: 'post', data })
}

export function update(data) {
  return request({ url: '/alert_config/update', method: 'post', data })
}

export function remove(data) {
  return request({ url: '/alert_config/delete', method: 'post', data })
}
