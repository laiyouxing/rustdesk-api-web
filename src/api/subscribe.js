import request from '@/utils/request'

/**
 * 获取可选时长的定价列表
 */
export function getPlans () {
  return request({
    url: '/subscribe/plans',
    method: 'get',
  })
}

/**
 * 创建订阅订单
 * @param {string} channel - 支付渠道: wechat | alipay
 * @param {string} planKey - 时长 key: 1m / 3m / 6m / 12m
 */
export function createOrder (channel, planKey) {
  return request({
    url: '/subscribe/create-order',
    method: 'post',
    data: { channel, plan_key: planKey },
  })
}

/**
 * 查询订单状态
 * @param {string} outTradeNo - 商户订单号
 */
export function queryOrder (outTradeNo) {
  return request({
    url: `/subscribe/order/${outTradeNo}`,
    method: 'get',
  })
}

/**
 * 订单号认领邀请码（兜底）
 * @param {string} outTradeNo - 商户订单号
 */
export function claimCode (outTradeNo) {
  return request({
    url: '/subscribe/claim',
    method: 'post',
    data: { out_trade_no: outTradeNo },
  })
}

/**
 * 兑换邀请码
 * @param {string} code - 邀请码
 */
export function redeemCode (code) {
  return request({
    url: '/subscribe/redeem',
    method: 'post',
    data: { code },
  })
}

/**
 * 获取当前用户的订阅信息
 */
export function getMine () {
  return request({
    url: '/subscribe/mine',
    method: 'get',
  })
}

// ========== 后台管理 ==========

/**
 * 分页查询邀请码列表
 * @param {Object} params - { status, plan, page, size }
 */
export function adminListCodes (params) {
  return request({
    url: '/invite-codes',
    method: 'get',
    params,
  })
}

/**
 * 手动生成邀请码
 * @param {Object} req - { plan, expire_days }
 */
export function adminCreateCode (req) {
  return request({
    url: '/invite-codes',
    method: 'post',
    data: req,
  })
}

/**
 * 失效邀请码
 * @param {number} id - 邀请码 ID
 */
export function adminRevokeCode (id) {
  return request({
    url: `/invite-codes/${id}/revoke`,
    method: 'post',
  })
}

/**
 * 导出邀请码 CSV
 * @param {Object} params - { status, plan }
 */
export function adminExportCodes (params) {
  return request({
    url: '/invite-codes/export',
    method: 'get',
    params,
    responseType: 'blob',
  })
}
