<template>
  <div>
    <!-- 调度权重 -->
    <el-card class="simple-card" shadow="hover">
      <template #header>
        <div class="card-header">
          <span>调度权重</span>
          <div>
            <el-button size="small" :loading="refreshing" @click="refresh">立即刷新</el-button>
            <el-button size="small" :loading="loading" @click="load">刷新列表</el-button>
          </div>
        </div>
      </template>

      <el-alert type="info" :closable="false" show-icon style="margin-bottom: 14px"
                title="所有因子统一为「成本」：归一化后加权求和，**总分越低越优先**被下发给 hbbs。其中人工权重语义是「越想用这台就调得越大」，内部会折算成更低的成本，方向与其他因子一致。"/>

      <el-form :inline="true" label-width="90px">
        <el-form-item label="会话数">
          <el-input-number v-model="weights.sessions" :min="0" :max="1" :step="0.05" :precision="2" size="small"/>
        </el-form-item>
        <el-form-item label="带宽">
          <el-input-number v-model="weights.bandwidth" :min="0" :max="1" :step="0.05" :precision="2" size="small"/>
        </el-form-item>
        <el-form-item label="CPU">
          <el-input-number v-model="weights.cpu" :min="0" :max="1" :step="0.05" :precision="2" size="small"/>
        </el-form-item>
        <el-form-item label="内存">
          <el-input-number v-model="weights.mem" :min="0" :max="1" :step="0.05" :precision="2" size="small"/>
        </el-form-item>
        <el-form-item label="延迟">
          <el-input-number v-model="weights.rtt" :min="0" :max="1" :step="0.05" :precision="2" size="small"/>
        </el-form-item>
        <el-form-item label="人工权重">
          <el-input-number v-model="weights.weight" :min="0" :max="1" :step="0.05" :precision="2" size="small"/>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" size="small" :loading="saving" @click="saveWeights">保存权重</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 节点列表 -->
    <el-card class="simple-card" shadow="hover" style="margin-top: 16px;" v-loading="loading">
      <template #header>
        <div class="card-header">
          <span>集群节点（{{ nodes.length }}）</span>
          <span class="hint">离线判定：{{ offlineSec }} 秒无心跳</span>
        </div>
      </template>

      <el-table :data="nodes" border size="small">
        <el-table-column prop="kind" label="类型" width="80" align="center">
          <template #default="{ row }">
            <el-tag size="small" :type="row.kind === 'hbbr' ? 'success' : 'primary'">{{ row.kind }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="addr" label="地址" min-width="180">
          <template #default="{ row }">
            <div>{{ row.addr }}</div>
            <div v-if="row.lan_addr" class="hint">内网: {{ row.lan_addr }}</div>
          </template>
        </el-table-column>
        <el-table-column label="地域" width="110" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.region" size="small">{{ regionName(row.region) }} ({{ row.region }})</el-tag>
            <span v-else class="hint">未设置</span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="90" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.disabled === 1" size="small" type="info">已下线</el-tag>
            <el-tag v-else-if="row.status === 1" size="small" type="success">在线</el-tag>
            <el-tag v-else size="small" type="danger">离线</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="sessions" label="会话" width="80" align="right"/>
        <el-table-column prop="peers" label="设备" width="80" align="right"/>
        <el-table-column label="延迟" width="90" align="right">
          <template #default="{ row }">{{ row.rtt_ms > 0 ? row.rtt_ms + ' ms' : '—' }}</template>
        </el-table-column>
        <el-table-column label="分数" width="90" align="right">
          <template #default="{ row }">{{ (row.score === undefined || row.score === null) ? '—' : Number(row.score).toFixed(3) }}</template>
        </el-table-column>
        <el-table-column prop="weight" label="人工权重" width="90" align="right"/>
        <el-table-column prop="version" label="版本" width="90"/>
        <el-table-column label="最后心跳" width="110">
          <template #default="{ row }">{{ fmtAgo(row.last_seen) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="160" align="center">
          <template #default="{ row }">
            <el-button link size="small" @click="edit(row)">编辑</el-button>
            <el-button link size="small" type="danger" @click="remove(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-empty v-if="!nodes.length" description="还没有节点上报（hbbs/hbbr 需配置 RD_API_SERVER 并启动）"/>
    </el-card>

    <!-- 编辑节点 -->
    <el-dialog v-model="dialog" title="编辑节点" width="460px">
      <el-form :model="form" label-width="100px">
        <el-form-item label="地址">
          <el-input v-model="form.addr" disabled/>
        </el-form-item>
        <el-form-item label="备注名">
          <el-input v-model="form.name"/>
        </el-form-item>
        <el-form-item label="地域">
          <el-select v-model="form.region" filterable clearable placeholder="选择省份（与客户端同一套代码）" style="width:100%">
            <el-option v-for="r in regionList" :key="r.code" :label="r.name + ' (' + r.code + ')'" :value="r.code"/>
          </el-select>
          <div class="hint">与客户端「所属地区」使用同一套省份代码，填错会导致地域偏好不生效</div>
        </el-form-item>
        <el-form-item label="内网地址">
          <el-input v-model="form.lan_addr" placeholder="如 10.126.126.5:21117（可选）"/>
        </el-form-item>
        <el-form-item label="人工权重">
          <el-input-number v-model="form.weight" :min="0" :max="10000"/>
        </el-form-item>
        <el-form-item label="平台配置">
          <el-input
            v-model="form.configText"
            type="textarea"
            :rows="8"
            placeholder='{"relay_servers":["1.2.3.4:21117"],"limit_speed_mbps":32}'
            style="font-family: monospace;"
          />
          <div class="hint" style="line-height:1.6;">
            可热更新（保存后约 30 秒内生效）：<br>
            · <code>relay_servers</code>（hbbs，中继地址数组）<br>
            · <code>limit_speed_mbps</code> / <code>single_bandwidth_mbps</code> /
            <code>total_bandwidth_mbps</code>（hbbr 限速，Mbit/s）<br>
            · <code>downgrade_threshold</code>（0~1）/ <code>downgrade_start_check_sec</code><br>
            仅展示、需重启才生效：<code>key</code> / <code>port</code> /
            <code>mask</code> / <code>must_login</code>
          </div>
        </el-form-item>
        <el-form-item label="手动下线">
          <el-switch v-model="form.disabledBool"/>
          <span class="hint" style="margin-left:8px;">下线后不再下发给 hbbs</span>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialog = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="save">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
  import { onActivated, onMounted, reactive, ref } from 'vue'
  import { ElMessage, ElMessageBox } from 'element-plus'
  import { nodeDelete, nodeGetConfig, nodeList, nodeRefresh, nodeRegions, nodeSaveConfig, nodeSaveScoreConfig, nodeScoreConfig, nodeUpdate } from '@/api/node'

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

  const dialog = ref(false)
  const form = reactive({ id: 0, addr: '', name: '', region: '', lan_addr: '', weight: 100, disabledBool: false, configText: '' })

  const fmtAgo = (ts) => {
    if (!ts) return '—'
    const d = Math.max(0, Math.floor(Date.now() / 1000) - ts)
    if (d < 60) return d + ' 秒前'
    if (d < 3600) return Math.floor(d / 60) + ' 分钟前'
    return Math.floor(d / 3600) + ' 小时前'
  }

  const load = async () => {
    loading.value = true
    const res = await nodeList().catch(_ => false)
    loading.value = false
    if (res) {
      nodes.value = res.data.nodes || []
      offlineSec.value = res.data.offlineSec || 60
      if (res.data.weights) Object.assign(weights, res.data.weights)
    }
  }

  const loadWeights = async () => {
    const res = await nodeScoreConfig().catch(_ => false)
    if (res && res.data.weights) Object.assign(weights, res.data.weights)
  }

  const saveWeights = async () => {
    saving.value = true
    const res = await nodeSaveScoreConfig({ ...weights }).catch(e => {
      ElMessage.error((e && e.message) || '保存失败')
      return false
    })
    saving.value = false
    if (res) {
      ElMessage.success('权重已保存，下次下发立即生效')
      load()
    }
  }

  const refresh = async () => {
    refreshing.value = true
    await nodeRefresh().catch(_ => false)
    refreshing.value = false
    ElMessage.success('已重新探测节点')
    load()
  }

  const loadNodeConfig = async (id) => {
    const res = await nodeGetConfig(id).catch(_ => false)
    if (res && res.data.config) {
      try {
        form.configText = JSON.stringify(JSON.parse(res.data.config), null, 2)
      } catch (_) {
        form.configText = res.data.config
      }
    }
  }

  const edit = (row) => {
    Object.assign(form, {
      id: row.id,
      addr: row.addr,
      name: row.name || '',
      region: row.region || '',
      lan_addr: row.lan_addr || '',
      weight: row.weight || 100,
      disabledBool: row.disabled === 1,
      configText: '',
    })
    dialog.value = true
    loadNodeConfig(row.id)
  }

  const save = async () => {
    saving.value = true
    const res = await nodeUpdate({
      id: form.id,
      name: form.name,
      region: form.region,
      lan_addr: form.lan_addr,
      weight: form.weight,
      disabled: form.disabledBool ? 1 : 0,
    }).catch(e => {
      ElMessage.error((e && e.message) || '保存失败')
      return false
    })
    saving.value = false
    if (res && form.configText.trim()) {
      await nodeSaveConfig({ id: form.id, config: form.configText }).catch(e => {
        ElMessage.error('配置下发失败：' + ((e && e.message) || ''))
        return false
      })
      ElMessage.success('已保存并下发配置（约 30 秒内生效）')
    } else if (res) {
      ElMessage.success('已保存')
      dialog.value = false
      load()
    }
  }

  const remove = async (row) => {
    try {
      await ElMessageBox.confirm(`确认删除节点 ${row.addr}？删除后需节点重新注册才会再次出现。`, '确认', { type: 'warning' })
    } catch (_) {
      return
    }
    const res = await nodeDelete(row.id).catch(e => {
      ElMessage.error((e && e.message) || '删除失败')
      return false
    })
    if (res) {
      ElMessage.success('已删除')
      load()
    }
  }

  onMounted(() => {
    load()
    loadWeights()
    loadRegions()
  })
  onActivated(() => {
    load()
    loadWeights()
    loadRegions()
  })
</script>

<style scoped lang="scss">
  .hint {
    font-size: 12px;
    color: #909399;
  }
</style>
