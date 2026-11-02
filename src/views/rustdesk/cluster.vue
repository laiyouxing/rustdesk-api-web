<template>
  <div>
    <!-- 调度权重 -->
    <el-card class="simple-card" shadow="hover">
      <template #header>
        <div class="card-header">
          <span>{{ T('NodeScoreWeights') }}</span>
          <div>
            <el-button size="small" :loading="refreshing" @click="refresh">{{ T('NodeRefreshNow') }}</el-button>
            <el-button size="small" :loading="loading" @click="load">{{ T('NodeRefreshList') }}</el-button>
          </div>
        </div>
      </template>

      <el-alert type="info" :closable="false" show-icon style="margin-bottom: 14px" :title="T('NodeWeightsTip')"/>

      <el-form :inline="true" label-width="90px">
        <el-form-item :label="T('NodeSessions')">
          <el-input-number v-model="weights.sessions" :min="0" :max="1" :step="0.05" :precision="2" size="small"/>
        </el-form-item>
        <el-form-item :label="T('NodeBandwidth')">
          <el-input-number v-model="weights.bandwidth" :min="0" :max="1" :step="0.05" :precision="2" size="small"/>
        </el-form-item>
        <el-form-item :label="T('NodeCPU')">
          <el-input-number v-model="weights.cpu" :min="0" :max="1" :step="0.05" :precision="2" size="small"/>
        </el-form-item>
        <el-form-item :label="T('NodeMem')">
          <el-input-number v-model="weights.mem" :min="0" :max="1" :step="0.05" :precision="2" size="small"/>
        </el-form-item>
        <el-form-item :label="T('NodeRTT')">
          <el-input-number v-model="weights.rtt" :min="0" :max="1" :step="0.05" :precision="2" size="small"/>
        </el-form-item>
        <el-form-item :label="T('NodeManualWeight')">
          <el-input-number v-model="weights.weight" :min="0" :max="1" :step="0.05" :precision="2" size="small"/>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" size="small" :loading="saving" @click="saveWeights">{{ T('NodeSaveWeights') }}</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 节点列表 -->
    <el-card class="simple-card" shadow="hover" style="margin-top: 16px;" v-loading="loading">
      <template #header>
        <div class="card-header">
          <span>{{ T('NodeListTitle') }}（{{ nodes.length }}）</span>
          <span class="hint">{{ T('NodeOfflineHint', { sec: offlineSec }) }}</span>
        </div>
      </template>

      <el-table :data="nodes" border size="small">
        <el-table-column prop="kind" :label="T('NodeKind')" width="80" align="center">
          <template #default="{ row }">
            <el-tag size="small" :type="row.kind === 'hbbr' ? 'success' : 'primary'">{{ row.kind }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="addr" :label="T('NodeAddr')" min-width="180">
          <template #default="{ row }">
            <div>{{ row.addr }}</div>
            <div v-if="row.lan_addr" class="hint">
              {{ T('NodeLan') }}: {{ row.lan_addr }}
              <span v-if="row.lan_addrs_list && row.lan_addrs_list.length > 1">(+{{ row.lan_addrs_list.length - 1 }})</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column :label="T('Region')" width="110" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.region" size="small">{{ regionName(row.region) }} ({{ row.region }})</el-tag>
            <span v-else class="hint">{{ T('NodeNotSet') }}</span>
          </template>
        </el-table-column>
        <el-table-column :label="T('NodeStatus')" width="90" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.disabled === 1" size="small" type="info">{{ T('NodeDisabled') }}</el-tag>
            <el-tag v-else-if="row.status === 1" size="small" type="success">{{ T('NodeOnline') }}</el-tag>
            <el-tag v-else size="small" type="danger">{{ T('NodeOffline') }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="sessions" :label="T('NodeSessionsShort')" width="80" align="right"/>
        <el-table-column prop="peers" :label="T('NodePeers')" width="80" align="right"/>
        <el-table-column :label="T('NodeRTT')" width="90" align="right">
          <template #default="{ row }">{{ fmtRtt(row.rtt_ms) }}</template>
        </el-table-column>
        <el-table-column :label="T('NodeScore')" width="90" align="right">
          <template #default="{ row }">{{ (row.score === undefined || row.score === null) ? '—' : Number(row.score).toFixed(3) }}</template>
        </el-table-column>
        <el-table-column prop="weight" :label="T('NodeManualWeight')" width="90" align="right"/>
        <el-table-column prop="version" :label="T('NodeVersion')" width="90"/>
        <el-table-column :label="T('NodeLastSeen')" width="110">
          <template #default="{ row }">{{ fmtAgo(row.last_seen) }}</template>
        </el-table-column>
        <el-table-column :label="T('Actions')" width="210" align="center">
          <template #default="{ row }">
            <el-button link size="small" @click="showDetail(row)">{{ T('NodeDetail') }}</el-button>
            <el-button link size="small" @click="edit(row)">{{ T('Edit') }}</el-button>
            <el-button link size="small" type="danger" @click="remove(row)">{{ T('Delete') }}</el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-empty v-if="!nodes.length" :description="T('NodeEmptyTip')"/>
    </el-card>

    <!-- 静态中继兜底 -->
    <el-card class="simple-card" shadow="hover" style="margin-top: 16px;">
      <template #header>
        <div class="card-header">
          <span>{{ T('NodeStaticRelays') }}</span>
          <el-button size="small" type="primary" :loading="staticSaving" @click="saveStaticRelays">
            {{ T('NodeSaveStaticRelays') }}
          </el-button>
        </div>
      </template>
      <el-alert type="info" :closable="false" show-icon style="margin-bottom: 12px" :title="T('NodeStaticRelaysTip')"/>
      <el-input v-model="staticRelaysText" type="textarea" :rows="3" :placeholder="T('NodeStaticRelaysPlaceholder')"/>
    </el-card>

    <!-- 节点接入密钥（X-Node-Secret） -->
    <el-card class="simple-card" shadow="hover" style="margin-top: 16px;">
      <template #header>
        <div class="card-header">
          <span>{{ T('NodeSecret') }}</span>
          <div>
            <el-button size="small" :loading="secretSaving" @click="generateSecret">{{ T('NodeGenerateSecret') }}</el-button>
            <el-button size="small" type="primary" :loading="secretSaving" @click="saveSecret">{{ T('NodeSaveSecret') }}</el-button>
          </div>
        </div>
      </template>
      <el-alert type="warning" :closable="false" show-icon style="margin-bottom: 12px" :title="T('NodeSecretTip')"/>
      <el-input v-model="nodeSecretValue" :placeholder="T('NodeSecretPlaceholder')"/>
      <div class="hint" style="margin-top:6px;">{{ T('NodeSecretHint', { days: graceDays }) }}</div>
      <div class="hint" style="margin-top:4px;">{{ T('NodeSecretSystemdTip') }}</div>
      <div v-if="secretRotatedAt > 0" class="hint" style="margin-top:4px;">
        {{ T('NodeSecretRotatedAt', { time: fmtTime(secretRotatedAt) }) }}
      </div>
      <div v-if="secretHasPrev" class="hint" style="margin-top:4px; color:#e6a23c;">
        {{ T('NodeSecretPrevGrace', { time: fmtTime(prevExpiresAt) }) }}
      </div>
    </el-card>

    <!-- 节点详情：CPU / 内存 / 带宽等负载指标只在这里展示，不占主表格列 -->
    <el-dialog v-model="detailDialog" :title="T('NodeDetailTitle')" width="640px">
      <template #header>
        <div class="card-header">
          <span>{{ T('NodeDetailTitle') }} — {{ detailRow.addr }}</span>
          <el-button size="small" :loading="detailRefreshing" @click="refreshDetail">{{ T('Refresh') }}</el-button>
        </div>
      </template>
      <div v-if="detailRow.id">
        <div class="section-title">{{ T('NodeDetailLoad') }}</div>
        <el-descriptions :column="1" border size="small">
          <el-descriptions-item :label="T('NodeCpuUsage')">
            <el-progress
              :percentage="clampPct(detailRow.cpu_pct)"
              :status="clampPct(detailRow.cpu_pct) >= 80 ? 'exception' : ''"
              :stroke-width="12"
              style="max-width:420px;"
            />
          </el-descriptions-item>
          <el-descriptions-item :label="T('NodeMemUsage')">
            <el-progress
              :percentage="clampPct(detailRow.mem_pct)"
              :status="clampPct(detailRow.mem_pct) >= 80 ? 'exception' : ''"
              :stroke-width="12"
              style="max-width:420px;"
            />
          </el-descriptions-item>
          <el-descriptions-item :label="T('NodeBwIn')">
            <span>{{ fmtMbit(detailRow.bw_in) }}</span>
            <span v-if="!detailRow.bw_in" class="hint" style="margin-left:8px;">{{ T('NodeBwNoData') }}</span>
          </el-descriptions-item>
          <el-descriptions-item :label="T('NodeBwOut')">
            <span>{{ fmtMbit(detailRow.bw_out) }}</span>
            <span v-if="!detailRow.bw_out" class="hint" style="margin-left:8px;">{{ T('NodeBwNoData') }}</span>
          </el-descriptions-item>
        </el-descriptions>

        <div class="section-title" style="margin-top:16px;">{{ T('NodeDetailInfo') }}</div>
        <el-descriptions :column="2" border size="small">
          <el-descriptions-item :label="T('NodeKind')">{{ detailRow.kind }}</el-descriptions-item>
          <el-descriptions-item :label="T('NodeStatus')">
            <el-tag v-if="detailRow.disabled === 1" size="small" type="info">{{ T('NodeDisabled') }}</el-tag>
            <el-tag v-else-if="detailRow.status === 1" size="small" type="success">{{ T('NodeOnline') }}</el-tag>
            <el-tag v-else size="small" type="danger">{{ T('NodeOffline') }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item :label="T('NodeAddr')">{{ detailRow.addr }}</el-descriptions-item>
          <el-descriptions-item :label="T('NodeLanAddr')">
            <!-- 多网卡时节点会上报多个候选地址，全部列出；rtt 由 api-server 逐个探测后选最优 -->
            <template v-if="detailRow.lan_addrs_list && detailRow.lan_addrs_list.length">
              <el-tag
                v-for="(a, i) in detailRow.lan_addrs_list"
                :key="a"
                size="small"
                :type="i === 0 ? 'success' : 'info'"
                style="margin: 2px 4px 2px 0"
              >{{ a }}</el-tag>
            </template>
            <span v-else>—</span>
          </el-descriptions-item>
          <el-descriptions-item :label="T('Region')">{{ regionLabel(detailRow.region) }}</el-descriptions-item>
          <el-descriptions-item :label="T('NodePeers')">{{ detailRow.peers ?? 0 }}</el-descriptions-item>
          <el-descriptions-item :label="T('NodeSessionsShort')">{{ detailRow.sessions ?? 0 }}</el-descriptions-item>
          <el-descriptions-item :label="T('Uptime')">{{ fmtUptime(detailRow.uptime_sec) }}</el-descriptions-item>
          <el-descriptions-item :label="T('NodeVersion')">{{ detailRow.version || '—' }}</el-descriptions-item>
          <el-descriptions-item :label="T('NodeRTT')">{{ fmtRtt(detailRow.rtt_ms) }}</el-descriptions-item>
          <el-descriptions-item :label="T('NodeScore')">{{ fmtScore(detailRow.score) }}</el-descriptions-item>
          <el-descriptions-item :label="T('NodeConfigVersion')">{{ detailRow.config_version ?? 0 }}</el-descriptions-item>
          <el-descriptions-item :label="T('NodeLastSeen')" :span="2">
            {{ fmtAgo(detailRow.last_seen) }}<span class="hint"> · {{ fmtTime(detailRow.last_seen) }}</span>
          </el-descriptions-item>
        </el-descriptions>
      </div>
    </el-dialog>

    <!-- 编辑节点 -->
    <el-dialog v-model="dialog" :title="T('NodeEditTitle')" width="520px">
      <el-form :model="form" label-width="100px">
        <el-form-item :label="T('NodeAddr')">
          <el-input v-model="form.addr" placeholder="1.2.3.4:21117"/>
        </el-form-item>
        <el-form-item :label="T('NodeName')">
          <el-input v-model="form.name"/>
        </el-form-item>
        <el-form-item :label="T('Region')">
          <el-select v-model="form.region" filterable clearable :placeholder="T('NodeRegionPlaceholder')" style="width:100%">
            <el-option v-for="r in regionList" :key="r.code" :label="r.name + ' (' + r.code + ')'" :value="r.code"/>
          </el-select>
          <div class="hint">{{ T('NodeRegionTip') }}</div>
        </el-form-item>
        <el-form-item :label="T('NodeLanAddr')">
          <!-- 每行一个候选内网地址，第一行为主地址；留空 = 交还给节点自动探测 -->
          <el-input
            v-model="form.lan_addrs_text"
            type="textarea"
            :rows="3"
            :placeholder="T('NodeLanPlaceholder')"
          />
        </el-form-item>
        <el-form-item :label="T('NodeManualWeight')">
          <el-input-number v-model="form.weight" :min="0" :max="10000"/>
        </el-form-item>
        <el-form-item :label="T('NodeConfig')">
          <el-input
            v-model="form.configText"
            type="textarea"
            :rows="9"
            :placeholder="configPlaceholder"
            style="font-family: monospace;"
          />
          <div class="hint" style="line-height:1.6; white-space: pre-line;">{{ T('NodeConfigTip') }}</div>
        </el-form-item>
        <el-form-item :label="T('NodeDisabledLabel')">
          <el-switch v-model="form.disabledBool"/>
          <span class="hint" style="margin-left:8px;">{{ T('NodeDisabledTip') }}</span>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialog = false">{{ T('Cancel') }}</el-button>
        <el-button type="primary" :loading="saving" @click="save">{{ T('Save') }}</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
  import { computed, onActivated, onMounted, reactive, ref } from 'vue'
  import { ElMessage, ElMessageBox } from 'element-plus'
  import { T } from '@/utils/i18n'
  import {
    nodeDelete, nodeGetConfig, nodeList, nodeRefresh, nodeRegions, nodeSaveConfig,
    nodeSaveScoreConfig, nodeScoreConfig, nodeUpdate,
    nodeStaticRelays, nodeSaveStaticRelays, nodeSecret, nodeSaveSecret,
  } from '@/api/node'

  const loading = ref(false)
  const saving = ref(false)
  const refreshing = ref(false)
  const nodes = ref([])
  const offlineSec = ref(60)
  const weights = reactive({ sessions: 0.35, bandwidth: 0.2, cpu: 0.15, mem: 0.1, rtt: 0.2, weight: 0 })

  const regionList = ref([])
  const regionName = (code) => {
    const r = regionList.value.find(x => x.code === code)
    return r ? r.name : code
  }
  const loadRegions = async () => {
    const res = await nodeRegions().catch(_ => false)
    if (res) regionList.value = res.data.regions || []
  }

  // 静态中继（每行一个或逗号分隔）
  const staticRelaysText = ref('')
  const staticSaving = ref(false)
  const loadStaticRelays = async () => {
    const res = await nodeStaticRelays().catch(_ => false)
    if (res) staticRelaysText.value = (res.data.list || []).join('\n')
  }
  const saveStaticRelays = async () => {
    const list = staticRelaysText.value.split(/[\n,]+/).map(s => s.trim()).filter(Boolean)
    staticSaving.value = true
    const res = await nodeSaveStaticRelays(list).catch(_ => false)
    staticSaving.value = false
    if (!res) return
    ElMessage.success(T('NodeStaticRelaysSaved'))
    loadStaticRelays()
  }

  // 节点专用密钥（X-Node-Secret）
  const nodeSecretValue = ref('')
  const secretSaving = ref(false)
  const secretRotatedAt = ref(0)
  const secretHasPrev = ref(false)
  const prevExpiresAt = ref(0)
  const graceSeconds = ref(7 * 24 * 3600)
  const graceDays = computed(() => Math.max(1, Math.round(graceSeconds.value / 86400)))
  const fmtTime = (ts) => {
    if (!ts) return '—'
    const d = new Date(ts * 1000)
    return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString()
  }
  const loadSecret = async () => {
    const res = await nodeSecret().catch(_ => false)
    if (!res) return
    nodeSecretValue.value = res.data.secret || ''
    secretRotatedAt.value = res.data.rotated_at || 0
    secretHasPrev.value = !!res.data.has_prev
    prevExpiresAt.value = res.data.prev_expires_at || 0
    if (res.data.grace_seconds) graceSeconds.value = res.data.grace_seconds
  }
  const generateSecret = () => {
    // 本地生成 24 字节随机数的 hex，点「保存密钥」后才真正下发
    const buf = new Uint8Array(24)
    window.crypto.getRandomValues(buf)
    nodeSecretValue.value = Array.from(buf).map(b => b.toString(16).padStart(2, '0')).join('')
  }
  const saveSecret = async () => {
    const v = (nodeSecretValue.value || '').trim()
    if (v && v.length < 16) {
      ElMessage.warning(T('NodeSecretPlaceholder'))
      return
    }
    const prevRotatedAt = secretRotatedAt.value
    secretSaving.value = true
    // 传空串 = 由服务端生成随机密钥；非空 = 轮换为新值（旧密钥进入宽限期）
    const res = await nodeSaveSecret(v).catch(_ => false)
    secretSaving.value = false
    if (!res) return
    const rotatedAt = res.data.rotated_at || 0
    nodeSecretValue.value = res.data.secret || v
    secretRotatedAt.value = rotatedAt || prevRotatedAt
    // rotated_at 没变 = 服务端判定密钥未变化（未真正轮换），不要误报"旧密钥保留 N 天"
    if (rotatedAt && rotatedAt !== prevRotatedAt) {
      ElMessage.success(T('NodeSecretRotated', { days: graceDays.value }))
    } else {
      ElMessage.success(T('NodeSaved'))
    }
    // 重新拉一次，刷新"上一把密钥宽限期"提示
    loadSecret()
  }

  const dialog = ref(false)
  const form = reactive({ id: 0, addr: '', name: '', region: '', lan_addrs_text: '', weight: 100, disabledBool: false, configText: '' })
  // 配置示例（放脚本里避免 HTML 属性里出现转义引号导致模板解析失败）
  const configPlaceholder = '{"relay_servers":["1.2.3.4:21117"],"limit_speed_mbps":32}'

  // RTT 语义：-1（或缺失）= 未知/探测失败，>=0 = 真实毫秒；0 也是合法值
  const fmtRtt = (v) => {
    if (v === undefined || v === null || v < 0) return '—'
    return v + ' ms'
  }

  const fmtAgo = (ts) => {
    if (!ts) return '—'
    const d = Math.max(0, Math.floor(Date.now() / 1000) - ts)
    // 注意：T() 的占位符替换用 `params[key] || match`，传数字 0 会被当成空值，
    // 因此统一传字符串，"刚刚（0 秒前）"才不会显示成 {n}
    if (d < 60) return T('NodeSecondsAgo', { n: String(d) })
    if (d < 3600) return T('NodeMinutesAgo', { n: String(Math.floor(d / 60)) })
    return T('NodeHoursAgo', { n: String(Math.floor(d / 3600)) })
  }

  // ===== 节点详情弹窗（CPU / 内存 / 带宽只在详情里展示，不占主表格列） =====
  const detailDialog = ref(false)
  const detailRow = ref({})
  const detailRefreshing = ref(false)
  const showDetail = (row) => {
    // 复制一份：弹窗里的"刷新"只更新弹窗数据，不影响表格中正在编辑的行
    detailRow.value = { ...row }
    detailDialog.value = true
  }
  const refreshDetail = async () => {
    const id = detailRow.value.id
    detailRefreshing.value = true
    const res = await nodeList().catch(_ => false)
    detailRefreshing.value = false
    if (!res) return
    const list = res.data.nodes || []
    nodes.value = list
    offlineSec.value = res.data.offlineSec || 60
    const fresh = list.find(n => n.id === id)
    if (fresh) detailRow.value = { ...fresh }
    ElMessage.success(T('NodeDetailRefreshed'))
  }
  // el-progress 只接受 0~100 的整数
  const clampPct = (v) => {
    const n = Number(v)
    if (!Number.isFinite(n)) return 0
    return Math.min(100, Math.max(0, Math.round(n)))
  }
  // bit/s → Mbit/s，保留 2 位小数（0 显示 0.00 Mbit/s）
  const fmtMbit = (v) => {
    const n = Number(v)
    const mbit = Number.isFinite(n) ? n / 1e6 : 0
    return mbit.toFixed(2) + ' Mbit/s'
  }
  // 秒 → X 天 X 小时 X 分；参数用字符串，避免 T() 把数字 0 当成未传值
  const fmtUptime = (v) => {
    const t = Math.max(0, Math.floor(Number(v) || 0))
    const d = Math.floor(t / 86400)
    const h = Math.floor((t % 86400) / 3600)
    const m = Math.floor((t % 3600) / 60)
    return T('NodeUptimeDHM', { d: String(d), h: String(h), m: String(m) })
  }
  const fmtScore = (v) => (v === undefined || v === null ? '—' : Number(v).toFixed(3))
  const regionLabel = (code) => (code ? regionName(code) + ' (' + code + ')' : T('NodeNotSet'))

  // host:port 校验（IPv4 / 主机名 / [IPv6]）
  const isHostPort = (v) => {
    if (typeof v !== 'string') return false
    const s = v.trim()
    const m = s.match(/^(\[[0-9a-fA-F:]+\]|[^:\s]+):(\d{1,5})$/)
    if (!m) return false
    const port = Number(m[2])
    return port > 0 && port <= 65535
  }

  const load = async () => {
    loading.value = true
    const res = await nodeList().catch(_ => false)
    loading.value = false
    if (!res) return
    nodes.value = res.data.nodes || []
    offlineSec.value = res.data.offlineSec || 60
    if (res.data.weights) Object.assign(weights, res.data.weights)
  }

  const loadWeights = async () => {
    const res = await nodeScoreConfig().catch(_ => false)
    if (res && res.data.weights) Object.assign(weights, res.data.weights)
  }

  const saveWeights = async () => {
    saving.value = true
    const res = await nodeSaveScoreConfig({ ...weights }).catch(_ => false)
    saving.value = false
    if (!res) return
    ElMessage.success(T('NodeWeightsSaved'))
    load()
  }

  const refresh = async () => {
    refreshing.value = true
    const res = await nodeRefresh().catch(_ => false)
    refreshing.value = false
    if (!res) return
    ElMessage.success(T('NodeRefreshed'))
    load()
  }

  const loadNodeConfig = async (id) => {
    const res = await nodeGetConfig(id).catch(_ => false)
    // 请求可能晚于弹窗切换/关闭返回，必须确认还在编辑同一个节点再写入，
    // 否则会把 A 节点的配置填到 B 节点上（保存后就会错配下发）。
    if (!res || form.id !== id) return
    const cfg = res.data.config || ''
    if (!cfg) {
      form.configText = ''
      return
    }
    try {
      form.configText = JSON.stringify(JSON.parse(cfg), null, 2)
    } catch (_) {
      form.configText = cfg
    }
  }

  // 把多行文本拆成候选地址数组（去空行/去前后空白/去重，保持顺序）
  const splitLanAddrsText = (text) => {
    const seen = new Set()
    const out = []
    ;(text || '').split(/\r?\n/).forEach((line) => {
      const a = line.trim()
      if (!a || seen.has(a)) return
      seen.add(a)
      out.push(a)
    })
    return out
  }
  const edit = (row) => {
    Object.assign(form, {
      id: row.id,
      addr: row.addr,
      name: row.name || '',
      region: row.region || '',
      // 多网卡：优先用候选列表回填（每行一个），老数据只有单值时退回 lan_addr
      lan_addrs_text: (row.lan_addrs_list && row.lan_addrs_list.length
        ? row.lan_addrs_list.join('\n')
        : (row.lan_addr || '')),
      // 0 是合法权重，不能用 || 100（会把 0 变成 100）
      weight: row.weight ?? 100,
      disabledBool: row.disabled === 1,
      configText: '',
    })
    dialog.value = true
    loadNodeConfig(row.id)
  }

  const save = async () => {
    if (!isHostPort(form.addr)) {
      ElMessage.warning(T('NodeAddrInvalid'))
      return
    }
    saving.value = true
    const res = await nodeUpdate({
      id: form.id,
      addr: form.addr.trim(),
      name: form.name,
      region: form.region,
      lan_addrs: splitLanAddrsText(form.lan_addrs_text),
      weight: form.weight ?? 100,
      disabled: form.disabledBool ? 1 : 0,
    }).catch(_ => false)
    saving.value = false
    if (!res) return
    if (form.configText.trim()) {
      const cfgRes = await nodeSaveConfig({ id: form.id, config: form.configText }).catch(_ => false)
      // 下发失败时不能再提示"成功"；错误提示由请求拦截器统一弹出
      if (!cfgRes) return
      ElMessage.success(T('NodeSavedWithConfig'))
    } else {
      ElMessage.success(T('NodeSaved'))
    }
    dialog.value = false
    load()
  }

  const remove = async (row) => {
    const cf = await ElMessageBox.confirm(T('NodeDeleteConfirm', { addr: row.addr }), T('Confirm'), { type: 'warning' }).catch(_ => false)
    if (!cf) return
    const res = await nodeDelete(row.id).catch(_ => false)
    if (!res) return
    ElMessage.success(T('NodeDeleted'))
    load()
  }

  const loadAll = () => {
    load()
    loadWeights()
    loadRegions()
    loadStaticRelays()
    loadSecret()
  }

  onMounted(loadAll)
  onActivated(loadAll)
</script>

<style scoped lang="scss">
  .hint {
    font-size: 12px;
    color: #909399;
  }
  .section-title {
    font-size: 13px;
    font-weight: 600;
    margin-bottom: 8px;
    color: var(--el-text-color-primary, #303133);
  }
</style>
