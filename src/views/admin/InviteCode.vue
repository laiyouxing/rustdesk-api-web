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
        <el-table-column :label="T('Action')" width="100" align="center" fixed="right">
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
    <el-dialog
      v-model="showCreate"
      :title="T('GenerateInviteCode')"
      width="420px"
    >
      <el-form label-position="top">
        <el-form-item :label="T('Plan')">
          <el-select v-model="createForm.plan" style="width:100%">
            <el-option label="pro" value="pro" />
          </el-select>
        </el-form-item>
        <el-form-item :label="T('SubscribeExpireDays')">
          <el-input-number v-model="createForm.expire_days" :min="1" :max="365" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCreate = false">{{ T('Cancel') }}</el-button>
        <el-button type="primary" :loading="creating" @click="handleCreate">
          {{ T('Generate') }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { T } from '@/utils/i18n'
import { ElMessage } from 'element-plus'
import { adminListCodes, adminCreateCode, adminRevokeCode, adminExportCodes } from '@/api/subscribe'

const loading = ref(false)
const list = ref([])
const total = ref(0)
const page = ref(1)
const filter = reactive({ status: '', plan: '' })

const showCreate = ref(false)
const creating = ref(false)
const revokingId = ref(0)
const createForm = reactive({ plan: 'pro', expire_days: 30 })

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
      plan: createForm.plan,
      expire_days: createForm.expire_days,
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

onMounted(getList)
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
