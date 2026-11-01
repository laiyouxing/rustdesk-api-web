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

// 解除平台接管字段（fields 为空表示全部解除）
export function nodeUnlock (id, fields = []) {
  return request({
    url: '/node/unlock',
    method: 'post',
    data: { id, fields },
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

// 静态中继兜底列表（未接入 agent 的中继，避免调度结果把 -r 缩水）
export function nodeStaticRelays () {
  return request({
    url: '/node/static-relays',
  })
}

export function nodeSaveStaticRelays (list) {
  return request({
    url: '/node/static-relays',
    method: 'post',
    data: { list },
  })
}

// 节点专用密钥（请求头 X-Node-Secret）
export function nodeSecret () {
  return request({
    url: '/node/secret',
  })
}

// secret 传空串表示由服务端生成随机密钥
export function nodeSaveSecret (secret) {
  return request({
    url: '/node/secret',
    method: 'post',
    data: { secret },
  })
}
