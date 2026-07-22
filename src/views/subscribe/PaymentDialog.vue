<template>
  <el-dialog
    :model-value="visible"
    :title="T('SubscribeUpgrade')"
    width="480px"
    :close-on-click-modal="false"
    @update:model-value="$emit('update:visible', $event)"
    @closed="handleClosed"
  >
    <!-- 步骤1：选择套餐和支付渠道 -->
    <template v-if="step === 'select'">
      <div class="plan-section">
        <div class="plan-card" :class="{ active: selectedPlan === 'pro' }" @click="selectedPlan = 'pro'">
          <div class="plan-name">Pro</div>
          <div class="plan-price">{{ priceText }}</div>
          <div class="plan-period">{{ T('SubscribeMonthly') }}</div>
          <div class="plan-tag" v-if="showTag">{{ T('SubscribeRecommended') }}</div>
        </div>
      </div>

      <div class="channel-section">
        <div class="section-label">{{ T('SubscribeSelectChannel') }}</div>
        <el-radio-group v-model="channel" class="channel-group">
          <el-radio value="alipay" border class="channel-radio">
            <el-icon><el-icon-coin /></el-icon>
            {{ T('Alipay') }}
          </el-radio>
          <el-radio value="wechat" border class="channel-radio">
            <el-icon><el-icon-chat-dot-round /></el-icon>
            {{ T('WechatPay') }}
          </el-radio>
        </el-radio-group>
      </div>

      <div class="dialog-footer-actions">
        <el-button @click="$emit('update:visible', false)">{{ T('Cancel') }}</el-button>
        <el-button type="primary" :loading="creating" @click="handleCreateOrder">
          {{ T('SubscribePayNow') }}
        </el-button>
      </div>
    </template>

    <!-- 步骤2：展示二维码/收银台链接 -->
    <template v-if="step === 'qrcode'">
      <div class="qrcode-section">
        <div class="qrcode-hint">{{ T('SubscribeScanQR') }}</div>
        <div class="qrcode-wrapper" v-loading="!qrPayload">
          <img v-if="qrPayload" :src="qrImageSrc" alt="QR Code" class="qrcode-img" />
        </div>
        <div v-if="cashierUrl" class="cashier-link">
          <el-button link type="primary" @click="openCashier">{{ T('SubscribeOpenCashier') }}</el-button>
        </div>
        <div class="order-info">
          <span>{{ T('OrderNo') }}: {{ orderInfo.out_trade_no }}</span>
          <span class="order-amount">{{ formatAmount(orderInfo.amount_cents) }}</span>
        </div>
        <div class="polling-status" v-if="pollingSeconds > 0">
          <el-icon class="is-loading"><el-icon-loading /></el-icon>
          {{ T('SubscribePolling') }} ({{ pollingSeconds }}s)
        </div>
      </div>
    </template>

    <!-- 步骤3：支付成功，展示邀请码 -->
    <template v-if="step === 'success'">
      <div class="success-section">
        <el-result icon="success" :title="T('SubscribeSuccess')">
          <template #sub-title>
            <p>{{ T('SubscribeCodeTitle') }}</p>
            <div class="invite-code-box" @click="copyCode">
              <code class="invite-code">{{ inviteCode }}</code>
              <el-icon><el-icon-copy-document /></el-icon>
            </div>
            <p class="code-hint">{{ T('SubscribeCodeHint') }}</p>
          </template>
          <template #extra>
            <el-button type="primary" @click="$emit('update:visible', false)">
              {{ T('GotIt') }}
            </el-button>
          </template>
        </el-result>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed, watch, onUnmounted } from 'vue'
import { T } from '@/utils/i18n'
import { ElMessage } from 'element-plus'
import { createOrder, queryOrder } from '@/api/subscribe'

const props = defineProps({
  visible: Boolean,
})
const emit = defineEmits(['update:visible', 'activated'])

const step = ref('select') // select | qrcode | success
const selectedPlan = ref('pro')
const channel = ref('alipay')
const creating = ref(false)
const orderInfo = ref({})
const qrPayload = ref('')
const cashierUrl = ref('')
const inviteCode = ref('')
const pollingSeconds = ref(0)
let pollingTimer = null

const priceText = computed(() => {
  // 默认 ¥10/月
  return '¥10.00 / ' + T('SubscribeMonth')
})
const showTag = computed(() => true)

const qrImageSrc = computed(() => {
  if (!qrPayload.value) return ''
  // 如果qrPayload已经是完整URL则直接显示，否则当成二维码文本内容生成
  if (qrPayload.value.startsWith('http://') || qrPayload.value.startsWith('https://')) {
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrPayload.value)}`
  }
  return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrPayload.value)}`
})

const formatAmount = (cents) => {
  if (!cents) return '¥0.00'
  return '¥' + (cents / 100).toFixed(2)
}

const handleCreateOrder = async () => {
  if (!channel.value) {
    ElMessage.warning(T('SubscribeSelectChannelFirst'))
    return
  }
  creating.value = true
  try {
    const res = await createOrder(channel.value, selectedPlan.value)
    if (res.code) {
      ElMessage.error(res.message || T('SubscribeCreateFailed'))
      return
    }
    orderInfo.value = res.data
    qrPayload.value = res.data.qr_payload || ''
    cashierUrl.value = res.data.cashier_url || ''
    step.value = 'qrcode'
    startPolling(res.data.out_trade_no)
  } catch (e) {
    ElMessage.error(T('SubscribeCreateFailed'))
  } finally {
    creating.value = false
  }
}

const startPolling = (outTradeNo) => {
  let elapsed = 0
  pollingTimer = setInterval(async () => {
    elapsed += 3
    pollingSeconds.value = elapsed
    try {
      const res = await queryOrder(outTradeNo)
      if (res.code) return
      const data = res.data
      if (data.status === 'paid' && data.code_issued) {
        clearInterval(pollingTimer)
        pollingTimer = null
        inviteCode.value = data.invite_code || ''
        step.value = 'success'
        emit('activated')
      }
    } catch (_) {
      // 轮询错误忽略
    }
  }, 3000)
}

const openCashier = () => {
  if (cashierUrl.value) {
    window.open(cashierUrl.value, '_blank')
  }
}

const copyCode = () => {
  if (!inviteCode.value) return
  navigator.clipboard.writeText(inviteCode.value).then(() => {
    ElMessage.success(T('CopySuccess'))
  }).catch(() => {
    ElMessage.warning(T('CopyFailed'))
  })
}

const handleClosed = () => {
  step.value = 'select'
  orderInfo.value = {}
  qrPayload.value = ''
  cashierUrl.value = ''
  inviteCode.value = ''
  pollingSeconds.value = 0
  if (pollingTimer) {
    clearInterval(pollingTimer)
    pollingTimer = null
  }
}

watch(() => props.visible, (val) => {
  if (!val) {
    handleClosed()
  }
})

onUnmounted(() => {
  if (pollingTimer) {
    clearInterval(pollingTimer)
  }
})
</script>

<style scoped>
.plan-section {
  display: flex;
  justify-content: center;
  margin-bottom: 20px;
}
.plan-card {
  width: 100%;
  border: 2px solid #e4e7ed;
  border-radius: 12px;
  padding: 20px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s;
  position: relative;
}
.plan-card.active {
  border-color: #409eff;
  background: #ecf5ff;
}
.plan-name {
  font-size: 20px;
  font-weight: 600;
  margin-bottom: 8px;
}
.plan-price {
  font-size: 28px;
  font-weight: 700;
  color: #409eff;
  margin-bottom: 4px;
}
.plan-period {
  font-size: 13px;
  color: #909399;
}
.plan-tag {
  position: absolute;
  top: -10px;
  right: -10px;
  background: #f56c6c;
  color: #fff;
  font-size: 12px;
  padding: 2px 10px;
  border-radius: 10px;
}
.channel-section {
  margin-bottom: 20px;
}
.section-label {
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 10px;
  color: #606266;
}
.channel-group {
  display: flex;
  gap: 12px;
}
.channel-radio {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}
.dialog-footer-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
.qrcode-section {
  text-align: center;
}
.qrcode-hint {
  font-size: 14px;
  color: #606266;
  margin-bottom: 16px;
}
.qrcode-wrapper {
  display: inline-block;
  padding: 12px;
  background: #fff;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  margin-bottom: 12px;
}
.qrcode-img {
  width: 200px;
  height: 200px;
  display: block;
}
.cashier-link {
  margin-bottom: 12px;
}
.order-info {
  font-size: 13px;
  color: #909399;
  display: flex;
  justify-content: center;
  gap: 20px;
  margin-bottom: 8px;
}
.order-amount {
  font-weight: 600;
  color: #303133;
}
.polling-status {
  font-size: 13px;
  color: #909399;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}
.success-section {
  text-align: center;
}
.invite-code-box {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: #f5f7fa;
  border: 1px dashed #dcdfe6;
  border-radius: 8px;
  padding: 12px 20px;
  margin: 12px 0;
  cursor: pointer;
  transition: background 0.2s;
}
.invite-code-box:hover {
  background: #ecf5ff;
}
.invite-code {
  font-size: 20px;
  font-weight: 700;
  letter-spacing: 2px;
  color: #409eff;
}
.code-hint {
  font-size: 12px;
  color: #909399;
}
</style>
