<template>
  <div>
    <!-- ============ 保留策略 ============ -->
    <el-card class="simple-card" shadow="hover" v-loading="loading">
      <template #header>
        <div class="card-header">
          <span>保留策略</span>
          <el-button size="small" @click="load">刷新</el-button>
        </div>
      </template>

      <el-alert type="info" :closable="false" show-icon style="margin-bottom: 16px"
                title="保存后立即生效，无需重启服务。优先级：此处设置 > config.yaml > 内置默认值。填 0 表示不自动清理。"/>

      <el-table :data="rows" border size="small" style="max-width: 1000px;">
        <el-table-column prop="name" label="数据类别" width="190">
          <template #default="{ row }">
            <div>{{ row.name }}</div>
            <div class="hint">{{ row.desc }}</div>
          </template>
        </el-table-column>
        <el-table-column label="保留天数" width="200">
          <template #default="{ row }">
            <el-input-number v-model="form[row.key]" :min="row.min" :max="3650" size="small"/>
            <span class="hint" style="margin-left:6px;">天</span>
          </template>
        </el-table-column>
        <el-table-column label="当前来源" width="110" align="center">
          <template #default="{ row }">
            <el-tag size="small" :type="sourceTagType(info[row.sourceKey])">
              {{ sourceText(info[row.sourceKey]) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="说明" min-width="300">
          <template #default="{ row }">
            <span class="hint">{{ row.tip }}</span>
          </template>
        </el-table-column>
      </el-table>

      <el-form label-width="140px" style="margin-top: 16px; max-width: 1000px;">
        <el-form-item label="立即清理一次">
          <el-checkbox v-model="form.run_now">保存后立刻按新策略清理</el-checkbox>
          <div class="hint block">
            勾选会真实删除超过保留天数的记录，不可恢复。
            不勾选则等下一次巡检（每 12 小时）自动生效。
          </div>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="saving" @click="save">保存</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- ============ 存储占用 ============ -->
    <el-card class="simple-card" shadow="hover" style="margin-top: 16px;" v-loading="statsLoading">
      <template #header>
        <div class="card-header">
          <span>存储占用</span>
          <el-button size="small" :loading="statsLoading" @click="loadStats">刷新统计</el-button>
        </div>
      </template>

      <el-descriptions :column="1" border style="max-width: 1000px; margin-bottom: 16px;">
        <el-descriptions-item label="数据库文件">
          <span style="word-break: break-all;">{{ stats.db_file || '—' }}</span>
          <el-tag v-if="stats.db_size_bytes" size="small" style="margin-left: 8px;">
            {{ fmtBytes(stats.db_size_bytes) }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="日志目录">
          <span style="word-break: break-all;">{{ stats.log_dir || info.log_file || '未配置文件日志' }}</span>
          <el-tag v-if="stats.log_size_bytes" size="small" style="margin-left: 8px;">
            {{ fmtBytes(stats.log_size_bytes) }}（{{ stats.log_file_count }} 个文件）
          </el-tag>
        </el-descriptions-item>
      </el-descriptions>

      <el-table :data="stats.tables || []" border size="small" style="max-width: 1000px;">
        <el-table-column prop="name" label="数据类别" width="200"/>
        <el-table-column label="记录数" width="150" align="right">
          <template #default="{ row }">
            <span :class="{ 'warn-count': row.count >= 100000 }">{{ row.count }}</span>
          </template>
        </el-table-column>
        <el-table-column label="说明" min-width="340">
          <template #default="{ row }">
            <span class="hint">{{ tableHint(row.key) }}</span>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup>
  import { onActivated, onMounted, reactive, ref } from 'vue'
  import { ElMessage } from 'element-plus'
  import { retentionInfo, retentionStats, retentionUpdate } from '@/api/retention'

  const loading = ref(false)
  const saving = ref(false)
  const statsLoading = ref(false)

  const info = reactive({
    log_max_days: 30,
    audit_retention_days: 90,
    station_message_days: 0,
    login_log_days: 0,
    op_log_days: 0,
    log_source: '',
    audit_source: '',
    station_message_source: '',
    login_log_source: '',
    op_log_source: '',
    log_file: '',
    log_days_in_effect: 0,
  })

  const form = reactive({
    log_max_days: 30,
    audit_retention_days: 90,
    station_message_days: 0,
    login_log_days: 0,
    op_log_days: 0,
    run_now: false,
  })

  const stats = reactive({
    tables: [],
    db_file: '',
    db_size_bytes: 0,
    log_dir: '',
    log_size_bytes: 0,
    log_file_count: 0,
  })

  // key 与后端字段一致；sourceKey 对应 info 里的来源字段
  const rows = [
    {
      key: 'log_max_days', name: '日志文件', min: 1,
      sourceKey: 'log_source',
      desc: '按天轮转',
      tip: '每天一个文件，超过保留天数即删除。磁盘增长最快的一项。',
    },
    {
      key: 'audit_retention_days', name: '审计记录', min: 1,
      sourceKey: 'audit_source',
      desc: '连接 / 文件传输 / 直连上报',
      tip: '合规留痕，建议不少于 90 天。',
    },
    {
      key: 'station_message_days', name: '站内消息', min: 0,
      sourceKey: 'station_message_source',
      desc: '离线通知 / 告警 / 公告',
      tip: '消息中心的记录。0 = 永久保留。',
    },
    {
      key: 'login_log_days', name: '登录日志', min: 0,
      sourceKey: 'login_log_source',
      desc: '客户端与后台登录记录',
      tip: '用于排查"谁在何时登录过"。0 = 永久保留。',
    },
    {
      key: 'op_log_days', name: '操作日志', min: 0,
      sourceKey: 'op_log_source',
      desc: '账户操作 + 地址簿操作',
      tip: '管理员改账户、改地址簿等操作留痕。0 = 永久保留。',
    },
  ]

  const sourceText = (s) => {
    if (s === 'database') return '后台设置'
    if (s === 'config') return 'config.yaml'
    return '默认值'
  }
  const sourceTagType = (s) => {
    if (s === 'database') return 'success'
    if (s === 'config') return 'warning'
    return 'info'
  }

  const fmtBytes = (n) => {
    const v = Number(n) || 0
    if (v >= 1024 * 1024 * 1024) return (v / 1024 / 1024 / 1024).toFixed(2) + ' GB'
    if (v >= 1024 * 1024) return (v / 1024 / 1024).toFixed(2) + ' MB'
    if (v >= 1024) return (v / 1024).toFixed(1) + ' KB'
    return v + ' B'
  }

  const tableHint = (key) => {
    const map = {
      audit_conn: '每次远程连接的开始/结束记录，通常量最大',
      audit_file: '文件传输记录',
      punch_direct_ok: 'P2P 直连合规上报',
      station_message: '消息中心',
      login_log: '登录历史',
      account_op_log: '管理员对账户的操作',
      address_book_op_log: '地址簿变更',
      peer: '设备列表（不参与保留策略）',
      user_token: '登录凭证，过期后由登录流程清理',
    }
    return map[key] || ''
  }

  const load = async () => {
    loading.value = true
    const res = await retentionInfo().catch(_ => false)
    loading.value = false
    if (res) {
      Object.assign(info, res.data)
      form.log_max_days = res.data.log_days_in_effect || res.data.log_max_days
      form.audit_retention_days = res.data.audit_retention_days
      form.station_message_days = res.data.station_message_days || 0
      form.login_log_days = res.data.login_log_days || 0
      form.op_log_days = res.data.op_log_days || 0
      form.run_now = false
    }
  }

  const loadStats = async () => {
    statsLoading.value = true
    const res = await retentionStats().catch(_ => false)
    statsLoading.value = false
    if (res) {
      Object.assign(stats, res.data)
    }
  }

  const save = async () => {
    saving.value = true
    const res = await retentionUpdate({
      log_max_days: form.log_max_days,
      audit_retention_days: form.audit_retention_days,
      station_message_days: form.station_message_days,
      login_log_days: form.login_log_days,
      op_log_days: form.op_log_days,
      run_now: form.run_now,
    }).catch(e => {
      ElMessage.error((e && e.message) || '保存失败')
      return false
    })
    saving.value = false
    if (res) {
      ElMessage.success(form.run_now ? '已保存，并已开始按新策略清理' : '已保存，日志立即生效')
      load()
      loadStats()
    }
  }

  onMounted(() => {
    load()
    loadStats()
  })
  onActivated(() => {
    load()
    loadStats()
  })
</script>

<style scoped lang="scss">
  .hint {
    font-size: 12px;
    color: #909399;
    line-height: 1.5;
  }
  .hint.block {
    display: block;
    margin-top: 4px;
  }
  .warn-count {
    color: #e6a23c;
    font-weight: 600;
  }
</style>
