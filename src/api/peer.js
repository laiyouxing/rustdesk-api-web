import request from '@/utils/request'

export function list (params) {
  return request({
    url: '/peer/list',
    params,
  })
}

export function detail (id) {
  return request({
    url: `/peer/detail/${id}`,
  })
}

export function create (data) {
  return request({
    url: '/peer/create',
    method: 'post',
    data,
  })
}

export function update (data) {
  return request({
    url: '/peer/update',
    method: 'post',
    data,
  })
}

export function remove (data) {
  return request({
    url: '/peer/delete',
    method: 'post',
    data,
  })
}

export function batchRemove (data) {
  return request({
    url: '/peer/batchDelete',
    method: 'post',
    data,
  })
}

export function simpleData (data) {
  return request({
    url: '/peer/simpleData',
    method: 'post',
    data,
  })
}

// 地域：省份列表（下拉框数据源）
export function regions () {
  return request({
    url: '/peer/regions',
  })
}

// 地域：批量为设备设置所属地域（ids 为设备远端 ID）
export function batchSetRegion (data) {
  return request({
    url: '/peer/batch-region',
    method: 'post',
    data,
  })
}