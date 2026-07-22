<template>
  <div class="order-page">
    <el-card shadow="hover" class="query-card">
      <el-form inline label-width="80px">
        <el-form-item :label="T('Status')">
          <el-select v-model="filter.status" :placeholder="T('All')" clearable style="width:130px">
            <el-option :label="T('OrderStatusPending')" value="pending" />
            <el-option :label="T('OrderStatusPaid')" value="paid" />
            <el-option :label="T('OrderStatusClosed')" value="closed" />
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
        <el-table-column prop="id" :label="T('ID')" width="60" align="center" />
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
            <el-tag :type="statusType(row.status)" size="small">{{ statusLabel(row.status) }}</el-tag>
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
import { adminListOrders, adminConfirmOrder, adminCloseOrder } from '@/api/subscribe'

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
const statusLabel = (s) => {
  if (s === 'paid') return T('OrderStatusPaid')
  if (s === 'pending') return T('OrderStatusPending')
  if (s === 'closed') return T('OrderStatusClosed')
  return s
}

const formatTime = (t) => {
  if (!t) return '-'
  return new Date(t).toLocaleString()
}

const getList = async () => {
  loading.value = true
  try {
    const res = await adminListOrders({
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
  const res = await adminConfirmOrder(row.id)
  if (res.code) {
    ElMessage.error(res.message || '确认失败')
    return
  }
  ElMessage.success('确认成功')
  await getList()
}

const handleClose = async (row) => {
  try {
    await ElMessageBox.confirm(`关闭订单 ${row.out_trade_no}？`, '确认')
  } catch {
    return
  }
  const res = await adminCloseOrder(row.id)
  if (res.code) {
    ElMessage.error(res.message || '关闭失败')
    return
  }
  ElMessage.success('已关闭')
  await getList()
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
