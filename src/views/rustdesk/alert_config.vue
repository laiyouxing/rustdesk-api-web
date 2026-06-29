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
        <el-table-column :label="T('Scope')" min-width="180">
          <template #default="{row}">
            <span v-if="row.monitor_all === 1">全部设备（整个平台）</span>
            <span v-else>
              <el-tag size="small" type="info" style="margin-right: 4px;" v-for="t in (row.targets||[])" :key="t.row_id">
                {{ t.target_name || t.target_id }}
              </el-tag>
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
        <el-table-column :label="T('Actions')" width="160" align="center">
          <template #default="{row}">
            <el-button size="small" @click="showForm(row)">{{ T('Edit') }}</el-button>
            <el-button size="small" type="danger" @click="del(row)">{{ T('Delete') }}</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="formVisible" :title="editId ? T('Edit') : T('Add')" width="700px">
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
          <el-input v-model="form.smtp_pass" type="password" placeholder="SMTP授权码"></el-input>
        </el-form-item>
        <el-form-item v-if="form.channel === 'smtp'" :label="T('SmtpTo')">
          <el-input v-model="form.smtp_to" placeholder="admin@example.com,user@example.com"></el-input>
        </el-form-item>
        <el-form-item :label="T('MonitorScope')">
          <el-radio-group v-model="form.monitor_all">
            <el-radio :value="1">{{ T('AllDevices') }}（整个平台）</el-radio>
            <el-radio :value="2">{{ T('SelectTargets') }}</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item v-if="form.monitor_all === 2" :label="T('SelectTargets')">
          <div style="width: 100%;">
            <el-button size="small" type="primary" @click="loadCollections">{{ T('Refresh') }}</el-button>
            <div v-if="collections.length > 0" style="margin-top: 8px; max-height: 300px; overflow-y: auto; border: 1px solid #dcdfe6; border-radius: 4px; padding: 8px;">
              <div v-for="col in collections" :key="'c-'+col.id" style="margin-bottom: 4px;">
                <el-checkbox v-model="selectedCollections" :label="col.id" :key="'col-'+col.id" @change="() => onCollectionToggle(col)">
                  <strong>{{ col.name }}</strong>
                  <span style="color: #909399; font-size: 12px; margin-left: 4px;">({{ col.peer_count }}台)</span>
                </el-checkbox>
                <div v-if="expandedCollections[col.id]" style="margin-left: 28px; margin-top: 2px;">
                  <div v-for="peer in (col.peers || [])" :key="'p-'+peer.peer_id" style="margin-bottom: 2px;">
                    <el-checkbox v-model="selectedPeers" :label="peer.peer_id" :key="'peer-'+peer.peer_id">
                      {{ peer.hostname || peer.peer_id }}
                    </el-checkbox>
                  </div>
                  <el-button v-if="!col.peersLoaded" size="small" type="text" @click="loadPeers(col)">{{ T('LoadDevices') }}</el-button>
                  <span v-else-if="col.peers && col.peers.length === 0" style="font-size: 12px; color: #909399;">无设备</span>
                </div>
              </div>
            </div>
            <div v-else style="margin-top: 8px; color: #909399; font-size: 13px;">{{ T('NoCollections') }}</div>
          </div>
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
const collections = ref([])
const selectedCollections = ref([])
const selectedPeers = ref([])
const expandedCollections = reactive({})

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

const channelType = (ch) => ({ station: 'info', wecom: 'success', dingtalk: 'warning', smtp: 'primary' }[ch] || '')
const channelLabel = (ch) => ({ station: '站内消息', wecom: '企业微信', dingtalk: '钉钉', smtp: '邮件' }[ch] || ch)

const getList = async () => {
  loading.value = true
  const res = await getAlertList().catch(_ => false)
  loading.value = false
  if (res) {
    // Load targets for each config
    const list = res.data.list || []
    for (const cfg of list) {
      const tRes = await request({ url: '/alert_config/targets', params: { alert_id: cfg.row_id } }).catch(_ => false)
      if (tRes) cfg.targets = tRes.data.list
    }
    configs.value = list
  }
}

const loadCollections = async () => {
  const res = await request({ url: '/alert_config/available_collections' }).catch(_ => false)
  if (res) {
    collections.value = (res.data.list || []).map(c => ({ ...c, peers: [], peersLoaded: false }))
  }
}

const loadPeers = async (col) => {
  const res = await request({ url: '/alert_config/available_peers', params: { collection_id: col.id } }).catch(_ => false)
  if (res) {
    col.peers = res.data.list || []
    col.peersLoaded = true
  }
}

const onCollectionToggle = (col) => {
  if (selectedCollections.value.includes(col.id)) {
    // Collection checked: expand, load peers, auto-select all peers
    expandedCollections[col.id] = true
    if (!col.peersLoaded) {
      loadPeers(col).then(() => {
        // After peers are loaded, add all to selectedPeers
        for (const p of (col.peers || [])) {
          if (!selectedPeers.value.includes(p.peer_id)) {
            selectedPeers.value.push(p.peer_id)
          }
        }
      })
    } else {
      // Peers already loaded, add all
      for (const p of (col.peers || [])) {
        if (!selectedPeers.value.includes(p.peer_id)) {
          selectedPeers.value.push(p.peer_id)
        }
      }
    }
  } else {
    expandedCollections[col.id] = false
    // Remove all peers belonging to this collection
    if (col.peers) {
      for (const p of col.peers) {
        const idx = selectedPeers.value.indexOf(p.peer_id)
        if (idx >= 0) selectedPeers.value.splice(idx, 1)
      }
    }
  }
}

const showForm = async (row) => {
  editId.value = row?.row_id || 0
  collections.value = []
  selectedCollections.value = []
  selectedPeers.value = []
  Object.keys(expandedCollections).forEach(k => delete expandedCollections[k])

  if (row) {
    form.channel = row.channel
    form.name = row.name
    form.webhook_url = row.webhook_url || ''
    form.smtp_host = row.smtp_host || ''
    form.smtp_port = row.smtp_port || 465
    form.smtp_user = row.smtp_user || ''
    form.smtp_pass = ''
    form.smtp_to = row.smtp_to || ''
    form.offline_min = row.offline_min || 5
    form.enabled = row.enabled
    form.monitor_all = row.monitor_all || 1

    // Load targets
    if (form.monitor_all === 2) {
      await loadCollections()
      const tRes = await request({ url: '/alert_config/targets', params: { alert_id: row.row_id } }).catch(_ => false)
      if (tRes && tRes.data.list) {
        for (const t of tRes.data.list) {
          if (t.target_type === 'collection') {
            selectedCollections.value.push(parseInt(t.target_id))
            expandedCollections[parseInt(t.target_id)] = true
          } else if (t.target_type === 'peer') {
            selectedPeers.value.push(t.target_id)
          }
        }
        // Load peers for expanded collections
        for (const col of collections.value) {
          if (expandedCollections[col.id]) {
            await loadPeers(col)
          }
        }
      }
    }
  } else {
    form.channel = 'wecom'
    form.name = ''
    form.webhook_url = ''
    form.smtp_host = ''
    form.smtp_port = 465
    form.smtp_user = ''
    form.smtp_pass = ''
    form.smtp_to = ''
    form.offline_min = 5
    form.enabled = 1
    form.monitor_all = 1
  }
  formVisible.value = true
}

const submit = async () => {
  const data = {
    channel: form.channel,
    name: form.name,
    webhook_url: form.webhook_url,
    smtp_host: form.smtp_host,
    smtp_port: form.smtp_port,
    smtp_user: form.smtp_user,
    smtp_pass: form.smtp_pass,
    smtp_to: form.smtp_to,
    offline_min: form.offline_min,
    enabled: form.enabled,
    monitor_all: form.monitor_all,
  }
  if (editId.value) data.row_id = editId.value

  const api = editId.value ? update : create
  const res = await api(data).catch(_ => false)
  if (res) {
    // Save targets if monitor_all=2
    if (form.monitor_all === 2) {
      const alertId = editId.value || res.data?.row_id
      if (alertId) {
        // Delete old targets first (if editing)
        if (editId.value) {
          const oldTargets = await request({ url: '/alert_config/targets', params: { alert_id: alertId } }).catch(_ => false)
          if (oldTargets && oldTargets.data.list) {
            for (const t of oldTargets.data.list) {
              await request({ url: '/alert_config/targets/delete', method: 'post', data: { id: t.row_id } }).catch(_ => false)
            }
          }
        }
        // Save collections
        for (const colId of selectedCollections.value) {
          const col = collections.value.find(c => c.id === colId)
          await request({
            url: '/alert_config/targets/create',
            method: 'post',
            data: { alert_id: alertId, target_type: 'collection', target_id: String(colId), target_name: col?.name || '' },
          }).catch(_ => false)
        }
        // Save individual peers
        for (const peerId of selectedPeers.value) {
          await request({
            url: '/alert_config/targets/create',
            method: 'post',
            data: { alert_id: alertId, target_type: 'peer', target_id: peerId, target_name: peerId },
          }).catch(_ => false)
        }
      }
    }
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

onMounted(getList)
</script>
