<template>
  <div>
    <el-card shadow="hover">
      <template #header>
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span>{{ T('AlertConfig') }}</span>
          <el-button type="primary" size="small" @click="showForm()">{{ T('Add') }}</el-button>
        </div>
      </template>
      <el-table :data="list" v-loading="loading" border>
        <el-table-column prop="channel" :label="T('Channel')" width="120" align="center">
          <template #default="{row}">
            <el-tag :type="channelType(row.channel)" size="small">{{ channelLabel(row.channel) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="name" :label="T('Name')" min-width="120"></el-table-column>
        <el-table-column :label="T('OfflineMin')" width="120" align="center">
          <template #default="{row}">{{ row.offline_min || 5 }} 分钟</template>
        </el-table-column>
        <el-table-column :label="T('Status')" width="80" align="center">
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
          <el-input v-model="form.smtp_pass" type="password" placeholder="SMTP授权码"></el-input>
        </el-form-item>
        <el-form-item v-if="form.channel === 'smtp'" :label="T('SmtpTo')">
          <el-input v-model="form.smtp_to" placeholder="admin@example.com,user@example.com"></el-input>
        </el-form-item>
        <el-form-item :label="T('OfflineMin')">
          <el-input-number v-model="form.offline_min" :min="1" :max="1440"></el-input-number>
          <span style="margin-left: 8px; color: #909399;">分钟无心跳视为离线</span>
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
})

const channelType = (ch) => ({ station: 'info', wecom: 'success', dingtalk: 'warning', smtp: 'primary' }[ch] || '')
const channelLabel = (ch) => ({ station: '站内消息', wecom: '企业微信', dingtalk: '钉钉', smtp: '邮件' }[ch] || ch)

const getList = async () => {
  loading.value = true
  const res = await list().catch(_ => false)
  loading.value = false
  if (res) configs.value = res.data.list
}

const showForm = (row) => {
  editId.value = row?.row_id || 0
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

onMounted(getList)
</script>
