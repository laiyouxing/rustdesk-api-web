import request from '@/utils/request'

// 获取 hbbs/hbbr 服务状态（TCP 探测），仅管理员可访问
export function serverStatus () {
  return request({
    url: '/server_status',
    method: 'get',
  })
}
