import request from '@/utils/request'

// 获取服务器状态(探测当前用户自定义的所有服务器 + hbbr 负载)
export function serverStatus () {
  return request({
    url: '/server_status',
    method: 'get',
  })
}

// 列出当前用户的服务器条目
export function serverStatusList () {
  return request({
    url: '/server_status/list',
    method: 'get',
  })
}

// 新建服务器条目
export function serverStatusCreate (data) {
  return request({
    url: '/server_status/create',
    method: 'post',
    data,
  })
}

// 更新服务器条目
export function serverStatusUpdate (data) {
  return request({
    url: '/server_status/update',
    method: 'post',
    data,
  })
}

// 删除服务器条目
export function serverStatusDelete (id) {
  return request({
    url: '/server_status/delete',
    method: 'post',
    data: { id },
  })
}
