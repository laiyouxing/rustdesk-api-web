import request from '@/utils/request'

export function list(params) {
  return request({
    url: '/version/list',
    params,
  })
}

export function create(data) {
  return request({
    url: '/version/create',
    method: 'post',
    data,
  })
}

export function update(data) {
  return request({
    url: '/version/update',
    method: 'post',
    data,
  })
}

export function remove(data) {
  return request({
    url: '/version/delete',
    method: 'post',
    data,
  })
}

export function setEnable(data) {
  return request({
    url: '/version/setEnable',
    method: 'post',
    data,
  })
}
