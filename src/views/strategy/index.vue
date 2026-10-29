<template>
  <div>

    <!-- 全局强制中继开关：一键控制所有客户端是否允许 P2P 直连 -->
    <el-card class="list-query" shadow="hover" style="margin-bottom: 16px;">
      <div style="display: flex; align-items: center; gap: 16px; flex-wrap: wrap;">
        <span style="font-size: 16px; font-weight: 500;">强制所有客户端走中继</span>
        <el-switch v-model="forceRelayOn" :loading="forceRelaySaving" @change="toggleForceRelay"/>
        <el-tag v-if="forceRelayOn" type="warning" size="small">已开启：禁止 P2P 直连</el-tag>
        <el-tag v-else type="success" size="small">已关闭：允许直连</el-tag>
      </div>
      <div style="font-size: 12px; color: #999; margin-top: 8px; line-height: 1.7;">
        开启后自动维护一条全局策略 <code>force-always-relay=Y</code>，所有客户端下次连接强制走中继
        （不走中继前打洞、也不做 Phase3 换流）。关闭时写 <code>N</code> 而**不是**删除策略——
        删除后心跳不再下发该策略，客户端会停留在上一次收到的 Y，等于关不掉。
        <br/>
        注意：若给个别用户/分组单独配了策略并显式设置了 <code>force-always-relay</code>，
        那些策略的绑定优先级更高，会覆盖此全局开关。
      </div>
    </el-card>

    <el-card class="list-query" shadow="hover">
      <div class="action-bar">
        <span style="font-size: 16px; font-weight: 500;">策略管理</span>
        <el-button type="text" size="small" style="margin-left: 4px; font-size: 16px; color: var(--apple-blue);" @click="showHelp = true">?</el-button>
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
        <el-table-column prop="id" :label="T('ID')" width="60" align="center"></el-table-column>
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
        <el-table-column label="绑定范围" width="160" align="center">
          <template #default="{row}">
            <el-tag v-if="row.bind_type === 'user'" type="primary" size="small">用户</el-tag>
            <el-tag v-else-if="row.bind_type === 'group'" type="success" size="small">设备分组</el-tag>
            <el-tag v-else-if="row.bind_type === 'tag'" type="warning" size="small">标签</el-tag>
            <el-tag v-else type="info" size="small">全局</el-tag>
            <span style="margin-left: 4px; font-size: 12px;">{{ getBindName(row) }}</span>
          </template>
        </el-table-column>
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
          <span class="hint-text" style="font-size:12px;margin-left:8px;">数字越大优先级越高</span>
        </el-form-item>
        <el-form-item label="绑定范围" required>
          <el-radio-group v-model="form.bind_type">
            <el-radio label="user">用户</el-radio>
            <el-radio label="group">设备分组</el-radio>
            <el-radio label="tag">标签</el-radio>
            <el-radio label="global">全局</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item v-if="form.bind_type === 'user'" label="选择用户">
          <el-select v-model="form.bind_id" placeholder="选择用户" style="width: 300px" filterable>
            <el-option v-for="u in userListData" :key="u.id" :label="u.username + ' (' + (u.nickname || '') + ')'" :value="u.id"></el-option>
          </el-select>
        </el-form-item>
        <el-form-item v-if="form.bind_type === 'group'" label="选择分组">
          <el-select v-model="form.bind_id" placeholder="选择设备分组" style="width: 300px" filterable>
            <el-option v-for="g in groupListData" :key="g.id" :label="g.name" :value="g.id"></el-option>
          </el-select>
        </el-form-item>
        <el-form-item v-if="form.bind_type === 'tag'" label="选择标签">
          <el-select v-model="form.bind_id" placeholder="选择标签" style="width: 300px" filterable>
            <el-option v-for="t in tagListData" :key="t.id" :label="t.name" :value="t.id"></el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-switch v-model="form.status" :active-value="1" :inactive-value="2" />
        </el-form-item>
        <el-form-item label="配置项">
          <el-input v-model="form.config_items" type="textarea" :rows="10"
            placeholder="每行一个配置项，格式: key=value&#10;例如:&#10;force-always-relay=Y&#10;enable-udp-punch=N&#10;enable-clipboard=N&#10;custom-rendezvous-server=192.0.2.1:21116"
            style="width: 100%">
          </el-input>
          <div class="hint-text" style="font-size:12px;margin-top:4px;">
            常见配置项：force-always-relay、enable-udp-punch、enable-ipv6-punch、enable-clipboard、enable-audio、enable-file-transfer、custom-rendezvous-server
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
      <div style="font-size: 14px; line-height: 1.8; font-family: 'Consolas', 'Courier New', monospace; background: #f8f9fa; padding: 16px; border-radius: 6px;">
        <div style="color: #999; margin-bottom: 4px;"># ====== 网络穿透 ======</div>
        <div style="color: #999;"># 是否强制走中继，Y=强制走中继不走P2P打洞，N=允许P2P</div>
        <div style="margin-bottom: 4px;">force-always-relay=N</div>
        <div style="color: #999;"># 启用UDP打洞，N=关闭UDP打洞只走TCP中继</div>
        <div style="margin-bottom: 4px;">enable-udp-punch=Y</div>
        <div style="color: #999;"># 启用IPv6打洞，N=关闭IPv6穿透</div>
        <div style="margin-bottom: 4px;">enable-ipv6-punch=Y</div>
        <div style="color: #999;"># 启用UPnP自动端口映射，N=关闭</div>
        <div style="margin-bottom: 4px;">enable-upnp=Y</div>
        <div style="color: #999;"># 自定义中继服务器地址（当使用自有中继时填写）</div>
        <div style="color: #999;"># 格式: 域名或IP:端口</div>
        <div style="margin-bottom: 8px;">#custom-rendezvous-server=relay.example.com:21116</div>
        <div style="color: #999; margin-bottom: 4px;"># ====== 功能开关 ======</div>
        <div style="color: #999;"># 启用剪贴板共享，N=禁止远程复制粘贴</div>
        <div style="margin-bottom: 4px;">enable-clipboard=Y</div>
        <div style="color: #999;"># 启用音频传输，N=关闭远程声音</div>
        <div style="margin-bottom: 4px;">enable-audio=Y</div>
        <div style="color: #999;"># 启用文件传输，N=禁止远程传文件</div>
        <div style="margin-bottom: 4px;">enable-file-transfer=Y</div>
        <div style="color: #999;"># 加密方式，可选: default(默认)/no_encryption(不加密)/encrypted(强制加密)</div>
        <div style="margin-bottom: 8px;">#encryption-mode=default</div>
        <div style="color: #999; margin-bottom: 4px;"># ====== 显示与性能 ======</div>
        <div style="color: #999;"># 远程画面质量，可选: quality(优先画质)/balanced(均衡)/speed(优先流畅)</div>
        <div style="margin-bottom: 4px;">#image-quality=balanced</div>
        <div style="color: #999;"># 最大帧率限制，0=不限帧率</div>
        <div style="margin-bottom: 8px;">#max-fps=30</div>
        <div style="color: #999; margin-bottom: 4px;"># ====== 安全策略 ======</div>
        <div style="color: #999;"># 是否隐藏地址簿中的用户名，Y=只显示设备名不显示所属用户</div>
        <div style="margin-bottom: 4px;">#hide-username-on-card=N</div>
        <div style="color: #999;"># 是否启用直连验证，Y=直连时要求双方握手验证</div>
        <div style="margin-bottom: 4px;">#enable-directx-access=Y</div>
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
import { list as userList } from '@/api/user'
import { list as groupList } from '@/api/device_group'
import { list as tagList } from '@/api/tag'
import { onMounted, reactive, ref, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'

const bindNameMap = reactive({})
const getBindName = (row) => bindNameMap[row.id] || ''
const userListData = ref([])
const groupListData = ref([])
const tagListData = ref([])

const query = reactive({
  name: '',
})

const form = reactive({
  name: '',
  status: 1,
  priority: 0,
  bind_type: 'global',
  bind_id: 0,
  config_items: '',
})

const showHelp = ref(false)
const editingId = ref(0)
const dialogVisible = ref(false)
const submitting = ref(false)
const formRef = ref(null)

// ===== 全局强制中继开关 =====
// 用一个固定名称的全局策略承载：开启写 Y、关闭写 N。
// 关键点：关闭时**不能删除策略**——心跳只在"找到启用的策略"时才下发，
// 删掉之后客户端会停留在上一次收到的 Y，表现为开关关不掉。
const FORCE_RELAY_STRATEGY_NAME = '系统策略-强制走中继'
const FORCE_RELAY_KEY = 'force-always-relay'

const forceRelayOn = ref(false)
const forceRelaySaving = ref(false)
let forceRelayStrategy = null

// 在 key=value 多行文本里设置某个键（不存在则追加），其余行原样保留
const setConfigItem = (items, key, value) => {
  const lines = (items || '').split('\n')
  let found = false
  const out = lines.map(line => {
    const t = line.trim()
    if (!t || t.startsWith('#')) return line
    const idx = t.indexOf('=')
    if (idx <= 0) return line
    const k = t.slice(0, idx).trim()
    // 兼容早期误写成 force_relay 的配置，统一改写成标准键
    if (k === key || (key === FORCE_RELAY_KEY && k === 'force_relay')) {
      found = true
      return `${key}=${value}`
    }
    return line
  })
  if (!found) out.push(`${key}=${value}`)
  return out.join('\n').replace(/\n+$/, '')
}

const readForceRelay = (items) => {
  for (const line of (items || '').split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const idx = t.indexOf('=')
    if (idx <= 0) continue
    const k = t.slice(0, idx).trim()
    if (k === FORCE_RELAY_KEY || k === 'force_relay') {
      return t.slice(idx + 1).trim().toUpperCase() === 'Y'
    }
  }
  return false
}

const loadForceRelay = async () => {
  // 注意：后端 /strategy/list 目前忽略 name 过滤参数，只能整表拉取后本地匹配。
  // 策略数量很少，page_size 取大值即可，避免依赖后端改动。
  const res = await list({ page: 1, page_size: 9999 }).catch(_ => false)
  if (!res) return
  forceRelayStrategy = (res.data.list || []).find(s => s.name === FORCE_RELAY_STRATEGY_NAME) || null
  forceRelayOn.value = forceRelayStrategy ? readForceRelay(forceRelayStrategy.config_items) : false
}

const toggleForceRelay = async (val) => {
  forceRelaySaving.value = true
  try {
    const items = setConfigItem(
      forceRelayStrategy ? forceRelayStrategy.config_items : '',
      FORCE_RELAY_KEY,
      val ? 'Y' : 'N',
    )
    const data = {
      name: FORCE_RELAY_STRATEGY_NAME,
      status: 1,
      // 全局策略里取最高优先级，避免被其它全局策略按数值优先级盖掉
      priority: 999,
      bind_type: 'global',
      bind_id: 0,
      config_items: items,
    }
    let res
    if (forceRelayStrategy) {
      data.id = forceRelayStrategy.id
      res = await update(data).catch(e => {
        ElMessage.error((e && e.message) || '操作失败')
        return false
      })
    } else {
      res = await create(data).catch(e => {
        ElMessage.error((e && e.message) || '操作失败')
        return false
      })
    }
    if (res) {
      ElMessage.success(val ? '已开启：所有客户端将强制走中继' : '已关闭：允许客户端直连')
      await loadForceRelay()
      getList()
    } else {
      // 失败回滚开关状态，避免 UI 与实际配置不一致
      forceRelayOn.value = !val
    }
  } finally {
    forceRelaySaving.value = false
  }
}

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
    form.bind_type = row.bind_type || 'global'
    form.bind_id = row.bind_id || 0
    form.config_items = row.config_items
  } else {
    editingId.value = 0
    form.name = ''
    form.status = 1
    form.priority = 0
    form.bind_type = 'global'
    form.bind_id = 0
    form.config_items = ''
  }
  dialogVisible.value = true
}

const resetForm = () => {
  form.name = ''
  form.status = 1
  form.priority = 0
  form.bind_type = 'global'
  form.bind_id = 0
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
    // 填充绑定名称映射（在表格中显示）
    for (const row of res.data.list) {
      let name = ''
      if (row.bind_type === 'user') {
        const u = userListData.value.find(u => u.id === row.bind_id)
        name = u ? u.username : ''
      } else if (row.bind_type === 'group') {
        const g = groupListData.value.find(g => g.id === row.bind_id)
        name = g ? g.name : ''
      } else if (row.bind_type === 'tag') {
        const t = tagListData.value.find(t => t.id === row.bind_id)
        name = t ? t.name : ''
      }
      bindNameMap[row.id] = name
    }
  }
}
onMounted(async () => {
  getList()
  loadForceRelay()
  // 预加载用户、分组、标签列表
  const [uRes, gRes, tRes] = await Promise.all([
    userList({ page_size: 9999 }).catch(() => ({ data: { list: [] } })),
    groupList({ page_size: 9999 }).catch(() => ({ data: { list: [] } })),
    tagList({ page_size: 9999 }).catch(() => ({ data: { list: [] } })),
  ])
  userListData.value = uRes.data.list || []
  groupListData.value = gRes.data.list || []
  tagListData.value = tRes.data.list || []
})

const del = async (row) => {
  const cf = await ElMessageBox.confirm(`确定删除策略「${row.name}」？`, '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning',
  }).catch(_ => false)
  if (!cf) return false
  const res = await remove({ id: row.id }).catch(_ => false)
  if (res) {
    // 清除缓存的名字
    delete bindNameMap[row.id]
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
