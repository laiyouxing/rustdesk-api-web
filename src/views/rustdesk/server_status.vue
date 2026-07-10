<template>
  <div>
    <el-card shadow="hover">
      <div class="toolbar">
        <span class="tip">{{ T('ServerStatusTip') }}</span>
        <el-switch v-model="autoRefresh" :active-text="T('AutoRefresh')" />
        <el-button type="primary" @click="load" :loading="loading">{{ T('Refresh') }}</el-button>
      </div>
    </el-card>

    <el-row :gutter="20" class="cards">
      <el-col :span="12">
        <el-card shadow="hover" class="status-card">
          <template #header>
            <div class="card-header">
              <b>{{ T('Hbbs') }}</b>
              <span>{{ T('HbbsDesc') }}</span>
            </div>
          </template>
          <div class="card-body" v-if="hbbs">
            <el-tag :type="tagType(hbbs.status)" effect="dark" style="margin-bottom:10px">
              {{ statusText(hbbs.status) }}
            </el-tag>
            <p>{{ T('ServerHost') }}: {{ hbbs.host || '-' }}</p>
            <p v-if="hbbs.status === 'up'">{{ T('Latency') }}: {{ hbbs.latency_ms }} ms</p>
            <p v-else>{{ T('ServerError') }}: {{ hbbs.error || '-' }}</p>
          </div>
          <div class="card-body" v-else>{{ T('Loading') }}</div>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card shadow="hover" class="status-card">
          <template #header>
            <div class="card-header">
              <b>{{ T('Hbbr') }}</b>
              <span>{{ T('HbbrDesc') }}</span>
            </div>
          </template>
          <div class="card-body" v-if="hbbr">
            <el-tag :type="tagType(hbbr.status)" effect="dark" style="margin-bottom:10px">
              {{ statusText(hbbr.status) }}
            </el-tag>
            <p>{{ T('ServerHost') }}: {{ hbbr.host || '-' }}</p>
            <p v-if="hbbr.status === 'up'">{{ T('Latency') }}: {{ hbbr.latency_ms }} ms</p>
            <p v-else>{{ T('ServerError') }}: {{ hbbr.error || '-' }}</p>
          </div>
          <div class="card-body" v-else>{{ T('Loading') }}</div>
        </el-card>
      </el-col>
    </el-row>

    <!-- HBBR 负载 / 连接数（仅 api-server 与 hbbr 同机时可用） -->
    <el-card shadow="hover" class="stats-card" v-if="hbbrStats">
      <template #header>
        <div class="card-header">
          <b>{{ T('HbbrLoad') }}</b>
          <span>{{ hbbrStats.host }}</span>
        </div>
      </template>

      <el-alert
        v-if="!hbbrStats.available"
        :title="T('HbbrStatsUnavailable')"
        type="warning"
        :description="hbbrStats.error || ''"
        :closable="false"
        show-icon
        style="margin-bottom:16px"
      />

      <template v-else>
        <el-row :gutter="20" class="metrics">
          <el-col :span="6">
            <div class="metric">
              <div class="metric-value">{{ hbbrStats.connection_count }}</div>
              <div class="metric-label">{{ T('ConnectionCount') }}</div>
            </div>
          </el-col>
          <el-col :span="6">
            <div class="metric">
              <div class="metric-value">{{ fmtKbps(hbbrStats.current_speed_kbps) }}</div>
              <div class="metric-label">{{ T('CurrentSpeed') }}</div>
            </div>
          </el-col>
          <el-col :span="6">
            <div class="metric">
              <div class="metric-value">{{ fmtKbps(hbbrStats.highest_speed_kbps) }}</div>
              <div class="metric-label">{{ T('HighestSpeed') }}</div>
            </div>
          </el-col>
          <el-col :span="6">
            <div class="metric">
              <div class="metric-value">{{ fmtMB(hbbrStats.total_traffic_mb) }}</div>
              <div class="metric-label">{{ T('TotalTraffic') }}</div>
            </div>
          </el-col>
        </el-row>

        <el-table :data="hbbrStats.connections || []" size="small" class="conn-table" max-height="320">
          <el-table-column prop="ip" :label="T('ClientAddr')" min-width="160" />
          <el-table-column :label="T('Duration')" width="110">
            <template #default="{ row }">{{ row.seconds }}s</template>
          </el-table-column>
          <el-table-column :label="T('Traffic')" width="120">
            <template #default="{ row }">{{ fmtMB(row.traffic_mb) }}</template>
          </el-table-column>
          <el-table-column :label="T('HighestSpeed')" width="130">
            <template #default="{ row }">{{ fmtKbps(row.highest_kbps) }}</template>
          </el-table-column>
          <el-table-column :label="T('AvgSpeed')" width="120">
            <template #default="{ row }">{{ fmtKbps(row.avg_kbps) }}</template>
          </el-table-column>
          <el-table-column :label="T('CurrentSpeed')" width="130">
            <template #default="{ row }">{{ fmtKbps(row.speed_kbps) }}</template>
          </el-table-column>
        </el-table>
      </template>
    </el-card>
  </div>
</template>

<script setup>
  import { ref, onMounted, onUnmounted } from 'vue'
  import { serverStatus } from '@/api/serverStatus'
  import { T } from '@/utils/i18n'
  import { ElMessage } from 'element-plus'

  const hbbs = ref(null)
  const hbbr = ref(null)
  const hbbrStats = ref(null)
  const loading = ref(false)
  const autoRefresh = ref(true)
  let timer = null

  const tagType = (status) => {
    if (status === 'up') return 'success'
    if (status === 'down') return 'danger'
    return 'info'
  }
  const statusText = (status) => {
    if (status === 'up') return T('ServerUp')
    if (status === 'down') return T('ServerDown')
    return T('ServerNotConfigured')
  }
  const fmtKbps = (v) => {
    const n = Number(v) || 0
    if (n >= 1024 * 1024) return (n / 1024 / 1024).toFixed(2) + ' Gb/s'
    if (n >= 1024) return (n / 1024).toFixed(2) + ' Mb/s'
    return n + ' kb/s'
  }
  const fmtMB = (v) => {
    const n = Number(v) || 0
    if (n >= 1024) return (n / 1024).toFixed(2) + ' GB'
    return n.toFixed(2) + ' MB'
  }

  const load = async () => {
    loading.value = true
    const res = await serverStatus().catch(e => {
      ElMessage.error(e?.message || T('OperationFailed'))
      return false
    })
    loading.value = false
    if (res) {
      hbbs.value = res.data.hbbs
      hbbr.value = res.data.hbbr
      hbbrStats.value = res.data.hbbr_stats
    }
  }

  onMounted(() => {
    load()
    timer = setInterval(() => {
      if (autoRefresh.value) load()
    }, 10000)
  })
  onUnmounted(() => {
    if (timer) clearInterval(timer)
  })
</script>

<style scoped lang="scss">
.toolbar {
  display: flex;
  align-items: center;
  gap: 16px;
  .tip {
    flex: 1;
    color: #888;
    font-size: 13px;
  }
}
.cards {
  margin-top: 20px;
}
.stats-card {
  margin-top: 20px;
}
.status-card {
  min-height: 180px;
}
.card-header {
  display: flex;
  align-items: baseline;
  gap: 10px;
  span {
    font-size: 12px;
    color: #999;
    font-weight: normal;
  }
}
.card-body {
  font-size: 14px;
  line-height: 1.9;
  p {
    margin: 4px 0;
  }
}
.metrics {
  margin-bottom: 16px;
}
.metric {
  background: #f7f8fa;
  border-radius: 8px;
  padding: 14px 10px;
  text-align: center;
  .metric-value {
    font-size: 22px;
    font-weight: 600;
    color: #303133;
  }
  .metric-label {
    margin-top: 6px;
    font-size: 12px;
    color: #909399;
  }
}
.conn-table {
  margin-top: 4px;
}
</style>
