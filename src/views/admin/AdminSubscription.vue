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
        <el-table-column label="状态" width="100" align="center">
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

    <!-- 延长订阅弹窗 -->
    <el-dialog v-model="extendVisible" title="延长订阅" width="420px" :close-on-click-modal="false">
      <el-form label-position="top">
        <el-form-item label="用户">
          <el-input :model-value="extendUser?.username" disabled />
        </el-form-item>
        <el-form-item label="延长天数">
          <el-input-number v-model="extendDays" :min="1" :max="3650" />
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
const extendDays = ref(30)
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
    const params = { page: page.value, size: pageSize.value }
    if (filter.status) params.status = filter.status
    if (filter.keyword) params.keyword = filter.keyword
    const res = await fetch(`/api/admin/subscriptions/list?${new URLSearchParams(params)}`)
    const data = await res.json()
    if (data.code) {
      ElMessage.error(data.message)
      return
    }
    list.value = data.data.list || []
    total.value = data.data.total || 0
  } catch (e) {
    ElMessage.error('获取订阅列表失败')
  } finally {
    loading.value = false
  }
}

const showExtend = (row) => {
  extendUser.value = row
  extendDays.value = 30
  extendVisible.value = true
}

const handleExtend = async () => {
  if (!extendUser.value || extendDays.value <= 0) return
  extending.value = true
  try {
    const res = await fetch('/api/admin/subscriptions/extend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: extendUser.value.id,
        plan: extendUser.value.subscription_plan || 'pro',
        period_days: extendDays.value,
      }),
    })
    const data = await res.json()
    if (data.code) {
      ElMessage.error(data.message || '延长失败')
      return
    }
    ElMessage.success(`已为用户 ${extendUser.value.username} 延长 ${extendDays.value} 天`)
    extendVisible.value = false
    await getList()
  } catch (e) {
    ElMessage.error('延长失败')
  } finally {
    extending.value = false
  }
}

onMounted(getList)
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
</style>
