<template>
  <div>
    <el-card shadow="hover">
      <template #header>
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span>{{ T('StunConfig') }}</span>
          <el-button type="primary" size="small" @click="showForm()">{{ T('Add') }}</el-button>
        </div>
      </template>
      <el-table :data="list" v-loading="loading" border>
        <el-table-column prop="host" label="地址" min-width="200">
          <template #default="{row}">{{ row.host }}:{{ row.port }}</template>
        </el-table-column>
        <el-table-column prop="sort" :label="T('Priority')" width="80" align="center"></el-table-column>
        <el-table-column prop="remark" :label="T('Remark')" min-width="120"></el-table-column>
        <el-table-column :label="T('Status')" width="80" align="center">
          <template #default="{row}">
            <el-tag :type="row.enabled === 1 ? 'success' : 'danger'" size="small">
              {{ row.enabled === 1 ? T('Enable') : T('Disable') }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column :label="T('Actions')" width="200" align="center">
          <template #default="{row}">
            <el-button size="small" @click="testServer(row)">测试</el-button>
            <el-button size="small" @click="showForm(row)">{{ T('Edit') }}</el-button>
            <el-button size="small" type="danger" @click="del(row)">{{ T('Delete') }}</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="formVisible" :title="editId ? T('Edit') : T('Add')" width="500px">
      <el-form label-width="100px">
        <el-form-item label="地址">
          <el-input v-model="form.host" placeholder="stun.l.google.com"></el-input>
        </el-form-item>
        <el-form-item label="端口">
          <el-input-number v-model="form.port" :min="1" :max="65535"></el-input-number>
        </el-form-item>
        <el-form-item :label="T('Priority')">
          <el-input-number v-model="form.sort" :min="0"></el-input-number>
        </el-form-item>
        <el-form-item :label="T('Remark')">
          <el-input v-model="form.remark"></el-input>
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

    <el-dialog v-model="testVisible" title="STUN 测试结果" width="450px">
      <div v-if="testResult">
        <el-result :status="testResult.ok ? 'success' : 'error'" :title="testResult.ok ? '连接成功' : '连接失败'">
          <template #extra>
            <div style="text-align: left; line-height: 2;">
              <div>服务器: {{ testResult.server }}</div>
              <div>映射地址: {{ testResult.mapped_ip }}:{{ testResult.mapped_port }}</div>
              <div>响应时间: {{ testResult.response_ms }}ms</div>
            </div>
          </template>
        </el-result>
      </div>
      <div v-else style="text-align:center;padding:30px;color:#909399;">测试中...</div>
      <template #footer>
        <el-button @click="testVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { T } from '@/utils/i18n'
import { ElMessage, ElMessageBox } from 'element-plus'
import request from '@/utils/request'

const list = ref([])
const loading = ref(false)
const formVisible = ref(false)
const editId = ref(0)
const testVisible = ref(false)
const testResult = ref(null)

const form = reactive({
  host: '',
  port: 3478,
  sort: 0,
  remark: '',
  enabled: 1,
})

const getList = async () => {
  loading.value = true
  const res = await request({ url: '/stun_server/list' }).catch(_ => false)
  loading.value = false
  if (res) list.value = res.data.list || []
}

const showForm = (row) => {
  editId.value = row?.row_id || 0
  if (row) {
    form.host = row.host
    form.port = row.port
    form.sort = row.sort
    form.remark = row.remark || ''
    form.enabled = row.enabled
  } else {
    form.host = ''
    form.port = 3478
    form.sort = 0
    form.remark = ''
    form.enabled = 1
  }
  formVisible.value = true
}

const submit = async () => {
  const data = { ...form }
  if (editId.value) data.row_id = editId.value
  const api = editId.value ? request({ url: '/stun_server/update', method: 'post', data }) : request({ url: '/stun_server/create', method: 'post', data })
  const res = await api.catch(_ => false)
  if (res) {
    ElMessage.success(T('OperationSuccess'))
    formVisible.value = false
    getList()
  }
}

const del = async (row) => {
  const cf = await ElMessageBox.confirm(T('Confirm?', { param: T('Delete') }), { type: 'warning' }).catch(_ => false)
  if (!cf) return
  const res = await request({ url: '/stun_server/delete', method: 'post', data: { id: row.row_id } }).catch(_ => false)
  if (res) {
    ElMessage.success(T('OperationSuccess'))
    getList()
  }
}

const testServer = async (row) => {
  testResult.value = null
  testVisible.value = true
  const res = await request({ url: '/stun_server/test', method: 'post', data: { host: row.host, port: row.port } }).catch(_ => false)
  if (res) {
    testResult.value = { ok: true, ...res.data }
  } else {
    testResult.value = { ok: false, server: `${row.host}:${row.port}`, mapped_ip: '-', mapped_port: '-', response_ms: '-' }
  }
}

onMounted(getList)
</script>
