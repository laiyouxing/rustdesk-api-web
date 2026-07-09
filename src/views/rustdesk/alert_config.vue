<template>
  <div>
    <el-card shadow="hover">
      <template #header>
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span>{{ T('AlertConfig') }}</span>
          <el-button type="primary" size="small" @click="showForm()">{{ T('Add') }}</el-button>
        </div>
      </template>
      <el-table :data="configs" v-loading="loading" border>
        <el-table-column prop="channel" :label="T('Channel')" width="100" align="center">
          <template #default="{row}">
            <el-tag :type="channelType(row.channel)" size="small">{{ channelLabel(row.channel) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="name" :label="T('Name')" min-width="120"></el-table-column>
        <el-table-column :label="T('MonitorScope')" min-width="180">
          <template #default="{row}">
            <span v-if="row.monitor_all === 1">个人全部设备</span>
            <span v-else>
              <el-tag size="small" type="info" style="margin-right: 4px;" v-for="t in (row.targets||[])" :key="t.row_id">
                {{ t.target_name || t.target_id }}
              </el-tag>
              <span v-if="!row.targets || row.targets.length === 0" style="color:#909399">未设置</span>
            </span>
          </template>
        </el-table-column>
        <el-table-column :label="T('OfflineMin')" width="90" align="center">
          <template #default="{row}">{{ row.offline_min || 5 }}min</template>
        </el-table-column>
        <el-table-column :label="T('Status')" width="70" align="center">
          <template #default="{row}">
            <el-tag :type="row.enabled === 1 ? 'success' : 'danger'" size="small">
              {{ row.enabled === 1 ? T('Enable') : T('Disable') }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column :label="T('Actions')" width="220" align="center">
          <template #default="{row}">
            <el-button size="small" @click="showTargets(row)">监控目标</el-button>
            <el-button size="small" @click="showForm(row)">{{ T('Edit') }}</el-button>
            <el-button size="small" type="danger" @click="del(row)">{{ T('Delete') }}</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 告警配置表单（仅通道信息，不含监控目标） -->
    <el-dialog v-model="formVisible" :title="editId ? T('Edit') : T('Add')" width="600px">
      <el-form label-width="120px">
        <el-form-item :label="T('Channel')">
          <el-select v-model="form.channel" style="width: 100%">
            <el-option :label="channelLabel('station')" value="station"></el-option>
            <el-option :label="channelLabel('wecom')" value="wecom"></el-option>
            <el-option :label="channelLabel('dingtalk')" value="dingtalk"></el-option>
            <el-option :label="channelLabel('smtp')" value="smtp"></el-option>
          </el-select>
        </el-form-item>
        <el-form-item :label="T('Name')">
          <el-input v-model="form.name" placeholder="通知名称"></el-input>
        </el-form-item>
        <el-form-item v-if="form.channel === 'wecom' || form.channel === 'dingtalk'" :label="T('WebhookUrl')">
          <el-input v-model="form.webhook_url" placeholder="https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxx"></el-input>
        </el-form-item>
        <el-form-item v-if="form.channel === 'smtp'" :label="T('SmtpHost')">
          <el-input v-model="form.smtp_host" placeholder="smtp.qq.com"></el-input>
        </el-form-item>
        <el-form-item v-if="form.channel === 'smtp'" :label="T('SmtpPort')">
          <el-input-number v-model="form.smtp_port" :min="1" :max="65535"></el-input-number>
        </el-form-item>
        <el-form-item v-if="form.channel === 'smtp'" :label="T('SmtpUser')">
          <el-input v-model="form.smtp_user" placeholder="xxx@qq.com"></el-input>
        </el-form-item>
        <el-form-item v-if="form.channel === 'smtp'" :label="T('SmtpPass')">
          <el-input v-model="form.smtp_pass" type="password" :placeholder="editId ? '已设置，不修改请留空' : 'SMTP授权码'"></el-input>
        </el-form-item>
        <el-form-item v-if="form.channel === 'smtp'" :label="T('SmtpTo')">
          <el-input v-model="form.smtp_to" placeholder="admin@example.com,user@example.com"></el-input>
        </el-form-item>
        <el-form-item :label="T('MonitorScope')">
          <el-radio-group v-model="form.monitor_all">
            <el-radio :value="1">个人全部设备</el-radio>
            <el-radio :value="2">仅选择的设备</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item :label="T('OfflineMin')">
          <el-input-number v-model="form.offline_min" :min="1" :max="1440"></el-input-number>
          <span style="margin-left: 8px; color: #909399;">min</span>
        </el-form-item>
        <el-form-item :label="T('Status')">
          <el-switch v-model="form.enabled" :active-value="1" :inactive-value="2"></el-switch>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="submit">{{ T('Submit') }}</el-button>
          <el-button @click="formVisible = false">{{ T('Cancel') }}</el-button>
        </el-form-item>
      </el-form>
    </el-dialog>

    <!-- 监控目标设置对话框（独立于通道配置） -->
    <el-dialog v-model="targetVisible" :title="T('SelectTargets')" width="600px">
      <template v-if="currentAlertId > 0">
        <el-button size="small" type="primary" style="margin-bottom:8px" @click="loadTargetCollections">
          {{ T('Refresh') }}
        </el-button>
        <el-radio-group v-model="form.monitor_all" style="margin-bottom:8px" @change="onMonitorAllChange">
          <el-radio :value="1">个人全部设备</el-radio>
          <el-radio :value="2">仅选择的设备</el-radio>
        </el-radio-group>
        <div v-if="form.monitor_all === 2 && targetCollections.length > 0"
             style="max-height: 350px; overflow-y: auto; border: 1px solid #dcdfe6; border-radius: 4px; padding: 8px;">
          <div v-for="col in targetCollections" :key="'c-'+col.id" style="margin-bottom: 4px;">
            <el-checkbox v-model="targetSelectedColls" :label="col.id" @change="() => onTargetCollToggle(col)">
              <strong>{{ col.name }}</strong>
              <span style="color: #909399; font-size: 12px; margin-left: 4px;">({{ col.peer_count }}台)</span>
            </el-checkbox>
            <div v-if="targetExpanded[col.id]" style="margin-left: 28px; margin-top: 2px;">
              <div v-for="peer in (col.peers || [])" :key="'p-'+peer.peer_id" style="margin-bottom: 2px;">
                <el-checkbox v-model="targetSelectedPeers" :label="peer.peer_id">
                  {{ peer.hostname || peer.peer_id }}
                </el-checkbox>
              </div>
              <el-button v-if="!col.peersLoaded" size="small" type="text" @click="loadTargetPeers(col)">加载设备</el-button>
              <span v-else-if="col.peers && col.peers.length === 0" style="font-size: 12px; color: #909399;">无设备</span>
            </div>
          </div>
        </div>
        <div v-else-if="form.monitor_all === 2 && targetCollections.length === 0" style="color:#909399;font-size:13px;">
          暂无可用通讯录分组，请先在地址簿中添加
        </div>
      </template>
      <template #footer>
        <el-button type="primary" @click="saveTargets">{{ T('Submit') }}</el-button>
        <el-button @click="targetVisible = false">{{ T('Cancel') }}</el-button>
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

const configs = ref([])
const loading = ref(false)
const formVisible = ref(false)
const editId = ref(0)

const form = reactive({
  channel: 'wecom',
  name: '',
  webhook_url: '',
  smtp_host: '',
  smtp_port: 465,
  smtp_user: '',
  smtp_pass: '',
  smtp_to: '',
  offline_min: 5,
  enabled: 1,
  monitor_all: 1,
})

// 监控目标对话框
const targetVisible = ref(false)
const currentAlertId = ref(0)
const targetCollections = ref([])
const targetSelectedColls = ref([])
const targetSelectedPeers = ref([])
const targetExpanded = reactive({})

const channelType = (ch) => ({ station: 'info', wecom: 'success', dingtalk: 'warning', smtp: 'primary' }[ch] || '')
const channelLabel = (ch) => ({ station: '站内消息', wecom: '企业微信', dingtalk: '钉钉', smtp: '邮件' }[ch] || ch)

const getList = async () => {
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

// ----- 通道配置 -----
const showForm = (row) => {
  editId.value = row?.row_id || 0
  if (row) {
    Object.assign(form, {
      channel: row.channel,
      name: row.name,
      webhook_url: row.webhook_url || '',
      smtp_host: row.smtp_host || '',
      smtp_port: row.smtp_port || 465,
      smtp_user: row.smtp_user || '',
      smtp_pass: '',
      smtp_to: row.smtp_to || '',
      offline_min: row.offline_min || 5,
      enabled: row.enabled,
      monitor_all: row.monitor_all || 1,
    })
  } else {
    Object.assign(form, {
      channel: 'wecom', name: '', webhook_url: '', smtp_host: '', smtp_port: 465,
      smtp_user: '', smtp_pass: '', smtp_to: '', offline_min: 5, enabled: 1, monitor_all: 1,
    })
  }
  formVisible.value = true
}

const submit = async () => {
  const data = { ...form }
  if (editId.value) data.row_id = editId.value
  const api = editId.value ? update : create
  const res = await api(data).catch(_ => false)
  if (res) {
    ElMessage.success(T('OperationSuccess'))
    formVisible.value = false
    getList()
  }
}

const del = async (row) => {
  const cf = await ElMessageBox.confirm(T('Confirm?', { param: T('Delete') }), { type: 'warning' }).catch(_ => false)
  if (!cf) return
  const res = await remove({ id: row.row_id }).catch(_ => false)
  if (res) {
    ElMessage.success(T('OperationSuccess'))
    getList()
  }
}

// ----- 监控目标管理 -----
const loadTargetCollections = async () => {
  const res = await request({ url: '/alert_config/available_collections' }).catch(_ => false)
  if (res) {
    targetCollections.value = (res.data.list || []).map(c => ({ ...c, peers: [], peersLoaded: false }))
  }
}

const loadTargetPeers = async (col) => {
  const res = await request({ url: '/alert_config/available_peers', params: { collection_id: col.id } }).catch(_ => false)
  if (res) {
    col.peers = res.data.list || []
    col.peersLoaded = true
  }
}

const onTargetCollToggle = (col) => {
  if (targetSelectedColls.value.includes(col.id)) {
    targetExpanded[col.id] = true
    if (!col.peersLoaded) {
      loadTargetPeers(col).then(() => {
        for (const p of (col.peers || [])) {
          if (!targetSelectedPeers.value.includes(p.peer_id)) targetSelectedPeers.value.push(p.peer_id)
        }
      })
    } else {
      for (const p of (col.peers || [])) {
        if (!targetSelectedPeers.value.includes(p.peer_id)) targetSelectedPeers.value.push(p.peer_id)
      }
    }
  } else {
    targetExpanded[col.id] = false
    if (col.peers) {
      for (const p of col.peers) {
        const idx = targetSelectedPeers.value.indexOf(p.peer_id)
        if (idx >= 0) targetSelectedPeers.value.splice(idx, 1)
      }
    }
  }
}

const showTargets = async (row) => {
  currentAlertId.value = row.row_id
  form.monitor_all = row.monitor_all || 1
  targetCollections.value = []
  targetSelectedColls.value = []
  targetSelectedPeers.value = []
  Object.keys(targetExpanded).forEach(k => delete targetExpanded[k])

  await loadTargetCollections()
  if (form.monitor_all === 2) {
    const tRes = await request({ url: '/alert_config/targets', params: { alert_id: row.row_id } }).catch(_ => false)
    if (tRes && tRes.data.list) {
      for (const t of tRes.data.list) {
        if (t.target_type === 'collection') {
          targetSelectedColls.value.push(parseInt(t.target_id))
          targetExpanded[parseInt(t.target_id)] = true
        } else {
          targetSelectedPeers.value.push(t.target_id)
        }
      }
      for (const col of targetCollections.value) {
        if (targetExpanded[col.id]) await loadTargetPeers(col)
      }
    }
  }
  targetVisible.value = true
}

const onMonitorAllChange = (val) => {
  if (val === 1) {
    targetSelectedColls.value = []
    targetSelectedPeers.value = []
  }
}

const saveTargets = async () => {
  const alertId = currentAlertId.value
  // 更新 monitor_all
  await update({ row_id: alertId, monitor_all: form.monitor_all }).catch(_ => false)

  // 删除旧 targets
  const oldTargets = await request({ url: '/alert_config/targets', params: { alert_id: alertId } }).catch(_ => false)
  if (oldTargets && oldTargets.data.list) {
    for (const t of oldTargets.data.list) {
      await request({ url: '/alert_config/targets/delete', method: 'post', data: { id: t.row_id } }).catch(_ => false)
    }
  }

  // 创建新 targets（仅 monitor_all=2 时）
  if (form.monitor_all === 2) {
    for (const colId of targetSelectedColls.value) {
      const col = targetCollections.value.find(c => c.id === colId)
      await request({
        url: '/alert_config/targets/create', method: 'post',
        data: { alert_id: alertId, target_type: 'collection', target_id: String(colId), target_name: col?.name || '' },
      }).catch(_ => false)
    }
    for (const peerId of targetSelectedPeers.value) {
      await request({
        url: '/alert_config/targets/create', method: 'post',
        data: { alert_id: alertId, target_type: 'peer', target_id: peerId, target_name: peerId },
      }).catch(_ => false)
    }
  }

  ElMessage.success(T('OperationSuccess'))
  targetVisible.value = false
  getList()
}

onMounted(getList)
</script>
