<template>
  <div class="index">
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
            <el-table-column prop="from_name" :label="T('Username')" width="90"></el-table-column>
            <el-table-column prop="peer_hostname" label="主机名" width="100">
              <template #default="{row}">{{ row.peer_hostname || row.peer_id?.substring(0,12) || '-' }}</template>
            </el-table-column>
            <el-table-column prop="peer_alias" :label="T('Alias')" min-width="80">
              <template #default="{row}">{{ row.peer_alias || '-' }}</template>
            </el-table-column>
            <el-table-column label="连接时间" width="150">
              <template #default="{row}">{{ row.created_at }}</template>
            </el-table-column>
            <el-table-column label="结束时间" width="150">
              <template #default="{row}">
                <span v-if="row.close_time_str">{{ row.close_time_str }}</span>
                <el-tag v-else type="success" size="small">进行中</el-tag>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script>
import { defineComponent, ref, onMounted } from 'vue'
import { T } from '@/utils/i18n'
import request from '@/utils/request'

export default defineComponent({
  name: 'Home',
  setup () {
    const stats = ref({ total_peers: 0, online_peers: 0, offline_peers: 0, total_users: 0, today_connections: 0 })
    const recentPeers = ref([])
    const loading = ref(false)
    const recentLogs = ref([])
    const loadingLogs = ref(false)
    const now = ref(Math.floor(Date.now() / 1000))

    const fetchStats = async () => {
      const res = await request({ url: '/dashboard/stats' }).catch(_ => false)
      if (res) stats.value = res.data
    }

    const fetchRecentPeers = async () => {
      loading.value = true
      const res = await request({ url: '/peer/list', params: { page: 1, page_size: 50, time_ago: 300 } }).catch(_ => false)
      loading.value = false
      if (res) {
        const monthAgo = now.value - 2592000
        recentPeers.value = (res.data.list || [])
          .filter(p => p.last_online_time > monthAgo)
          .slice(0, 10)
      }
    }

const fetchRecentLogs = async () => {
  loadingLogs.value = true
  const res = await request({ url: '/audit_conn/list', params: { page: 1, page_size: 10 } }).catch(_ => false)
  loadingLogs.value = false
  if (res) {
    recentLogs.value = res.data.list.map(r => ({
      from_name: r.from_name || r.from_peer || '-',
      peer_id: r.peer_id,
      peer_hostname: r.peer_hostname,
      peer_alias: r.peer_alias,
      type: r.type,
      created_at: r.created_at,
      close_time: r.close_time,
    }))
  }
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
      setInterval(fetchStats, 30000)
      setInterval(fetchRecentPeers, 30000)
    })

    return { stats, recentPeers, loading, recentLogs, loadingLogs, now, T, formatTime }
  },
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
