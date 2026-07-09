<template>
  <div>
    <!-- 通知通道管理 -->
    <el-card shadow="hover" style="margin-bottom:20px">
      <template #header>
        <div style="display:flex;justify-content:space-between;align-items:center">
          <span>{{ T('AlertChannel') }}</span>
          <el-button type="primary" size="small" @click="showChannelForm()">{{ T('Add') }}</el-button>
        </div>
      </template>
      <el-table :data="channels" v-loading="loadingCh" border size="small">
        <el-table-column prop="name" label="通道名称" min-width="120"></el-table-column>
        <el-table-column prop="channel" label="类型" width="100" align="center">
          <template #default="{row}">
            <el-tag :type="channelType(row.channel)" size="small">{{ channelLabel(row.channel) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="配置摘要" min-width="200">
          <template #default="{row}">
            <span v-if="row.channel==='smtp'" style="font-size:12px;color:#666">{{ row.smtp_user }} → {{ row.smtp_to }}</span>
            <span v-else-if="row.webhook_url" style="font-size:12px;color:#666">{{ row.webhook_url.slice(0,60) }}...</span>
            <span v-else style="color:#909399">-</span>
          </template>
        </el-table-column>
        <el-table-column label="创建时间" width="160">
          <template #default="{row}">{{ row.created_at || '-' }}</template>
        </el-table-column>
        <el-table-column label="操作" width="120" align="center">
          <template #default="{row}">
            <el-button size="small" @click="showChannelForm(row)">{{ T('Edit') }}</el-button>
            <el-button size="small" type="danger" @click="delChannel(row)">{{ T('Delete') }}</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 通道表单 -->
    <el-dialog v-model="chFormVisible" :title="chEditId ? T('Edit') : T('Add')" width="600px">
      <el-form label-width="120px">
        <el-form-item label="通道名称">
          <el-input v-model="chForm.name" placeholder="例如：企业微信告警"></el-input>
        </el-form-item>
        <el-form-item label="通道类型">
          <el-select v-model="chForm.channel" style="width:100%">
            <el-option :label="channelLabel('station')" value="station"></el-option>
            <el-option :label="channelLabel('wecom')" value="wecom"></el-option>
            <el-option :label="channelLabel('dingtalk')" value="dingtalk"></el-option>
            <el-option :label="channelLabel('smtp')" value="smtp"></el-option>
          </el-select>
        </el-form-item>
        <el-form-item v-if="chForm.channel==='wecom'||chForm.channel==='dingtalk'" label="Webhook URL">
          <el-input v-model="chForm.webhook_url" placeholder="https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxx"></el-input>
        </el-form-item>
        <template v-if="chForm.channel==='smtp'">
          <el-form-item label="SMTP 服务器">
            <el-input v-model="chForm.smtp_host" placeholder="smtp.qq.com"></el-input>
          </el-form-item>
          <el-form-item label="端口">
            <el-input-number v-model="chForm.smtp_port" :min="1" :max="65535"></el-input-number>
          </el-form-item>
          <el-form-item label="账号">
            <el-input v-model="chForm.smtp_user" placeholder="xxx@qq.com"></el-input>
          </el-form-item>
          <el-form-item label="密码/授权码">
            <el-input v-model="chForm.smtp_pass" type="password" :placeholder="chEditId ? '不修改请留空' : '必填'"></el-input>
          </el-form-item>
          <el-form-item label="收件人">
            <el-input v-model="chForm.smtp_to" placeholder="admin@example.com,user2@example.com"></el-input>
          </el-form-item>
        </template>
        <el-form-item>
          <el-button type="primary" @click="submitChannel">{{ T('Submit') }}</el-button>
          <el-button @click="chFormVisible=false">{{ T('Cancel') }}</el-button>
        </el-form-item>
      </el-form>
    </el-dialog>

    <!-- 告警规则列表 -->
    <el-card shadow="hover">
      <template #header>
        <div style="display:flex;justify-content:space-between;align-items:center">
          <span>{{ T('AlertConfig') }}</span>
          <el-button type="primary" size="small" @click="showRuleForm()">{{ T('Add') }}</el-button>
        </div>
      </template>
      <el-table :data="configs" v-loading="loading" border>
        <el-table-column prop="name" :label="T('Name')" min-width="100"></el-table-column>
        <el-table-column label="通知通道" width="120">
          <template #default="{row}">
            <el-tag :type="channelType(row.channel)" size="small">{{ channelLabel(row.channel) }}</el-tag>
            <div style="font-size:11px;color:#909399">{{ row.name }}</div>
          </template>
        </el-table-column>
        <el-table-column label="接收人" min-width="180">
          <template #default="{row}">
            <span style="font-size:12px">{{ getRecipient(row) }}</span>
          </template>
        </el-table-column>
        <el-table-column :label="T('MonitorScope')" min-width="180">
          <template #default="{row}">
            <span v-if="row.monitor_all===1">个人全部设备</span>
            <span v-else>
              <el-tag size="small" type="info" style="margin-right:4px" v-for="t in (row.targets||[])" :key="t.row_id">
                {{ t.target_name || t.target_id }}
              </el-tag>
              <span v-if="!row.targets||row.targets.length===0" style="color:#909399">未设置</span>
            </span>
          </template>
        </el-table-column>
        <el-table-column :label="T('OfflineMin')" width="80" align="center">
          <template #default="{row}">{{ row.offline_min || 5 }}min</template>
        </el-table-column>
        <el-table-column :label="T('Status')" width="70" align="center">
          <template #default="{row}">
            <el-tag :type="row.enabled===1?'success':'danger'" size="small">
              {{ row.enabled===1 ? T('Enable') : T('Disable') }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column :label="T('Actions')" width="280" align="center">
          <template #default="{row}">
            <el-button size="small" @click="showTargets(row)">监控目标</el-button>
            <el-button size="small" @click="showRuleForm(row)">{{ T('Edit') }}</el-button>
            <el-button size="small" type="danger" @click="delRule(row)">{{ T('Delete') }}</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 告警规则表单 -->
    <el-dialog v-model="ruleFormVisible" :title="ruleEditId ? T('Edit') : T('Add')" width="500px">
      <el-form label-width="100px">
        <el-form-item :label="T('Name')">
          <el-select v-model="ruleForm.channel_id" style="width:100%" placeholder="选择通知通道">
            <el-option v-for="ch in channels" :key="ch.row_id" :value="ch.row_id" :label="ch.name+' ('+channelLabel(ch.channel)+')'"></el-option>
          </el-select>
        </el-form-item>
        <el-form-item :label="T('MonitorScope')">
          <el-radio-group v-model="ruleForm.monitor_all">
            <el-radio :value="1">个人全部设备</el-radio>
            <el-radio :value="2">仅选择的设备</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item :label="T('OfflineMin')">
          <el-input-number v-model="ruleForm.offline_min" :min="1" :max="1440"></el-input-number>
          <span style="margin-left:8px;color:#909399">min</span>
        </el-form-item>
        <el-form-item :label="T('Status')">
          <el-switch v-model="ruleForm.enabled" :active-value="1" :inactive-value="2"></el-switch>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="submitRule">{{ T('Submit') }}</el-button>
          <el-button @click="ruleFormVisible=false">{{ T('Cancel') }}</el-button>
        </el-form-item>
      </el-form>
    </el-dialog>

    <!-- 监控目标对话框 -->
    <el-dialog v-model="targetVisible" title="设置监控目标" width="600px">
      <template v-if="currentAlertId>0">
        <el-button size="small" type="primary" style="margin-bottom:8px" @click="loadTargetCollections">{{ T('Refresh') }}</el-button>
        <el-radio-group v-model="targetMonitorAll" style="margin-bottom:8px" @change="onTargetMonitorChange">
          <el-radio :value="1">个人全部设备</el-radio>
          <el-radio :value="2">仅选择的设备</el-radio>
        </el-radio-group>
        <div v-if="targetMonitorAll===2 && targetCollections.length>0"
             style="max-height:350px;overflow-y:auto;border:1px solid #dcdfe6;border-radius:4px;padding:8px">
          <div v-for="col in targetCollections" :key="'c-'+col.id" style="margin-bottom:4px">
            <el-checkbox v-model="targetSelectedColls" :label="col.id" @change="()=>onTargetCollToggle(col)">
              <strong>{{ col.name }}</strong>
              <span style="color:#909399;font-size:12px;margin-left:4px">({{ col.peer_count }}台)</span>
            </el-checkbox>
            <div v-if="targetExpanded[col.id]" style="margin-left:28px;margin-top:2px">
              <div v-for="peer in (col.peers||[])" :key="'p-'+peer.peer_id" style="margin-bottom:2px">
                <el-checkbox v-model="targetSelectedPeers" :label="peer.peer_id">
                  {{ peer.hostname || peer.peer_id }}
                </el-checkbox>
              </div>
              <el-button v-if="!col.peersLoaded" size="small" type="text" @click="loadTargetPeers(col)">加载设备</el-button>
              <span v-else-if="col.peers&&col.peers.length===0" style="font-size:12px;color:#909399">无设备</span>
            </div>
          </div>
        </div>
        <div v-else-if="targetMonitorAll===2 && targetCollections.length===0" style="color:#909399;font-size:13px">暂无分组</div>
      </template>
      <template #footer>
        <el-button type="primary" @click="saveTargets">{{ T('Submit') }}</el-button>
        <el-button @click="targetVisible=false">{{ T('Cancel') }}</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { T } from '@/utils/i18n'
import { ElMessage, ElMessageBox } from 'element-plus'
import { list as getAlertList, create, update, remove } from '@/api/alert'
import request from '@/utils/request'

// 通知通道
const channels = ref([])
const loadingCh = ref(false)
const chFormVisible = ref(false)
const chEditId = ref(0)
const chForm = reactive({
  name: '', channel: 'wecom', webhook_url: '',
  smtp_host: '', smtp_port: 465, smtp_user: '', smtp_pass: '', smtp_to: '',
})

// 告警规则
const configs = ref([])
const loading = ref(false)
const ruleFormVisible = ref(false)
const ruleEditId = ref(0)
const ruleForm = reactive({ channel_id: null, monitor_all: 1, offline_min: 5, enabled: 1 })

// 监控目标
const targetVisible = ref(false)
const currentAlertId = ref(0)
const targetMonitorAll = ref(1)
const targetCollections = ref([])
const targetSelectedColls = ref([])
const targetSelectedPeers = ref([])
const targetExpanded = reactive({})

const channelType = (ch) => ({ station:'info', wecom:'success', dingtalk:'warning', smtp:'primary' }[ch]||'')
const channelLabel = (ch) => ({ station:'站内', wecom:'企微', dingtalk:'钉钉', smtp:'邮件' }[ch]||ch)

// 根据规则查找对应的通道信息，显示接收人
const getRecipient = (rule) => {
  const ch = channels.value.find(c => c.row_id === rule.channel_id)
  if (!ch) return '-'
  if (ch.channel === 'smtp') return ch.smtp_to || '-'
  if (ch.channel === 'wecom' || ch.channel === 'dingtalk') {
    // 从 webhook URL 提取最后一段标识
    const url = ch.webhook_url || ''
    const idx = url.lastIndexOf('/')
    return idx > 0 ? url.slice(idx + 1).slice(0, 20) : url.slice(0, 20) || '-'
  }
  return '-'
}

// ======== 通知通道 CRUD ========
const loadChannels = async () => {
  loadingCh.value = true
  const res = await request({ url: '/alert_channel/list' }).catch(_ => false)
  loadingCh.value = false
  if (res) channels.value = res.data.list || []
}

const showChannelForm = (row) => {
  chEditId.value = row?.row_id || 0
  Object.assign(chForm, row ? {
    name: row.name, channel: row.channel, webhook_url: row.webhook_url||'',
    smtp_host: row.smtp_host||'', smtp_port: row.smtp_port||465,
    smtp_user: row.smtp_user||'', smtp_pass: '', smtp_to: row.smtp_to||'',
  } : {
    name: '', channel: 'wecom', webhook_url: '',
    smtp_host: '', smtp_port: 465, smtp_user: '', smtp_pass: '', smtp_to: '',
  })
  chFormVisible.value = true
}

const submitChannel = async () => {
  const data = { ...chForm }
  if (chEditId.value) data.row_id = chEditId.value
  const api = chEditId.value ? 'update' : 'create'
  const res = await request({ url: `/alert_channel/${api}`, method: 'post', data }).catch(_ => false)
  if (res) {
    ElMessage.success(T('OperationSuccess'))
    chFormVisible.value = false
    loadChannels()
  }
}

const delChannel = async (row) => {
  const cf = await ElMessageBox.confirm('删除后关联的告警规则将无法发送，确认删除？', { type: 'warning' }).catch(_ => false)
  if (!cf) return
  const res = await request({ url: '/alert_channel/delete', method: 'post', data: { id: row.row_id } }).catch(_ => false)
  if (res) { ElMessage.success(T('OperationSuccess')); loadChannels() }
}

// ======== 告警规则 CRUD ========
const getRules = async () => {
  loading.value = true
  const res = await getAlertList().catch(_ => false)
  loading.value = false
  if (res) {
    const list = res.data.list || []
    for (const cfg of list) {
      const tRes = await request({ url: '/alert_config/targets', params: { alert_id: cfg.row_id } }).catch(_ => false)
      if (tRes) cfg.targets = tRes.data.list
    }
    configs.value = list
  }
}

const showRuleForm = (row) => {
  ruleEditId.value = row?.row_id || 0
  ruleForm.channel_id = row?.channel_id || null
  ruleForm.monitor_all = row?.monitor_all || 1
  ruleForm.offline_min = row?.offline_min || 5
  ruleForm.enabled = row?.enabled || 1
  ruleFormVisible.value = true
}

const submitRule = async () => {
  const data = { ...ruleForm }
  if (ruleEditId.value) data.row_id = ruleEditId.value
  const api = ruleEditId.value ? update : create
  const res = await api(data).catch(_ => false)
  if (res) {
    ElMessage.success(T('OperationSuccess'))
    ruleFormVisible.value = false
    getRules()
  }
}

const delRule = async (row) => {
  const cf = await ElMessageBox.confirm(T('Confirm?',{param:T('Delete')}),{type:'warning'}).catch(_=>false)
  if (!cf) return
  const res = await remove({ id: row.row_id }).catch(_ => false)
  if (res) { ElMessage.success(T('OperationSuccess')); getRules() }
}

// ======== 监控目标 ========
const loadTargetCollections = async () => {
  const res = await request({ url: '/alert_config/available_collections' }).catch(_ => false)
  if (res) targetCollections.value = (res.data.list||[]).map(c=>({...c,peers:[],peersLoaded:false}))
}

const loadTargetPeers = async (col) => {
  const res = await request({ url: '/alert_config/available_peers', params: { collection_id: col.id } }).catch(_ => false)
  if (res) { col.peers = res.data.list||[]; col.peersLoaded = true }
}

const onTargetCollToggle = (col) => {
  if (targetSelectedColls.value.includes(col.id)) {
    targetExpanded[col.id] = true
    if (!col.peersLoaded) loadTargetPeers(col).then(() => {
      for (const p of (col.peers||[])) { if (!targetSelectedPeers.value.includes(p.peer_id)) targetSelectedPeers.value.push(p.peer_id) }
    })
    else for (const p of (col.peers||[])) { if (!targetSelectedPeers.value.includes(p.peer_id)) targetSelectedPeers.value.push(p.peer_id) }
  } else {
    targetExpanded[col.id] = false
    if (col.peers) for (const p of col.peers) { const idx = targetSelectedPeers.value.indexOf(p.peer_id); if (idx>=0) targetSelectedPeers.value.splice(idx,1) }
  }
}

const onTargetMonitorChange = (val) => { if (val===1) { targetSelectedColls.value=[]; targetSelectedPeers.value=[] } }

const showTargets = async (row) => {
  currentAlertId.value = row.row_id
  targetMonitorAll.value = row.monitor_all || 1
  targetCollections.value = []; targetSelectedColls.value = []; targetSelectedPeers.value = []
  Object.keys(targetExpanded).forEach(k=>delete targetExpanded[k])
  await loadTargetCollections()
  if (targetMonitorAll.value===2) {
    const tRes = await request({ url: '/alert_config/targets', params: { alert_id: row.row_id } }).catch(_=>false)
    if (tRes && tRes.data.list) {
      for (const t of tRes.data.list) {
        if (t.target_type==='collection') { targetSelectedColls.value.push(parseInt(t.target_id)); targetExpanded[parseInt(t.target_id)]=true }
        else targetSelectedPeers.value.push(t.target_id)
      }
      for (const col of targetCollections.value) { if (targetExpanded[col.id]) await loadTargetPeers(col) }
    }
  }
  targetVisible.value = true
}

const saveTargets = async () => {
  const alertId = currentAlertId.value
  await update({ row_id: alertId, monitor_all: targetMonitorAll.value }).catch(_=>false)
  const oldT = await request({ url: '/alert_config/targets', params: { alert_id: alertId } }).catch(_=>false)
  if (oldT && oldT.data.list) for (const t of oldT.data.list) { await request({ url: '/alert_config/targets/delete', method:'post', data:{id:t.row_id} }).catch(_=>false) }
  if (targetMonitorAll.value===2) {
    for (const colId of targetSelectedColls.value) { const col = targetCollections.value.find(c=>c.id===colId); await request({ url:'/alert_config/targets/create', method:'post', data:{ alert_id:alertId, target_type:'collection', target_id:String(colId), target_name:col?.name||'' } }).catch(_=>false) }
    for (const peerId of targetSelectedPeers.value) { await request({ url:'/alert_config/targets/create', method:'post', data:{ alert_id:alertId, target_type:'peer', target_id:peerId, target_name:peerId } }).catch(_=>false) }
  }
  ElMessage.success(T('OperationSuccess'))
  targetVisible.value = false
  getRules()
}

onMounted(() => { loadChannels(); getRules() })
</script>
