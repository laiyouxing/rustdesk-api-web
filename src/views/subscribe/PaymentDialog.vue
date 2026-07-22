<template>
  <el-dialog
    :model-value="visible"
    :title="T('SubscribeUpgrade')"
    width="520px"
    :close-on-click-modal="false"
    @update:model-value="$emit('update:visible', $event)"
    @closed="handleClosed"
  >
    <!-- 步骤1：选择时长和支付渠道 -->
    <template v-if="step === 'select'">
      <div class="plan-section">
        <div class="section-label">{{ T('SubscribeSelectDuration') }}</div>
        <div class="plan-grid">
          <div
            v-for="p in plans"
            :key="p.key"
            class="plan-card"
            :class="{ active: selectedPlanKey === p.key }"
            @click="selectedPlanKey = p.key"
          >
            <div class="plan-name">{{ p.name }}</div>
            <div class="plan-price">¥{{ (p.price_cents / 100).toFixed(2) }}</div>
          </div>
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

    <!-- 步骤2：展示收款码 -->
    <template v-if="step === 'qrcode'">
      <div class="qrcode-section">
        <div class="qrcode-hint">{{ T('SubscribeScanQR') }}</div>
        <div class="qrcode-wrapper" v-loading="!qrPayload">
          <img v-if="qrPayload" :src="qrImageSrc" alt="QR Code" class="qrcode-img" />
        </div>
        <div class="plan-selected-info">
          {{ selectedPlanName }} · ¥{{ (selectedPrice / 100).toFixed(2) }}
        </div>
        <div class="order-info">
          <span>{{ T('OrderNo') }}: {{ orderInfo.out_trade_no }}</span>
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
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { T } from '@/utils/i18n'
import { ElMessage } from 'element-plus'
import { createOrder, queryOrder, getPlans } from '@/api/subscribe'

const props = defineProps({
  visible: Boolean,
})
const emit = defineEmits(['update:visible', 'activated'])

const step = ref('select') // select | qrcode | success
const plans = ref([])
const selectedPlanKey = ref('1m')
const channel = ref('alipay')
const creating = ref(false)
const orderInfo = ref({})
const qrPayload = ref('')
const inviteCode = ref('')
const pollingSeconds = ref(0)
let pollingTimer = null

const selectedPlanName = computed(() => {
  const p = plans.value.find(x => x.key === selectedPlanKey.value)
  return p ? p.name : ''
})
const selectedPrice = computed(() => {
  const p = plans.value.find(x => x.key === selectedPlanKey.value)
  return p ? p.price_cents : 0
})

const qrImageSrc = computed(() => {
  if (!qrPayload.value) return ''
  return qrPayload.value
})

// 加载可选时长
onMounted(async () => {
  try {
    const res = await getPlans()
    if (!res.code && Array.isArray(res.data) && res.data.length > 0) {
      plans.value = res.data
      selectedPlanKey.value = res.data[0].key
    }
  } catch (_) {
    // 后端可能还没有计划列表接口，用默认值
    plans.value = [
      { key: '1m', name: '1个月', price_cents: 1000, period_days: 30 },
      { key: '3m', name: '3个月', price_cents: 2800, period_days: 90 },
      { key: '6m', name: '6个月', price_cents: 5000, period_days: 180 },
      { key: '12m', name: '12个月', price_cents: 8800, period_days: 365 },
    ]
  }
})

const handleCreateOrder = async () => {
  if (!channel.value) {
    ElMessage.warning(T('SubscribeSelectChannelFirst'))
    return
  }
  if (!selectedPlanKey.value) {
    ElMessage.warning(T('SubscribeSelectDuration'))
    return
  }
  creating.value = true
  try {
    const res = await createOrder(channel.value, selectedPlanKey.value)
    if (res.code) {
      ElMessage.error(res.message || T('SubscribeCreateFailed'))
      return
    }
    orderInfo.value = res.data
    qrPayload.value = res.data.qr_payload || ''
    step.value = 'qrcode'
    startPolling(res.data.out_trade_no)
  } catch (e) {
    ElMessage.error(T('SubscribeCreateFailed'))
  } finally {
    creating.value = false
  }
}

const startPolling = (outTradeNo) => {
  pollingSeconds.value = 0
  pollingTimer = setInterval(async () => {
    pollingSeconds.value += 3
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
  margin-bottom: 20px;
}
.section-label {
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 12px;
  color: #606266;
}
.plan-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
.plan-card {
  border: 2px solid #e4e7ed;
  border-radius: 10px;
  padding: 16px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
}
.plan-card.active {
  border-color: #409eff;
  background: #ecf5ff;
}
.plan-name {
  font-size: 15px;
  font-weight: 600;
  margin-bottom: 6px;
}
.plan-price {
  font-size: 22px;
  font-weight: 700;
  color: #409eff;
}
.channel-section {
  margin-bottom: 20px;
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
.plan-selected-info {
  font-size: 15px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 8px;
}
.order-info {
  font-size: 13px;
  color: #909399;
  margin-bottom: 8px;
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
