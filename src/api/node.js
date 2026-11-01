import request from '@/utils/request'

// 集群节点列表（含调度权重与离线判定阈值）
export function nodeList (kind) {
  return request({
    url: '/node/list',
    params: kind ? { kind } : {},
  })
}

// 更新节点（权重/地域/内网地址/上下线）
export function nodeUpdate (data) {
  return request({
    url: '/node/update',
    method: 'post',
    data,
  })
}

// 删除节点
export function nodeDelete (id) {
  return request({
    url: '/node/delete',
    method: 'post',
    data: { id },
  })
}

// 调度权重
export function nodeScoreConfig () {
  return request({
    url: '/node/score-config',
  })
}

export function nodeSaveScoreConfig (data) {
  return request({
    url: '/node/score-config',
    method: 'post',
    data,
  })
}

// 立即刷新（重新探测可达性/RTT）
export function nodeRefresh () {
  return request({
    url: '/node/refresh',
    method: 'post',
  })
}

// 省份列表（与客户端「所属地区」同一套代码）
export function nodeRegions () {
  return request({
    url: '/node/regions',
  })
}
// 读取节点平台配置（JSON 文本）
export function nodeGetConfig (id) {
  return request({
    url: '/node/config',
    params: { id },
  })
}

// 下发节点平台配置
export function nodeSaveConfig (data) {
  return request({
    url: '/node/config',
    method: 'post',
    data,
  })
}