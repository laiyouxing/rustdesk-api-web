<template>
  <div>
    <!-- Dashboard Stats -->
    <el-row :gutter="20" style="margin-bottom: 20px;">
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

    <el-row :gutter="20">
      <el-col :span="12">
        <el-card shadow="hover" style="margin-bottom: 20px;">
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
        <el-card shadow="hover" style="margin-bottom: 20px;">
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

    <!-- User Info -->
    <el-card :title="T('Userinfo')" shadow="hover">
      <el-form class="info-form" ref="form" label-width="120px" label-suffix="：">
        <el-form-item :label="T('Username')">
          <div>{{ userStore.username }}</div>
        </el-form-item>
        <el-form-item :label="T('Email')">
          <div>{{ userStore.email }}</div>
        </el-form-item>
        <el-form-item :label="T('Password')" prop="password">
          <el-button type="danger" @click="showChangePwd">{{ T('ChangePassword') }}</el-button>
        </el-form-item>
        <el-form-item label="OIDC">
          <el-table :data="oidcData" border fit>
            <el-table-column :label="T('IdP')" prop="op" align="center"></el-table-column>
            <el-table-column :label="T('Status')" prop="status" align="center">
              <template #default="{ row }">
                <el-tag v-if="row.status === 1" type="success">{{ T('HasBind') }}</el-tag>
                <el-tag v-else type="danger">{{ T('NoBind') }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column :label="T('Actions')" align="center" width="200">
              <template #default="{ row }">
                <el-button v-if="row.status === 1" type="danger" size="small" @click="toUnBind(row)">{{ T('UnBind') }}</el-button>
                <el-button v-else type="success" size="small" @click="toBind(row)">{{ T('ToBind') }}</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-form-item>
      </el-form>
    </el-card>
    <el-card shadow="hover" style="margin-top: 20px">
      <div v-html="html"></div>
    </el-card>
    <changePwdDialog v-model:visible="changePwdVisible"></changePwdDialog>
  </div>
</template>

<script setup>
import changePwdDialog from '@/components/changePwdDialog.vue'
import { computed, onMounted, ref } from 'vue'
import { useUserStore } from '@/store/user'
import { useAppStore } from '@/store/app'
import { bind, unbind } from '@/api/oauth'
import { myOauth } from '@/api/user'
import { ElMessageBox } from 'element-plus'
import { T } from '@/utils/i18n'
import { marked } from 'marked'
import request from '@/utils/request'

const appStore = useAppStore()
const userStore = useUserStore()
const changePwdVisible = ref(false)

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
  const res = await request({ url: '/peer/list', params: { page: 1, page_size: 10, time_ago: -86400 } }).catch(_ => false)
  loading.value = false
  if (res) recentPeers.value = res.data.list
}

const fetchRecentLogs = async () => {
  loadingLogs.value = true
  const res = await request({ url: '/login_log/list', params: { page: 1, page_size: 10 } }).catch(_ => false)
  loadingLogs.value = false
  if (res) recentLogs.value = res.data.list
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
  getMyOauth()
})

const showChangePwd = () => {
  changePwdVisible.value = true
}
const oidcData = ref([])
const getMyOauth = async () => {
  const res = await myOauth().catch(_ => false)
  if (res) {
    oidcData.value = res.data
  }
}

const toBind = async (row) => {
  const res = await bind({ op: row.op }).catch(_ => false)
  if (res) {
    const { code, url } = res.data
    window.open(url)
  }
}
const toUnBind = async (row) => {
  const cf = await ElMessageBox.confirm(T('Confirm?', { param: T('UnBind') }), {
    confirmButtonText: T('Confirm'),
    cancelButtonText: T('Cancel'),
    type: 'warning',
  }).catch(_ => false)
  if (!cf) {
    return false
  }
  const res = await unbind({ op: row.op }).catch(_ => false)
  if (res) {
    getMyOauth()
  }
}

const html = computed(_ => marked(appStore.setting.hello||''))
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
.info-form {
  width: 600px;
  margin: 0 auto;
}
</style>
