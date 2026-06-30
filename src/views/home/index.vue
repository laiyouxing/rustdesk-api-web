<template>
  <div>
    <el-row :gutter="20">
      <el-col :span="6">
        <el-card shadow="hover">
          <div class="stat-item">
            <div class="num">{{ stats.total_peers }}</div>
            <div class="label">{{ T('TotalDevices') }}</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover">
          <div class="stat-item">
            <div class="num green">{{ stats.online_peers }}</div>
            <div class="label">{{ T('Online') }}</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover">
          <div class="stat-item">
            <div class="num gray">{{ stats.offline_peers }}</div>
            <div class="label">{{ T('Offline') }}</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover">
          <div class="stat-item">
            <div class="num blue">{{ stats.today_connections }}</div>
            <div class="label">{{ T('TodayConnections') }}</div>
          </div>
        </el-card>
      </el-col>
    </el-row>
    <el-row :gutter="20" style="margin-top: 20px;">
      <el-col :span="12">
        <el-card shadow="hover">
          <template #header>
            <span>{{ T('RecentDevices') }}</span>
          </template>
          <el-table :data="recentPeers" v-loading="loading" size="small" max-height="300">
            <el-table-column prop="id" label="ID" width="120"></el-table-column>
            <el-table-column prop="hostname" :label="T('Hostname')" min-width="120">
              <template #default="{row}">
                <el-tag :type="row.last_online_time > now-300 ? 'success' : 'danger'" size="small" effect="plain">
                  {{ row.hostname || '-' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="last_online_time" :label="T('LastOnline')" width="160">
              <template #default="{row}">
                <span v-if="row.last_online_time">{{ formatTime(row.last_online_time) }}</span>
                <span v-else>-</span>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card shadow="hover">
          <template #header>
            <span>{{ T('RecentConnections') }}</span>
          </template>
          <el-table :data="recentLogs" v-loading="loadingLogs" size="small" max-height="300">
            <el-table-column prop="username" :label="T('Username')" width="100"></el-table-column>
            <el-table-column prop="peer_id" label="Peer ID" width="120"></el-table-column>
            <el-table-column prop="created_at" :label="T('Time')" width="160">
              <template #default="{row}">{{ row.created_at }}</template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
    </el-row>
    <el-row :gutter="20" style="margin-top: 20px;">
      <el-col :span="24">
        <el-card shadow="hover">
          <template #header>
            <span>{{ T('StationMessages') }}</span>
            <el-tag v-if="unreadMsgCount > 0" type="danger" size="small" style="margin-left:8px">
              {{ unreadMsgCount }} {{ T('Unread') }}
            </el-tag>
            <el-button text size="small" style="float:right" @click="markAllRead" :disabled="unreadMsgCount===0">
              {{ T('MarkAllRead') }}
            </el-button>
          </template>
          <el-table :data="recentMessages" v-loading="loadingMsg" size="small" max-height="250">
            <el-table-column prop="sender_name" :label="T('Sender')" width="120">
              <template #default="{row}">
                <el-tag v-if="row.type==='broadcast'" type="danger" size="small">全体</el-tag>
                <span v-else>{{ row.sender_name }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="title" :label="T('MessageTitle')" min-width="120">
              <template #default="{row}">
                <span :style="row.is_read ? '' : 'font-weight:bold'">{{ row.title || row.content }}</span>
              </template>
            </el-table-column>
            <el-table-column :label="T('Time')" width="160">
              <template #default="{row}">
                {{ formatTime(row.created_at) }}
              </template>
            </el-table-column>
            <el-table-column label="操作" width="80">
              <template #default="{row}">
                <el-button v-if="!row.is_read" text size="small" @click="markRead(row.row_id)">
                  {{ T('MarkRead') }}
                </el-button>
              </template>
            </el-table-column>
          </el-table>
          <div v-if="totalMessages > 5" style="text-align:center;margin-top:8px">
            <router-link to="/stationMessages">{{ T('ViewAll') }} ({{ totalMessages }})</router-link>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { T } from '@/utils/i18n'
import request from '@/utils/request'
import { useUserStore } from '@/store/user'

const stats = ref({ total_peers: 0, online_peers: 0, offline_peers: 0, total_users: 0, today_connections: 0 })
const recentPeers = ref([])
const loading = ref(false)
const recentLogs = ref([])
const loadingLogs = ref(false)
const now = ref(Math.floor(Date.now() / 1000))
const recentMessages = ref([])
const loadingMsg = ref(false)
const unreadMsgCount = ref(0)
const totalMessages = ref(0)

const fetchStats = async () => {
  const res = await request({ url: '/dashboard/stats' }).catch(_ => false)
  if (res) stats.value = res.data
}

const fetchRecentPeers = async () => {
  loading.value = true
  const isAdmin = useUserStore().route_names?.includes('*')
  const url = isAdmin ? '/peer/list' : '/my/peer/list'
  const res = await request({ url, params: { page: 1, page_size: 10, time_ago: -86400 } }).catch(_ => false)
  loading.value = false
  if (res) recentPeers.value = res.data.list
}

const fetchRecentLogs = async () => {
  loadingLogs.value = true
  const isAdmin = useUserStore().route_names?.includes('*')
  const url = isAdmin ? '/login_log/list' : '/my/login_log/list'
  const res = await request({ url, params: { page: 1, page_size: 10 } }).catch(_ => false)
  loadingLogs.value = false
  if (res) recentLogs.value = res.data.list
}

const fetchMessages = async () => {
  loadingMsg.value = true
  const [msgRes, countRes] = await Promise.all([
    request({ url: '/station_message/list', params: { page: 1, page_size: 5, is_read: 0 } }).catch(_ => false),
    request({ url: '/station_message/unread_count' }).catch(_ => false),
  ])
  loadingMsg.value = false
  if (msgRes) {
    recentMessages.value = msgRes.data.list || []
    totalMessages.value = msgRes.data.total || 0
  }
  if (countRes) {
    unreadMsgCount.value = countRes.data.count || 0
  }
}

const markRead = async (id) => {
  await request({ url: '/station_message/mark_read', method: 'post', data: { id } }).catch(_ => false)
  fetchMessages()
}

const markAllRead = async () => {
  await request({ url: '/station_message/mark_read', method: 'post', data: { all: true } }).catch(_ => false)
  fetchMessages()
}

const formatTime = (ts) => {
  if (!ts) return '-'
  const d = new Date(ts * 1000)
  const pad = (n) => n.toString().padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

onMounted(() => {
  now.value = Math.floor(Date.now() / 1000)
  fetchStats()
  fetchRecentPeers()
  fetchRecentLogs()
  fetchMessages()
  setInterval(fetchStats, 30000)
  setInterval(fetchRecentPeers, 30000)
  setInterval(fetchMessages, 30000)
})
</script>

<style scoped lang="scss">
.stat-item {
  text-align: center;
  padding: 10px 0;
  .num {
    font-size: 36px;
    font-weight: bold;
    margin-bottom: 8px;
    &.green { color: #67C23A; }
    &.gray { color: #909399; }
    &.blue { color: #409EFF; }
  }
  .label { font-size: 14px; color: #909399; }
}
</style>
