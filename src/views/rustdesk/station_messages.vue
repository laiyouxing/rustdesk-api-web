<template>
  <div>
    <el-card shadow="hover">
      <template #header>
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span>{{ T('StationMessages') }} ({{ total }})</span>
          <el-button size="small" @click="markAllRead">{{ T('MarkAllRead') }}</el-button>
        </div>
      </template>
      <el-table :data="messages" v-loading="loading" border>
        <el-table-column prop="title" :label="T('Title')" min-width="160">
          <template #default="{row}">
            <span :style="row.is_read === 0 ? 'font-weight: bold' : ''">{{ row.title }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="content" :label="T('Content')" min-width="240">
          <template #default="{row}">
            <el-text truncated>{{ row.content }}</el-text>
          </template>
        </el-table-column>
        <el-table-column prop="peer_id" label="Peer ID" width="140"></el-table-column>
        <el-table-column prop="created_at" :label="T('Time')" width="170">
          <template #default="{row}">
            {{ formatTime(row.created_at) }}
          </template>
        </el-table-column>
        <el-table-column :label="T('Status')" width="80" align="center">
          <template #default="{row}">
            <el-tag v-if="row.is_read === 0" type="danger" size="small">{{ T('Unread') }}</el-tag>
            <el-tag v-else size="small">{{ T('Read') }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column :label="T('Actions')" width="80" align="center">
          <template #default="{row}">
            <el-button v-if="row.is_read === 0" size="small" @click="markRead(row)">{{ T('MarkRead') }}</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { T } from '@/utils/i18n'
import { ElMessage } from 'element-plus'
import { list as getMessages, markRead as markMsgRead, unreadCount } from '@/api/message'

const messages = ref([])
const total = ref(0)
const loading = ref(false)

const getList = async () => {
  loading.value = true
  const res = await getMessages().catch(_ => false)
  loading.value = false
  if (res) {
    messages.value = res.data.list
    total.value = res.data.total
  }
}

const markAllRead = async () => {
  const res = await markMsgRead({}).catch(_ => false)
  if (res) {
    ElMessage.success(T('OperationSuccess'))
    getList()
  }
}

const markRead = async (row) => {
  const res = await markMsgRead({ id: row.row_id }).catch(_ => false)
  if (res) {
    row.is_read = 1
  }
}

const formatTime = (ts) => {
  if (!ts) return '-'
  const d = new Date(ts * 1000)
  const pad = (n) => n.toString().padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

onMounted(getList)
</script>
