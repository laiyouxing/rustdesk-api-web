import request from '@/utils/request'

export function list(params) {
  return request({
    url: '/strategy/list',
    params,
  })
}

export function create(data) {
  return request({
    url: '/strategy/create',
    method: 'post',
    data,
  })
}

export function update(data) {
  return request({
    url: '/strategy/update',
    method: 'post',
    data,
  })
}

export function remove(data) {
  return request({
    url: '/strategy/delete',
    method: 'post',
    data,
  })
}
