import request from '@/utils/request'

// 直连上报记录（合规审计）
export function directOkList (params) {
  return request({
    url: '/punch_direct_ok/list',
    params,
  })
}

export function directOkRemove (data) {
  return request({
    url: '/punch_direct_ok/delete',
    method: 'post',
    data,
  })
}

export function directOkBatchDelete (data) {
  return request({
    url: '/punch_direct_ok/batchDelete',
    method: 'post',
    data,
  })
}
