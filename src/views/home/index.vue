<template>
  <div style="position: relative;">
    <!-- Refresh interval indicator -->
    <div style="position: absolute; top: -10px; right: 0; font-size: 12px; color: #909399; z-index: 10;">
      {{ T('AutoRefresh') }}: 30s
    </div>
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
        <el-card shadow="hover" style="cursor:pointer" @click="goPeer('online')">
          <div class="stat-item">
            <div class="num green">{{ stats.online_peers }}</div>
            <div class="label">{{ T('Online') }}</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" style="cursor:pointer" @click="goPeer('offline')">
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
            <el-table-column prop="hostname" :label="T('Hostname')" min-width="100">
              <template #default="{row}">
                <el-tag :type="row.last_online_time > now-300 ? 'success' : 'danger'" size="small" effect="plain">
                  {{ row.hostname || '-' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="alias" :label="T('Alias')" min-width="100">
              <template #default="{row}">
                {{ row.alias || '-' }}
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
        <el-card shadow="hover" style="cursor:pointer" @click="goAuditConn">
          <template #header>
            <span>{{ T('RecentConnections') }}</span>
          </template>
          <el-table :data="recentConns" v-loading="loadingConns" size="small" max-height="300">
            <el-table-column prop="peer_id" :label="T('Peer')" width="120"></el-table-column>
            <el-table-column prop="from_peer" :label="T('FromPeer')" width="120"></el-table-column>
            <el-table-column prop="from_name" :label="T('FromName')" min-width="100">
              <template #default="{row}">
                {{ row.from_name || '-' }}
              </template>
            </el-table-column>
            <el-table-column prop="ip" label="IP" width="120"></el-table-column>
            <el-table-column :label="T('Type')" width="80">
              <template #default="{row}">
                <el-tag v-if="row.type === 1" type="warning" size="small">{{ T('File') }}</el-tag>
                <el-tag v-else size="small">{{ T('Common') }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column :label="T('Time')" width="150">
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
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { T } from '@/utils/i18n'
import request from '@/utils/request'
import { useUserStore } from '@/store/user'

const router = useRouter()
const userStore = useUserStore()
const isAdmin = computed(() => userStore.route_names?.includes('*'))

const stats = ref({ total_peers: 0, online_peers: 0, offline_peers: 0, total_users: 0, today_connections: 0 })
const recentPeers = ref([])
const loading = ref(false)
const recentConns = ref([])
const loadingConns = ref(false)
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

const fetchRecentConns = async () => {
  loadingConns.value = true
  const isAdmin = useUserStore().route_names?.includes('*')
  const url = isAdmin ? '/audit_conn/list' : null
  if (!url) {
    // 普通用户没有连接日志接口，跳过
    loadingConns.value = false
    recentConns.value = []
    return
  }
  const res = await request({ url, params: { page: 1, page_size: 10 } }).catch(_ => false)
  loadingConns.value = false
  if (res) recentConns.value = res.data.list
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

function goPeer(status) {
  const routeName = isAdmin.value ? 'Peer' : 'MyPeer'
  const timeAgo = status === 'online' ? -300 : 300
  router.push({ name: routeName, query: { time_ago: timeAgo } })
}

function goAuditConn() {
  router.push({ name: 'AuditConn' })
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
  fetchRecentConns()
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
