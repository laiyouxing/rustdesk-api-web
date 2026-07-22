<template>
  <div class="subscription-page">
    <el-card shadow="hover" class="query-card">
      <el-form inline label-width="100px">
        <el-form-item :label="T('Status')">
          <el-select v-model="filter.status" :placeholder="T('All')" clearable style="width:140px">
            <el-option label="active" value="active" />
            <el-option label="expired" value="expired" />
            <el-option label="none" value="none" />
          </el-select>
        </el-form-item>
        <el-form-item :label="T('Keyword')">
          <el-input v-model="filter.keyword" placeholder="用户ID/用户名" clearable style="width:200px" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="getList">{{ T('Filter') }}</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card shadow="hover" class="list-card">
      <el-table :data="list" v-loading="loading" border stripe>
        <el-table-column prop="id" label="ID" width="60" align="center" />
        <el-table-column prop="username" label="用户名" width="150" />
        <el-table-column prop="subscription_plan" label="套餐" width="80" align="center">
          <template #default="{ row }">
            <el-tag size="small">{{ row.subscription_plan || '-' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="会员状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="statusType(row.status)" size="small">{{ row.status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="剩余天数" width="100" align="center">
          <template #default="{ row }">
            <span :style="{ color: row.days_left > 0 && row.days_left <= 7 ? '#f56c6c' : '#303133' }">
              {{ row.days_left > 0 ? row.days_left + '天' : '-' }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="到期时间" width="170" align="center">
          <template #default="{ row }">
            {{ formatTime(row.subscription_expire_at) }}
          </template>
        </el-table-column>
        <el-table-column :label="T('Action')" width="160" align="center" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" size="small" @click="showExtend(row)">
              延长
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-wrap">
        <el-pagination
          v-model:current-page="page"
          :page-size="pageSize"
          :total="total"
          layout="prev, pager, next, total"
          @current-change="getList"
        />
      </div>
    </el-card>

    <!-- 延长会员弹窗 -->
    <el-dialog v-model="extendVisible" title="延长会员" width="440px" :close-on-click-modal="false">
      <el-form label-position="top">
        <el-form-item label="用户">
          <el-input :model-value="extendUser?.username" disabled />
        </el-form-item>
        <el-form-item label="延长时长">
          <div class="plan-grid">
            <div
              v-for="p in planOptions"
              :key="p.key"
              class="plan-card"
              :class="{ active: extendSelectedKey === p.key }"
              @click="extendSelectedKey = p.key"
            >
              <div class="plan-name">{{ p.name }}</div>
              <div class="plan-price">¥{{ (p.price_cents / 100).toFixed(2) }}</div>
            </div>
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="extendVisible = false">取消</el-button>
        <el-button type="primary" :loading="extending" @click="handleExtend">确认延长</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { T } from '@/utils/i18n'
import { ElMessage } from 'element-plus'
import { adminListSubscriptions, adminExtendSubscription, getPlans } from '@/api/subscribe'

const list = ref([])
const loading = ref(false)
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)

const filter = reactive({
  status: '',
  keyword: '',
})

const extendVisible = ref(false)
const extendUser = ref(null)
const extendSelectedKey = ref('1m')
const planOptions = ref([])
const extending = ref(false)

const statusType = (s) => {
  if (s === 'active') return 'success'
  if (s === 'expired') return 'danger'
  if (s === 'none') return 'info'
  return ''
}

const formatTime = (t) => {
  if (!t) return '-'
  return new Date(t).toLocaleString()
}

const getList = async () => {
  loading.value = true
  try {
    const res = await adminListSubscriptions({
      page: page.value,
      size: pageSize.value,
      status: filter.status || undefined,
      keyword: filter.keyword || undefined,
    })
    if (res.code) {
      ElMessage.error(res.message)
      return
    }
    list.value = res.data.list || []
    total.value = res.data.total || 0
  } catch (e) {
    ElMessage.error('获取会员列表失败')
  } finally {
    loading.value = false
  }
}

const showExtend = (row) => {
  extendUser.value = row
  extendSelectedKey.value = '1m'
  extendVisible.value = true
}

const handleExtend = async () => {
  if (!extendUser.value || !extendSelectedKey.value) return
  const opt = planOptions.value.find(p => p.key === extendSelectedKey.value)
  if (!opt) return
  extending.value = true
  try {
    const res = await adminExtendSubscription({
      user_id: extendUser.value.id,
      plan: extendUser.value.subscription_plan || 'pro',
      plan_key: extendSelectedKey.value,
    })
    if (res.code) {
      ElMessage.error(res.message || '延长失败')
      return
    }
    ElMessage.success(`已为用户 ${extendUser.value.username} 延长 ${opt.name} 会员`)
    extendVisible.value = false
    await getList()
  } catch (e) {
    ElMessage.error('延长失败')
  } finally {
    extending.value = false
  }
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
.query-card {
  margin-bottom: 16px;
}
.pagination-wrap {
  margin-top: 16px;
  display: flex;
  justify-content: center;
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
</style>
