<template>
  <div>

    <el-card class="list-query" shadow="hover">
      <div class="action-bar">
        <span style="font-size: 16px; font-weight: 500;">策略管理</span>
        <el-button type="text" size="small" style="margin-left: 4px; font-size: 16px; color: #409eff;" @click="showHelp = true">?</el-button>
        <el-button type="primary" size="small" style="float: right;" @click="showEdit(null)">新建策略</el-button>
      </div>
      <el-form inline label-width="80px">
        <el-form-item label="策略名称">
          <el-input v-model="query.name" placeholder="搜索策略名称" clearable style="width: 200px"></el-input>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="getList">搜索</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card class="list-body" shadow="hover" style="margin-top: 16px;">
      <el-table :data="listRes.list" v-loading="listRes.loading" border>
        <el-table-column prop="id" label="ID" width="60" align="center"></el-table-column>
        <el-table-column prop="name" label="策略名称" width="160" align="center">
          <template #default="{row}">
            <strong>{{ row.name }}</strong>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="80" align="center">
          <template #default="{row}">
            <el-tag v-if="row.status === 1" type="success" size="small">启用</el-tag>
            <el-tag v-else type="danger" size="small">禁用</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="priority" label="优先级" width="80" align="center"></el-table-column>
        <el-table-column label="操作" width="200" align="center" fixed="right">
          <template #default="{row}">
            <el-button type="primary" size="small" @click="showEdit(row)">编辑</el-button>
            <el-button type="danger" size="small" @click="del(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-pagination
        v-if="listRes.total > 0"
        background
        layout="prev, pager, next"
        :total="listRes.total"
        :page-size="listQuery.page_size"
        v-model:current-page="listQuery.page"
        @current-change="getList"
      />
    </el-card>

    <!-- Edit Dialog -->
    <el-dialog v-model="dialogVisible" :title="editingId ? '编辑策略' : '新建策略'" width="700px" @close="resetForm">
      <el-form ref="formRef" :model="form" label-width="100px">
        <el-form-item label="策略名称" required>
          <el-input v-model="form.name" placeholder="例: 办公网络策略" style="width: 400px"></el-input>
        </el-form-item>
        <el-form-item label="优先级">
          <el-input-number v-model="form.priority" :min="0" :max="999" />
          <span style="font-size: 12px; color: #909399; margin-left: 8px;">数字越大优先级越高</span>
        </el-form-item>
        <el-form-item label="状态">
          <el-switch v-model="form.status" :active-value="1" :inactive-value="2" />
        </el-form-item>
        <el-form-item label="配置项">
          <el-input v-model="form.config_items" type="textarea" :rows="10"
            placeholder="每行一个配置项，格式: key=value&#10;例如:&#10;force_relay=Y&#10;enable-udp-punch=N&#10;enable-clipboard=N&#10;custom-rendezvous-server=192.168.1.100:21116"
            style="width: 100%">
          </el-input>
          <div style="font-size: 12px; color: #909399; margin-top: 4px;">
            常见配置项：force_relay、enable-udp-punch、enable-ipv6-punch、enable-clipboard、enable-audio、enable-file-transfer、custom-rendezvous-server
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitForm">保存</el-button>
      </template>
    </el-dialog>

    <!-- Help Dialog -->
    <el-dialog v-model="showHelp" title="策略配置项模板" width="650px">
      <div style="font-size: 14px; line-height: 1.8; white-space: pre-wrap; font-family: 'Consolas', 'Courier New', monospace; background: #f8f9fa; padding: 16px; border-radius: 6px;">
        <span style="color: #999;"># ====== 网络穿透 ======</span>
        <span style="display: block;">
<span style="color: #999;"># 是否强制走中继，Y=强制走中继不走P2P打洞，N=允许P2P</span>
force_relay=N
        </span>
        <span style="display: block;">
<span style="color: #999;"># 启用UDP打洞，N=关闭UDP打洞只走TCP中继</span>
enable-udp-punch=Y
        </span>
        <span style="display: block;">
<span style="color: #999;"># 启用IPv6打洞，N=关闭IPv6穿透</span>
enable-ipv6-punch=Y
        </span>
        <span style="display: block;">
<span style="color: #999;"># 启用UPnP自动端口映射，N=关闭</span>
enable-upnp=Y
        </span>
        <span style="display: block;">
<span style="color: #999;"># 自定义中继服务器地址（当使用自有中继时填写）</span>
<span style="color: #999;"># 格式: 域名或IP:端口</span>
#custom-rendezvous-server=relay.example.com:21116
        </span>
        <br>
        <span style="color: #999;"># ====== 功能开关 ======</span>
        <span style="display: block;">
<span style="color: #999;"># 启用剪贴板共享，N=禁止远程复制粘贴</span>
enable-clipboard=Y
        </span>
        <span style="display: block;">
<span style="color: #999;"># 启用音频传输，N=关闭远程声音</span>
enable-audio=Y
        </span>
        <span style="display: block;">
<span style="color: #999;"># 启用文件传输，N=禁止远程传文件</span>
enable-file-transfer=Y
        </span>
        <span style="display: block;">
<span style="color: #999;"># 加密方式，可选: default(默认)/no_encryption(不加密)/encrypted(强制加密)</span>
#encryption-mode=default
        </span>
        <br>
        <span style="color: #999;"># ====== 显示与性能 ======</span>
        <span style="display: block;">
<span style="color: #999;"># 远程画面质量，可选: quality(优先画质)/balanced(均衡)/speed(优先流畅)</span>
#image-quality=balanced
        </span>
        <span style="display: block;">
<span style="color: #999;"># 最大帧率限制，0=不限帧率</span>
#max-fps=30
        </span>
        <br>
        <span style="color: #999;"># ====== 安全策略 ======</span>
        <span style="display: block;">
<span style="color: #999;"># 是否隐藏地址簿中的用户名，Y=只显示设备名不显示所属用户</span>
#hide-username-on-card=N
        </span>
        <span style="display: block;">
<span style="color: #999;"># 是否启用直连验证，Y=直连时要求双方握手验证</span>
#enable-directx-access=Y
        </span>
      </div>
      <div style="font-size: 12px; color: #999; margin-top: 12px; text-align: center;">
        提示：以 # 开头的行是注释，不会生效。取消注释（去掉 #）即可启用对应配置项。
      </div>
      <template #footer>
        <el-button type="primary" @click="showHelp = false">知道了</el-button>
      </template>
    </el-dialog>

  </div>
</template>

<script setup>
import { list, create, update, remove } from '@/api/strategy'
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'

const query = reactive({
  name: '',
})

const form = reactive({
  name: '',
  status: 1,
  priority: 0,
  config_items: '',
})

const showHelp = ref(false)
const editingId = ref(0)
const dialogVisible = ref(false)
const submitting = ref(false)
const formRef = ref(null)

const submitForm = async () => {
  if (!form.name) {
    ElMessage.error('策略名称不能为空')
    return
  }
  submitting.value = true
  const data = { ...form }
  if (editingId.value > 0) {
    data.id = editingId.value
  }
  const api = editingId.value > 0 ? update : create
  const res = await api(data).catch(e => {
    ElMessage.error((e && e.message) || '操作失败')
    return false
  })
  submitting.value = false
  if (res) {
    ElMessage.success('操作成功')
    dialogVisible.value = false
    getList()
  }
}

const showEdit = (row) => {
  if (row) {
    editingId.value = row.id
    form.name = row.name
    form.status = row.status
    form.priority = row.priority
    form.config_items = row.config_items
  } else {
    editingId.value = 0
    form.name = ''
    form.status = 1
    form.priority = 0
    form.config_items = ''
  }
  dialogVisible.value = true
}

const resetForm = () => {
  form.name = ''
  form.status = 1
  form.priority = 0
  form.config_items = ''
  editingId.value = 0
}

const listRes = reactive({
  list: [], total: 0, loading: false,
})
const listQuery = reactive({
  page: 1,
  page_size: 10,
})
const getList = async () => {
  listRes.loading = true
  const res = await list(listQuery).catch(_ => false)
  listRes.loading = false
  if (res) {
    listRes.list = res.data.list
    listRes.total = res.data.total
  }
}
onMounted(getList)

const del = async (row) => {
  const cf = await ElMessageBox.confirm(`确定删除策略「${row.name}」？`, '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning',
  }).catch(_ => false)
  if (!cf) return false
  const res = await remove({ id: row.id }).catch(_ => false)
  if (res) {
    ElMessage.success('删除成功')
    getList()
  }
}
</script>

<style scoped lang="scss">
.action-bar {
  margin-bottom: 12px;
}
</style>
