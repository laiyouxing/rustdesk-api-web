<template>
  <div>
    <el-card class="simple-card" shadow="hover" v-loading="loading">
      <template #header>
        <div class="card-header">
          <span>保留策略</span>
        </div>
      </template>

      <el-alert type="info" :closable="false" show-icon style="margin-bottom: 16px"
                title="这里配置的值保存后立即生效，无需重启服务。优先级：此处设置 > config.yaml > 内置默认值。"/>

      <el-form :model="form" label-width="140px" style="max-width: 720px;">
        <el-form-item label="日志保留天数">
          <el-input-number v-model="form.log_max_days" :min="1" :max="3650"/>
          <span class="hint">天（按天轮转，每天一个文件，超过即删除）</span>
        </el-form-item>
        <el-form-item label="审计记录保留天数">
          <el-input-number v-model="form.audit_retention_days" :min="1" :max="3650"/>
          <span class="hint">天（连接日志 / 文件传输日志 / 直连上报）</span>
        </el-form-item>
        <el-form-item label="立即清理一次">
          <el-checkbox v-model="form.run_now">保存后立刻按新策略清理审计记录</el-checkbox>
          <div class="hint block">
            勾选会立即执行一次删除，**真实删除**超过新保留天数的记录，不可恢复。
            不勾选则等下一次巡检（最多 12 小时）自动生效。
          </div>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="saving" @click="save">保存</el-button>
          <el-button @click="load">刷新</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card class="simple-card" shadow="hover" style="margin-top: 16px;">
      <template #header>
        <div class="card-header"><span>当前生效状态</span></div>
      </template>
      <el-descriptions :column="1" border style="max-width: 900px;">
        <el-descriptions-item label="日志保留天数">
          {{ info.log_days_in_effect || info.log_max_days }} 天
          <el-tag size="small" :type="sourceTagType(info.log_source)" style="margin-left: 8px;">
            {{ sourceText(info.log_source) }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="审计记录保留天数">
          {{ info.audit_retention_days }} 天
          <el-tag size="small" :type="sourceTagType(info.audit_source)" style="margin-left: 8px;">
            {{ sourceText(info.audit_source) }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="当前日志文件">
          <span style="word-break: break-all;">{{ info.log_file || '未配置文件日志（仅输出到 stdout）' }}</span>
        </el-descriptions-item>
      </el-descriptions>
    </el-card>
  </div>
</template>

<script setup>
  import { onActivated, onMounted, reactive, ref } from 'vue'
  import { ElMessage } from 'element-plus'
  import { retentionInfo, retentionUpdate } from '@/api/retention'

  const loading = ref(false)
  const saving = ref(false)
  const info = reactive({
    log_max_days: 30,
    audit_retention_days: 90,
    log_source: '',
    audit_source: '',
    log_file: '',
    log_days_in_effect: 0,
  })
  const form = reactive({
    log_max_days: 30,
    audit_retention_days: 90,
    run_now: false,
  })

  const sourceText = (s) => {
    if (s === 'database') return '来自后台设置'
    if (s === 'config') return '来自 config.yaml'
    return '内置默认值'
  }
  const sourceTagType = (s) => {
    if (s === 'database') return 'success'
    if (s === 'config') return 'warning'
    return 'info'
  }

  const load = async () => {
    loading.value = true
    const res = await retentionInfo().catch(_ => false)
    loading.value = false
    if (res) {
      Object.assign(info, res.data)
      form.log_max_days = res.data.log_days_in_effect || res.data.log_max_days
      form.audit_retention_days = res.data.audit_retention_days
      form.run_now = false
    }
  }

  const save = async () => {
    saving.value = true
    const res = await retentionUpdate({
      log_max_days: form.log_max_days,
      audit_retention_days: form.audit_retention_days,
      run_now: form.run_now,
    }).catch(e => {
      ElMessage.error((e && e.message) || '保存失败')
      return false
    })
    saving.value = false
    if (res) {
      ElMessage.success(form.run_now ? '已保存，并已开始按新策略清理' : '已保存，日志立即生效')
      load()
    }
  }

  onMounted(load)
  onActivated(load)
</script>

<style scoped lang="scss">
  .hint {
    margin-left: 8px;
    font-size: 12px;
    color: #999;
  }
  .hint.block {
    display: block;
    margin-left: 0;
    margin-top: 4px;
    line-height: 1.6;
  }
</style>
