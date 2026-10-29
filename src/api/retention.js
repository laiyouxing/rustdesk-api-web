import request from '@/utils/request'

// 保留策略（日志 / 审计记录）
export function retentionInfo () {
  return request({
    url: '/retention/info',
  })
}

export function retentionUpdate (data) {
  return request({
    url: '/retention/update',
    method: 'post',
    data,
  })
}
