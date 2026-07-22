<template>
  <div class="order-page">
    <el-card shadow="hover" class="query-card">
      <el-form inline label-width="80px">
        <el-form-item :label="T('Status')">
          <el-select v-model="filter.status" :placeholder="T('All')" clearable style="width:130px">
            <el-option label="pending" value="pending" />
            <el-option label="paid" value="paid" />
            <el-option label="closed" value="closed" />
          </el-select>
        </el-form-item>
        <el-form-item :label="T('Keyword')">
          <el-input v-model="filter.keyword" placeholder="订单号/用户名" clearable style="width:200px" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="getList">{{ T('Filter') }}</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card shadow="hover" class="list-card">
      <el-table :data="list" v-loading="loading" border stripe>
        <el-table-column prop="id" label="ID" width="60" align="center" />
        <el-table-column prop="out_trade_no" label="订单号" min-width="220" />
        <el-table-column prop="username" label="用户" width="120" align="center" />
        <el-table-column label="时长" width="80" align="center">
          <template #default="{ row }">
            {{ row.plan_key }}
          </template>
        </el-table-column>
        <el-table-column label="金额" width="100" align="center">
          <template #default="{ row }">
            ¥{{ (row.amount_cents / 100).toFixed(2) }}
          </template>
        </el-table-column>
        <el-table-column prop="channel" label="支付方式" width="100" align="center">
          <template #default="{ row }">
            {{ row.channel === 'alipay' ? '支付宝' : '微信' }}
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="statusType(row.status)" size="small">{{ row.status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="下单时间" width="170" align="center">
          <template #default="{ row }">
            {{ formatTime(row.created_at) }}
          </template>
        </el-table-column>
        <el-table-column :label="T('Action')" width="180" align="center" fixed="right">
          <template #default="{ row }">
            <el-button v-if="row.status === 'pending'" type="success" size="small" @click="handleConfirm(row)">
              确认到账
            </el-button>
            <el-button v-if="row.status === 'pending'" type="warning" size="small" @click="handleClose(row)">
              关闭
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
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { T } from '@/utils/i18n'
import { ElMessage, ElMessageBox } from 'element-plus'

const list = ref([])
const loading = ref(false)
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)

const filter = reactive({
  status: '',
  keyword: '',
})

const statusType = (s) => {
  if (s === 'paid') return 'success'
  if (s === 'pending') return 'warning'
  if (s === 'closed') return 'info'
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
    const res = await fetch(`/api/admin/orders/list?${new URLSearchParams(params)}`)
    const data = await res.json()
    if (data.code) {
      ElMessage.error(data.message)
      return
    }
    list.value = data.data.list || []
    total.value = data.data.total || 0
  } catch (e) {
    ElMessage.error('获取订单列表失败')
  } finally {
    loading.value = false
  }
}

const handleConfirm = async (row) => {
  try {
    await ElMessageBox.confirm(`确认订单 ${row.out_trade_no} 已到账？`, '确认')
  } catch {
    return
  }
  try {
    const res = await fetch(`/api/admin/orders/${row.id}/confirm`, { method: 'POST' })
    const data = await res.json()
    if (data.code) {
      ElMessage.error(data.message || '确认失败')
      return
    }
    ElMessage.success('确认成功')
    await getList()
  } catch (e) {
    ElMessage.error('确认失败')
  }
}

const handleClose = async (row) => {
  try {
    await ElMessageBox.confirm(`关闭订单 ${row.out_trade_no}？`, '确认')
  } catch {
    return
  }
  try {
    const res = await fetch(`/api/admin/orders/${row.id}/close`, { method: 'POST' })
    const data = await res.json()
    if (data.code) {
      ElMessage.error(data.message || '关闭失败')
      return
    }
    ElMessage.success('已关闭')
    await getList()
  } catch (e) {
    ElMessage.error('关闭失败')
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
