<template>
  <div class="invite-code-page">
    <el-card shadow="hover" class="query-card">
      <el-form inline label-width="80px">
        <el-form-item :label="T('Status')">
          <el-select v-model="filter.status" :placeholder="T('All')" clearable style="width:140px">
            <el-option label="unused" value="unused" />
            <el-option label="used" value="used" />
            <el-option label="revoked" value="revoked" />
          </el-select>
        </el-form-item>
        <el-form-item :label="T('Plan')">
          <el-select v-model="filter.plan" :placeholder="T('All')" clearable style="width:120px">
            <el-option label="pro" value="pro" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="getList">{{ T('Filter') }}</el-button>
          <el-button type="success" @click="showCreate = true">{{ T('Generate') }}</el-button>
          <el-button type="success" @click="showBatchCreate = true">{{ T('BatchCreate') }}</el-button>
          <el-button @click="handleExport">{{ T('Export') }}</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card shadow="hover" class="list-card">
      <el-table :data="list" v-loading="loading" border stripe>
        <el-table-column prop="id" label="ID" width="60" align="center" />
        <el-table-column prop="code" :label="T('InviteCode')" min-width="280" align="center">
          <template #default="{ row }">
            <code class="code-text">{{ row.code }}</code>
            <el-button link type="primary" size="small" @click="copyText(row.code)" style="margin-left:8px">
              <el-icon><el-icon-copy-document /></el-icon>
            </el-button>
          </template>
        </el-table-column>
        <el-table-column prop="plan" :label="T('Plan')" width="80" align="center">
          <template #default="{ row }">
            <el-tag size="small">{{ row.plan }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="status" :label="T('Status')" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="statusTag(row.status)" size="small">{{ row.status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="used_by" :label="T('UsedBy')" width="80" align="center">
          <template #default="{ row }">
            {{ row.used_by || '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="expire_at" :label="T('ExpireAt')" width="170" align="center">
          <template #default="{ row }">
            {{ formatTime(row.expire_at) }}
          </template>
        </el-table-column>
        <el-table-column prop="bound_order_id" label="订单号" min-width="180" align="center">
          <template #default="{ row }">
            <span v-if="row.bound_order_id" class="order-id">{{ row.bound_order_id }}</span>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" :label="T('CreatedAt')" width="170" align="center">
          <template #default="{ row }">
            {{ formatTime(row.created_at) }}
          </template>
        </el-table-column>
        <el-table-column prop="remark" label="备注" min-width="120" align="center">
          <template #default="{ row }">
            <span class="remark-text">{{ row.remark || '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column :label="T('Action')" width="150" align="center" fixed="right">
          <template #default="{ row }">
            <el-button
              v-if="row.status === 'unused'"
              type="danger"
              size="small"
              :loading="revokingId === row.id"
              @click="handleRevoke(row.id)"
            >
              {{ T('Revoke') }}
            </el-button>
            <el-button
              v-if="row.status === 'unused'"
              type="warning"
              size="small"
              @click="handleDelete(row)"
            >
              删除
            </el-button>
            <span v-else>-</span>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="page"
          :page-size="20"
          :total="total"
          layout="total, prev, pager, next"
          @current-change="getList"
        />
      </div>
    </el-card>

    <!-- 手动生成弹窗 -->
    <el-dialog v-model="showCreate" title="生成授权码" width="440px">
      <el-form label-position="top">
        <el-form-item label="时长（选后自动填充天数）">
          <div class="plan-grid">
            <div
              v-for="p in planOptions"
              :key="p.key"
              class="plan-card"
              :class="{ active: createForm.planKey === p.key }"
              @click="selectPlan(p)"
            >
              <div class="plan-name">{{ p.name }}</div>
              <div class="plan-price">¥{{ (p.price_cents / 100).toFixed(2) }}</div>
            </div>
          </div>
        </el-form-item>
        <el-form-item label="有效天数">
          <el-input-number v-model="createForm.expire_days" :min="1" :max="3650" style="width:100%" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="createForm.remark" type="textarea" :rows="2" placeholder="可选" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCreate = false">{{ T('Cancel') }}</el-button>
        <el-button type="primary" :loading="creating" @click="handleCreate">{{ T('Generate') }}</el-button>
      </template>
    </el-dialog>

    <!-- 批量生成弹窗 -->
    <el-dialog v-model="showBatchCreate" title="批量生成授权码" width="480px">
      <el-form label-position="top">
        <el-form-item label="生成数量">
          <el-input-number v-model="batchForm.count" :min="1" :max="200" style="width:100%" />
        </el-form-item>
        <el-form-item label="套餐">
          <el-select v-model="batchForm.plan" style="width:100%">
            <el-option label="pro" value="pro" />
          </el-select>
        </el-form-item>
        <el-form-item label="有效天数">
          <el-input-number v-model="batchForm.expire_days" :min="1" :max="3650" style="width:100%" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="batchForm.remark" type="textarea" :rows="2" placeholder="可选" />
        </el-form-item>
      </el-form>
      <div v-if="batchResult.length > 0" style="margin-top:12px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
          <strong>已生成（{{ batchResult.length }}）</strong>
          <el-button size="small" type="primary" @click="copyAllCodes">复制全部</el-button>
        </div>
        <div style="max-height:200px;overflow-y:auto;border:1px solid #ebeef5;border-radius:4px;padding:8px;">
          <el-tag v-for="item in batchResult" :key="item.code" style="margin:3px;font-family:monospace;font-size:12px;" type="info">
            {{ item.code }}
          </el-tag>
        </div>
      </div>
      <template #footer>
        <el-button @click="showBatchCreate = false">取消</el-button>
        <el-button type="primary" :loading="batchLoading" @click="submitBatchCreate">生成</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { T } from '@/utils/i18n'
import { ElMessage } from 'element-plus'
import { adminListCodes, adminCreateCode, adminRevokeCode, adminExportCodes, getPlans } from '@/api/subscribe'
import { ElMessageBox } from 'element-plus'

const loading = ref(false)
const list = ref([])
const total = ref(0)
const page = ref(1)
const filter = reactive({ status: '', plan: '' })

const showCreate = ref(false)
const creating = ref(false)
const revokingId = ref(0)
const createForm = reactive({ planKey: '', expire_days: 30, remark: '' })
const planOptions = ref([])

const showBatchCreate = ref(false)
const batchLoading = ref(false)
const batchForm = reactive({ count: 10, plan: 'pro', expire_days: 30, remark: '' })
const batchResult = ref([])

const statusTag = (s) => {
  const map = { unused: 'info', used: 'success', revoked: 'danger' }
  return map[s] || 'info'
}

const formatTime = (t) => {
  if (!t) return '-'
  return new Date(t).toLocaleString()
}

const copyText = async (text) => {
  try {
    await navigator.clipboard.writeText(text)
    ElMessage.success(T('CopySuccess'))
  } catch {
    ElMessage.warning(T('CopyFailed'))
  }
}

const getList = async () => {
  loading.value = true
  try {
    const res = await adminListCodes({
      status: filter.status || undefined,
      plan: filter.plan || undefined,
      page: page.value,
      size: 20,
    })
    if (!res.code) {
      list.value = res.data?.list || []
      total.value = res.data?.total || 0
    }
  } catch (_) {
    ElMessage.error(T('LoadFailed'))
  } finally {
    loading.value = false
  }
}

const handleCreate = async () => {
  creating.value = true
  try {
    const res = await adminCreateCode({
      plan: createForm.planKey || 'pro',
      expire_days: createForm.expire_days,
      remark: createForm.remark || undefined,
    })
    if (!res.code) {
      ElMessage.success(T('GenerateSuccess'))
      showCreate.value = false
      getList()
    } else {
      ElMessage.error(res.message || T('GenerateFailed'))
    }
  } catch (_) {
    ElMessage.error(T('GenerateFailed'))
  } finally {
    creating.value = false
  }
}

const handleRevoke = async (id) => {
  revokingId.value = id
  try {
    const res = await adminRevokeCode(id)
    if (!res.code) {
      ElMessage.success(T('RevokeSuccess'))
      getList()
    } else {
      ElMessage.error(res.message || T('RevokeFailed'))
    }
  } catch (_) {
    ElMessage.error(T('RevokeFailed'))
  } finally {
    revokingId.value = 0
  }
}

const handleExport = async () => {
  try {
    const blob = await adminExportCodes({
      status: filter.status || undefined,
      plan: filter.plan || undefined,
    })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `invite_codes_${new Date().getTime()}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
    ElMessage.success(T('ExportSuccess'))
  } catch (_) {
    ElMessage.error(T('ExportFailed'))
  }
}

const selectPlan = (p) => {
  createForm.planKey = p.key
  createForm.expire_days = p.period_days
}

const submitBatchCreate = async () => {
  batchLoading.value = true
  batchResult.value = []
  try {
    const codes = []
    for (let i = 0; i < batchForm.count; i++) {
      const res = await adminCreateCode({
        plan: batchForm.plan,
        expire_days: batchForm.expire_days,
        remark: batchForm.remark || undefined,
      })
      if (!res.code && res.data?.code) {
        codes.push(res.data)
      }
    }
    batchResult.value = codes
    ElMessage.success(`成功生成 ${codes.length} 个授权码`)
    getList()
  } catch (_) {
    ElMessage.error('批量生成失败')
  } finally {
    batchLoading.value = false
  }
}

const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm(`删除授权码 ${row.code}？`, '确认')
  } catch {
    return
  }
}

const copyAllCodes = () => {
  const text = batchResult.value.map(i => i.code).join('\n')
  navigator.clipboard.writeText(text).then(() => {
    ElMessage.success(T('CopySuccess'))
  }).catch(() => {
    ElMessage.warning(T('CopyFailed'))
  })
}

onMounted(async () => {
  await getList()
  try {
    const res = await getPlans()
    if (!res.code && Array.isArray(res.data)) {
      planOptions.value = res.data
    }
  } catch (_) {
    planOptions.value = [
      { key: '1m', name: '1个月', price_cents: 1000, period_days: 30 },
      { key: '3m', name: '3个月', price_cents: 2800, period_days: 90 },
      { key: '6m', name: '6个月', price_cents: 5000, period_days: 180 },
      { key: '12m', name: '12个月', price_cents: 8800, period_days: 365 },
    ]
  }
})
</script>

<style scoped>
.invite-code-page {
  padding: 16px;
}
.query-card {
  margin-bottom: 16px;
}
.list-card {
  min-height: 400px;
}
.code-text {
  font-family: monospace;
  font-size: 13px;
  background: #f5f7fa;
  padding: 2px 8px;
  border-radius: 4px;
  letter-spacing: 1px;
}
.plan-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
.plan-card {
  border: 2px solid #e4e7ed;
  border-radius: 10px;
  padding: 12px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
}
.plan-card.active {
  border-color: #409eff;
  background: #ecf5ff;
}
.plan-name {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 4px;
}
.plan-price {
  font-size: 18px;
  font-weight: 700;
  color: #409eff;
}
.order-id {
  font-size: 12px;
  color: #909399;
}
.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}
</style>
