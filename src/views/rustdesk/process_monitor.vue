<template>
  <div>
    <!-- 监控规则管理 -->
    <el-card shadow="hover">
      <div class="toolbar">
        <span class="tip">{{ T('ProcessMonitorTip') }}</span>
        <el-button type="primary" @click="openCreate">{{ T('ProcessAdd') }}</el-button>
        <el-button @click="loadRules" :loading="loading">{{ T('ProcessRefresh') }}</el-button>
      </div>
      <el-table :data="rules" stripe border v-loading="loading" style="width:100%">
        <el-table-column prop="peer_id" :label="T('ProcessPeerId')" min-width="150" />
        <el-table-column prop="name" :label="T('ProcessName')" min-width="120" />
        <el-table-column :label="T('ProcessType')" min-width="90">
          <template #default="{row}">
            <el-tag>{{ row.type === 'port' ? T('ProcessPort') : T('ProcessProcess') }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="target" :label="T('ProcessTarget')" min-width="120" />
        <el-table-column prop="interval" :label="T('ProcessInterval')" min-width="90" />
        <el-table-column prop="down_threshold" :label="T('ProcessDownThreshold')" min-width="120" />
        <el-table-column prop="alert_config_id" :label="T('ProcessAlertRule')" min-width="100" />
        <el-table-column :label="T('ProcessEnabled')" min-width="90">
          <template #default="{row}">
            <el-tag :type="row.enabled === 1 ? 'success' : 'info'">{{ row.enabled === 1 ? T('ProcessUp') : T('ProcessDown') }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column :label="T('ProcessOperation')" min-width="160">
          <template #default="{row}">
            <el-button size="small" @click="openEdit(row)">{{ T('ProcessEdit') }}</el-button>
            <el-button size="small" type="danger" @click="remove(row)">{{ T('ProcessDelete') }}</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 实时状态 -->
    <el-card shadow="hover" style="margin-top:20px">
      <div class="toolbar">
        <span class="tip">{{ T('ProcessStatusTip') }}</span>
        <el-input v-model="filterPeer" :placeholder="T('ProcessPeerId')" style="width:220px" clearable @keyup.enter="loadStatus" />
        <el-button type="primary" @click="loadStatus">{{ T('ProcessRefresh') }}</el-button>
      </div>
      <el-table :data="statusList" stripe border v-loading="statusLoading" style="width:100%">
        <el-table-column prop="peer_id" :label="T('ProcessPeerId')" min-width="150" />
        <el-table-column prop="name" :label="T('ProcessName')" min-width="120" />
        <el-table-column :label="T('ProcessType')" min-width="90">
          <template #default="{row}">
            <el-tag>{{ row.type === 'port' ? T('ProcessPort') : T('ProcessProcess') }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="target" :label="T('ProcessTarget')" min-width="120" />
        <el-table-column :label="T('ProcessRunning')" min-width="100">
          <template #default="{row}">
            <el-tag :type="row.running === 1 ? 'success' : 'danger'" effect="dark">
              {{ row.running === 1 ? T('ProcessUp') : T('ProcessDown') }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column :label="T('ProcessDownSince')" min-width="170">
          <template #default="{row}">{{ row.down_since ? fmtTime(row.down_since) : '-' }}</template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 规则编辑对话框 -->
    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="540px">
      <el-form :model="form" label-width="120px">
        <el-form-item v-if="!editing" :label="T('ProcessTargetMode')">
          <el-radio-group v-model="sourceType" @change="onSourceTypeChange">
            <el-radio-button label="peers">{{ T('ProcessModeManual') }}</el-radio-button>
            <el-radio-button label="device_group">{{ T('ProcessModeDeviceGroup') }}</el-radio-button>
            <el-radio-button label="ab_tags">{{ T('ProcessModeAbTags') }}</el-radio-button>
          </el-radio-group>
        </el-form-item>

        <!-- 手动单个设备（编辑时也用此项） -->
        <el-form-item v-if="editing || sourceType === 'peers'" :label="T('ProcessPeerId')">
          <el-input v-model="form.peer_id" :placeholder="T('ProcessPeerIdTip')" />
        </el-form-item>

        <!-- 按设备组 -->
        <el-form-item v-if="!editing && sourceType === 'device_group'" :label="T('ProcessModeDeviceGroup')">
          <el-select v-model="selectedGroupId" filterable :placeholder="T('ProcessSelectDeviceGroup')" style="width:100%">
            <el-option
              v-for="g in deviceGroups"
              :key="g.id"
              :label="`${g.name} (${g.count})`"
              :value="g.id"
            />
          </el-select>
        </el-form-item>

        <!-- 按地址簿标签 -->
        <el-form-item v-if="!editing && sourceType === 'ab_tags'" :label="T('ProcessModeAbTags')">
          <el-select v-model="selectedTags" multiple filterable collapse-tags :placeholder="T('ProcessSelectAbTags')" style="width:100%">
            <el-option
              v-for="t in abTags"
              :key="t.tag"
              :label="`${t.tag} (${t.count})`"
              :value="t.tag"
            />
          </el-select>
        </el-form-item>
        <el-form-item :label="T('ProcessName')">
          <el-input v-model="form.name" />
        </el-form-item>
        <el-form-item :label="T('ProcessType')">
          <el-select v-model="form.type">
            <el-option :label="T('ProcessProcess')" value="process" />
            <el-option :label="T('ProcessPort')" value="port" />
          </el-select>
        </el-form-item>
        <el-form-item :label="T('ProcessTarget')">
          <el-input v-model="form.target" :placeholder="T('ProcessTargetTip')" />
        </el-form-item>
        <el-form-item :label="T('ProcessInterval')">
          <el-input-number v-model="form.interval" :min="5" :step="5" />
        </el-form-item>
        <el-form-item :label="T('ProcessDownThreshold')">
          <el-input-number v-model="form.down_threshold" :min="0" :step="30" />
        </el-form-item>
        <el-form-item :label="T('ProcessAlertRule')">
          <el-select v-model="form.alert_config_id" clearable :placeholder="T('ProcessAlertRuleTip')">
            <el-option v-for="a in alertConfigs" :key="a.row_id" :label="a.name" :value="a.row_id" />
          </el-select>
        </el-form-item>
        <el-form-item :label="T('ProcessEnabled')">
          <el-switch v-model="form.enabledBool" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">{{ T('ProcessCancel') }}</el-button>
        <el-button type="primary" :loading="saving" @click="save">{{ T('ProcessSave') }}</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  processRules, createProcessRule, updateProcessRule, deleteProcessRule, processStatus, alertConfigList,
  batchCreateProcessRule, processPeerSources,
} from '@/api/process'
import { T } from '@/utils/i18n'

const rules = ref([])
const loading = ref(false)
const statusList = ref([])
const statusLoading = ref(false)
const filterPeer = ref('')
const alertConfigs = ref([])
const dialogVisible = ref(false)
const dialogTitle = ref('')
const saving = ref(false)
const editing = ref(false)
const form = ref({
  row_id: 0, peer_id: '', name: '', type: 'process', target: '',
  interval: 30, down_threshold: 300, alert_config_id: null, enabledBool: true,
})
// 批量配置来源
const sourceType = ref('peers') // peers | device_group | ab_tags
const deviceGroups = ref([])
const abTags = ref([])
const selectedGroupId = ref(null)
const selectedTags = ref([])

const loadRules = async () => {
  loading.value = true
  const res = await processRules().catch(e => { ElMessage.error(e?.message || T('OperationFailed')); return false })
  loading.value = false
  if (res) rules.value = res.data.list || []
}
const loadStatus = async () => {
  statusLoading.value = true
  const res = await processStatus({ peer_id: filterPeer.value }).catch(e => { ElMessage.error(e?.message || T('OperationFailed')); return false })
  statusLoading.value = false
  if (res) statusList.value = res.data.list || []
}
const loadAlertConfigs = async () => {
  const res = await alertConfigList().catch(() => false)
  if (res) alertConfigs.value = res.data.list || []
}
const loadPeerSources = async () => {
  const res = await processPeerSources().catch(() => false)
  if (res) {
    deviceGroups.value = res.data.device_groups || []
    abTags.value = res.data.ab_tags || []
  }
}
const onSourceTypeChange = () => {
  if ((sourceType.value === 'device_group' && !deviceGroups.value.length) ||
      (sourceType.value === 'ab_tags' && !abTags.value.length)) {
    loadPeerSources()
  }
}
const openCreate = () => {
  editing.value = false
  dialogTitle.value = T('ProcessAdd')
  form.value = { row_id: 0, peer_id: '', name: '', type: 'process', target: '', interval: 30, down_threshold: 300, alert_config_id: null, enabledBool: true }
  sourceType.value = 'peers'
  selectedGroupId.value = null
  selectedTags.value = []
  loadPeerSources()
  dialogVisible.value = true
}
const openEdit = (row) => {
  editing.value = true
  dialogTitle.value = T('ProcessEdit')
  form.value = {
    row_id: row.row_id, peer_id: row.peer_id, name: row.name, type: row.type, target: row.target,
    interval: row.interval, down_threshold: row.down_threshold, alert_config_id: row.alert_config_id || null, enabledBool: row.enabled === 1,
  }
  dialogVisible.value = true
}
const save = async () => {
  if (!form.value.target) { ElMessage.warning(T('ProcessTargetTip')); return }
  // 新增 + 批量来源（设备组 / 地址簿标签）
  if (!editing.value && sourceType.value !== 'peers') {
    if (sourceType.value === 'device_group' && !selectedGroupId.value) { ElMessage.warning(T('ProcessSelectDeviceGroup')); return }
    if (sourceType.value === 'ab_tags' && !selectedTags.value.length) { ElMessage.warning(T('ProcessSelectAbTags')); return }
    saving.value = true
    const payload = {
      source_type: sourceType.value,
      group_id: sourceType.value === 'device_group' ? selectedGroupId.value : 0,
      tags: sourceType.value === 'ab_tags' ? selectedTags.value : [],
      name: form.value.name, type: form.value.type, target: form.value.target,
      interval: form.value.interval, down_threshold: form.value.down_threshold,
      alert_config_id: form.value.alert_config_id || 0, enabled: form.value.enabledBool ? 1 : 0,
    }
    const res = await batchCreateProcessRule(payload).catch(e => { ElMessage.error(e?.message || T('OperationFailed')); return false })
    saving.value = false
    if (res) {
      const d = res.data || {}
      ElMessage.success(T('ProcessBatchResult', { created: d.created ?? 0, skipped: d.skipped ?? 0 }))
      dialogVisible.value = false
      loadRules()
    }
    return
  }
  // 单个新增 / 编辑
  if (!form.value.peer_id) { ElMessage.warning(T('ProcessPeerIdTip')); return }
  saving.value = true
  const payload = {
    peer_id: form.value.peer_id, name: form.value.name, type: form.value.type, target: form.value.target,
    interval: form.value.interval, down_threshold: form.value.down_threshold,
    alert_config_id: form.value.alert_config_id || 0, enabled: form.value.enabledBool ? 1 : 0,
  }
  if (editing.value) payload.row_id = form.value.row_id
  const api = editing.value ? updateProcessRule : createProcessRule
  const res = await api(payload).catch(e => { ElMessage.error(e?.message || T('OperationFailed')); return false })
  saving.value = false
  if (res) { ElMessage.success(T('ProcessSaved')); dialogVisible.value = false; loadRules() }
}
const remove = (row) => {
  ElMessageBox.confirm(T('ProcessConfirmDelete'), T('ProcessTip'), { type: 'warning' }).then(async () => {
    const res = await deleteProcessRule({ id: row.row_id }).catch(e => { ElMessage.error(e?.message || T('OperationFailed')); return false })
    if (res) { ElMessage.success(T('ProcessDeleted')); loadRules() }
  }).catch(() => {})
}
const fmtTime = (ts) => {
  if (!ts) return '-'
  try { return new Date(ts * 1000).toLocaleString() } catch (e) { return '-' }
}

onMounted(() => { loadRules(); loadStatus(); loadAlertConfigs() })
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
</style>
