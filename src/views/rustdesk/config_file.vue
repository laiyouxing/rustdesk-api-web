<template>
  <div>
    <el-card shadow="hover">
      <template #header>
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span>{{ T('ConfigFile') }}</span>
          <div>
            <el-button size="small" @click="reset" :disabled="loading">{{ T('Reset') }}</el-button>
            <el-button size="small" type="primary" @click="save" :loading="saving">{{ T('Save') }}</el-button>
          </div>
        </div>
      </template>

      <el-alert type="warning" :closable="false" show-icon style="margin-bottom: 12px" :title="T('ConfigFileTip')" />

      <el-form label-width="110px" style="margin-bottom: 12px;">
        <el-form-item :label="T('ConfigFilePath')">
          <el-input :model-value="path" readonly />
        </el-form-item>
      </el-form>

      <el-input
        v-model="content"
        type="textarea"
        :rows="26"
        :disabled="loading"
        style="font-family: monospace; font-size: 13px;"
        placeholder="yaml"
      />

      <el-divider />

      <div style="display: flex; justify-content: space-between; align-items: center;">
        <span style="color: #909399; font-size: 13px;">{{ T('ServiceRestartTip') }}</span>
        <el-button type="danger" :loading="restarting" @click="restartService">
          <el-icon v-if="!restarting"><RefreshRight /></el-icon>
          {{ T('RestartService') }}
        </el-button>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { T } from '@/utils/i18n'
import { ElMessage, ElMessageBox } from 'element-plus'
import { RefreshRight } from '@element-plus/icons-vue'
import { fileGet, fileUpdate, serviceRestart } from '@/api/config'

const content = ref('')
const path = ref('')
const loading = ref(false)
const saving = ref(false)
const restarting = ref(false)

const fetchConfig = async () => {
  loading.value = true
  const res = await fileGet().catch(_ => false)
  loading.value = false
  if (res && res.data) {
    content.value = res.data.content || ''
    path.value = res.data.path || ''
  }
}

const reset = () => {
  fetchConfig()
}

const save = async () => {
  if (!content.value) {
    ElMessage.warning('配置内容不能为空')
    return
  }
  saving.value = true
  const res = await fileUpdate(content.value).catch(_ => false)
  saving.value = false
  if (res) {
    ElMessage.success(T('OperationSuccess'))
  }
}

const restartService = async () => {
  const cf = await ElMessageBox.confirm(
    T('Confirm?', { param: T('RestartService') }),
    { type: 'warning', confirmButtonText: T('Confirm'), cancelButtonText: T('Cancel') }
  ).catch(_ => false)
  if (!cf) return
  restarting.value = true
  const res = await serviceRestart().catch(_ => false)
  if (res) {
    ElMessage.success(T('ServiceRestarting'))
    // 服务即将重启，给予提示后刷新页面以重新建立连接
    setTimeout(() => window.location.reload(), 3000)
  } else {
    restarting.value = false
  }
}

onMounted(() => {
  fetchConfig()
})
</script>
