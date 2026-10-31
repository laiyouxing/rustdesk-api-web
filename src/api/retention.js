import request from '@/utils/request'

// 存储管理：各类数据的保留策略（日志 / 审计 / 站内消息 / 登录日志 / 操作日志）
export function retentionInfo () {
  return request({
    url: '/retention/info',
  })
}

// 存储占用统计（各表行数 + 数据库与日志目录磁盘占用）
export function retentionStats () {
  return request({
    url: '/retention/stats',
  })
}

export function retentionUpdate (data) {
  return request({
    url: '/retention/update',
    method: 'post',
    data,
  })
}
