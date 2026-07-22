<template>
  <div>
    <el-card class="list-query query-card" shadow="hover">
      <el-form inline label-width="80px">
        <el-form-item>
          <el-button type="primary" @click="showCreate = true">{{ T('CreateInvitation') }}</el-button>
          <el-button type="success" @click="showBatchCreate = true">{{ T('BatchCreateInvitation') }}</el-button>
          <el-button type="info" @click="copyInviteLink" :disabled="!selectedCode">{{ T('CopyInviteLink') }}</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 批量生成邀请码对话框 -->
    <el-dialog :title="T('BatchCreateInvitation')" v-model="showBatchCreate" width="600px" @close="batchCreateForm.count = 10">
      <el-form :model="batchCreateForm" label-width="120px">
        <el-form-item :label="T('GenerateCount')">
          <el-input-number v-model="batchCreateForm.count" :min="1" :max="200" style="width:200px"/>
          <span style="margin-left:8px;color:#909399;">{{ T('GenerateCountPlaceholder') }}</span>
        </el-form-item>
        <el-form-item :label="T('ExpiredAt')">
          <el-date-picker v-model="batchCreateForm.expiredAtDate"
                          type="datetime"
                          :placeholder="T('ExpiredAtPlaceholder')"
                          value-format="x"
                          style="width:100%"/>
          <div style="margin-top:6px; display:flex; gap:4px; flex-wrap:wrap;">
            <el-button size="small" @click="batchSetExpiredAt(30)">1个月</el-button>
            <el-button size="small" @click="batchSetExpiredAt(90)">3个月</el-button>
            <el-button size="small" @click="batchSetExpiredAt(365)">1年</el-button>
            <el-button size="small" @click="batchSetExpiredAt(3650)">10年</el-button>
            <el-button size="small" @click="batchSetExpiredAt(-1)">永久</el-button>
          </div>
          <span class="el-form-item__tip">{{ T('DefaultExpire1Day') }}</span>
        </el-form-item>
        <el-form-item :label="T('UserExpiredAt')">
          <el-date-picker v-model="batchCreateForm.userExpiredAtDate"
                          type="datetime"
                          :placeholder="T('ExpiredAtPlaceholder')"
                          value-format="x"
                          style="width:100%"/>
          <div style="margin-top:6px; display:flex; gap:4px; flex-wrap:wrap;">
            <el-button size="small" @click="batchSetUserExpiredAt(30)">1个月</el-button>
            <el-button size="small" @click="batchSetUserExpiredAt(90)">3个月</el-button>
            <el-button size="small" @click="batchSetUserExpiredAt(365)">1年</el-button>
            <el-button size="small" @click="batchSetUserExpiredAt(3650)">10年</el-button>
            <el-button size="small" @click="batchSetUserExpiredAt(-1)">永久</el-button>
          </div>
          <span class="el-form-item__tip">{{ T('UserExpiredAtTip') }}</span>
        </el-form-item>
        <el-form-item :label="T('Remark')">
          <el-input v-model="batchCreateForm.remark" type="textarea" :rows="2"/>
        </el-form-item>
      </el-form>
      <!-- 生成结果展示 -->
      <div v-if="batchResult.length > 0" style="margin-top:12px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
          <strong>{{ T('GeneratedCodes') }}（{{ batchResult.length }}）</strong>
          <el-button size="small" type="primary" @click="copyAllCodes">{{ T('CopyAll') }}</el-button>
        </div>
        <div style="max-height:300px;overflow-y:auto;border:1px solid #ebeef5;border-radius:4px;padding:8px;">
          <el-tag v-for="item in batchResult" :key="item.code"
                  style="margin:3px;font-family:monospace;font-size:12px;" type="info">
            {{ item.code }}
          </el-tag>
        </div>
      </div>
      <template #footer>
        <el-button @click="showBatchCreate = false">{{ T('Cancel') }}</el-button>
        <el-button type="primary" @click="submitBatchCreate" :loading="batchLoading">{{ T('Submit') }}</el-button>
      </template>
    </el-dialog>

    <!-- 创建邀请码对话框 -->
    <el-dialog :title="T('CreateInvitation')" v-model="showCreate" width="500px">
      <el-form ref="createFormRef" :model="createForm" label-width="120px" :rules="createRules">
        <el-form-item :label="T('InviteCode')" prop="code">
          <el-input v-model="createForm.code" :placeholder="T('InviteCodePlaceholder')">
            <template #append>
              <el-button @click="generateCode">{{ T('AutoGenerate') }}</el-button>
            </template>
          </el-input>
        </el-form-item>
        <el-form-item :label="T('MaxUsers')">
          <el-input :model-value="1" disabled style="width:100%"/>
          <span class="el-form-item__tip">{{ T('MaxUsersFixedTip') }}</span>
        </el-form-item>
        <el-form-item :label="T('ExpiredAt')" prop="expired_at">
          <el-date-picker v-model="createForm.expiredAtDate"
                          type="datetime"
                          :placeholder="T('ExpiredAtPlaceholder')"
                          value-format="x"
                          style="width:100%"/>
          <div style="margin-top:6px; display:flex; gap:4px; flex-wrap:wrap;">
            <el-button size="small" @click="setExpiredAt(30)">1个月</el-button>
            <el-button size="small" @click="setExpiredAt(90)">3个月</el-button>
            <el-button size="small" @click="setExpiredAt(365)">1年</el-button>
            <el-button size="small" @click="setExpiredAt(3650)">10年</el-button>
            <el-button size="small" @click="setExpiredAt(-1)">永久</el-button>
          </div>
          <span class="el-form-item__tip">{{ T('DefaultExpire1Day') }}</span>
        </el-form-item>
        <el-form-item :label="T('UserExpiredAt')" prop="user_expired_at">
          <el-date-picker v-model="createForm.userExpiredAtDate"
                          type="datetime"
                          :placeholder="T('ExpiredAtPlaceholder')"
                          value-format="x"
                          style="width:100%"/>
          <div style="margin-top:6px; display:flex; gap:4px; flex-wrap:wrap;">
            <el-button size="small" @click="setUserExpiredAt(30)">1个月</el-button>
            <el-button size="small" @click="setUserExpiredAt(90)">3个月</el-button>
            <el-button size="small" @click="setUserExpiredAt(365)">1年</el-button>
            <el-button size="small" @click="setUserExpiredAt(3650)">10年</el-button>
            <el-button size="small" @click="setUserExpiredAt(-1)">永久</el-button>
          </div>
          <span class="el-form-item__tip">{{ T('UserExpiredAtTip') }}</span>
        </el-form-item>
        <el-form-item :label="T('Remark')" prop="remark">
          <el-input v-model="createForm.remark" type="textarea" :rows="2"/>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCreate = false">{{ T('Cancel') }}</el-button>
        <el-button type="primary" @click="submitCreate">{{ T('Submit') }}</el-button>
      </template>
    </el-dialog>

    <el-card class="list-body" shadow="hover">
      <el-table class="list-table" :data="list" v-loading="loading" border @selection-change="onSelectionChange">
        <el-table-column type="selection" width="55" align="center"/>
        <el-table-column prop="id" label="ID" align="center" width="80"/>
        <el-table-column prop="code" :label="T('InviteCode')" align="center" min-width="200">
          <template #default="{row}">
            <el-tag type="info" style="font-family: monospace; font-size: 13px;">{{ row.code }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column :label="T('UsageCount')" align="center" width="120">
          <template #default="{row}">
            {{ row.used_users }}<span v-if="row.max_users > 0"> / {{ row.max_users }}</span>
            <span v-else> / ∞</span>
          </template>
        </el-table-column>
        <el-table-column :label="T('Status')" align="center" width="120">
          <template #default="{row}">
            <el-tag v-if="isExpired(row)" type="danger">{{ T('Expired') }}</el-tag>
            <el-tag v-else-if="row.max_users > 0 && row.used_users >= row.max_users" type="warning">{{ T('UsedUp') }}</el-tag>
            <el-tag v-else type="success">{{ T('Active') }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="expired_at" :label="T('ExpiredAt')" align="center" width="180">
          <template #default="{row}">
            <span v-if="row.expired_at > 0">{{ formatTime(row.expired_at) }}</span>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column prop="remark" :label="T('Remark')" align="center" min-width="150"/>
        <el-table-column prop="created_at" :label="T('CreatedAt')" align="center" width="180">
          <template #default="{row}">
            {{ formatTime(row.created_at) }}
          </template>
        </el-table-column>
        <el-table-column :label="T('Actions')" align="center" width="200">
          <template #default="{row}">
            <el-button type="primary" size="small" @click="copySingleLink(row)">{{ T('CopyLink') }}</el-button>
            <el-button type="danger" size="small" @click="remove(row)">{{ T('Delete') }}</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
    <el-card class="list-page" shadow="hover">
      <el-pagination background
                     layout="prev, pager, next, sizes, jumper"
                     :page-sizes="[10,20,50,100]"
                     v-model:page-size="pageSize"
                     v-model:current-page="page"
                     :total="total">
      </el-pagination>
    </el-card>
  </div>
</template>

<script setup>
  import { ref, onMounted, watch, reactive } from 'vue'
  import { ElMessage, ElMessageBox } from 'element-plus'
  import { T } from '@/utils/i18n'
  import { invitationList, invitationCreate, invitationDelete, invitationBatchCreate } from '@/api/user'

  const showCreate = ref(false)
  const showBatchCreate = ref(false)
  const batchLoading = ref(false)
  const batchResult = ref([])
  const loading = ref(false)
  const list = ref([])
  const total = ref(0)
  const page = ref(1)
  const pageSize = ref(20)
  const selectedCode = ref('')
  const selectedRows = ref([])

  const baseUrl = window.location.origin + '/#'

  const createFormRef = ref(null)
  const createForm = reactive({
    code: '',
    max_users: 1,
    expiredAtDate: Date.now() + 86400000, // 默认1天后
    expired_at: 0,
    userExpiredAtDate: null, // 用户过期时间，默认永久
    user_expired_at: 0,
    remark: '',
  })
  const batchCreateForm = reactive({
    count: 10,
    expiredAtDate: Date.now() + 86400000, // 默认1天后
    userExpiredAtDate: null,
    remark: '',
  })
  const createRules = {
    // Code is optional - auto-generated if empty
  }

  const formatTime = (ts) => {
    if (!ts || ts <= 0) return '-'
    const d = new Date(ts * 1000)
    return d.toLocaleString()
  }

  const isExpired = (row) => {
    return row.expired_at > 0 && row.expired_at * 1000 < Date.now()
  }

  const getList = async () => {
    loading.value = true
    const res = await invitationList({ page: page.value, page_size: pageSize.value }).catch(_ => false)
    loading.value = false
    if (res && res.data) {
      list.value = res.data.list || []
      total.value = res.data.total || 0
    }
  }

  watch(() => page.value, getList)
  watch(() => pageSize.value, () => { page.value = 1; getList() })

  // 设置邀请码过期时间
  const setExpiredAt = (days) => {
    if (days < 0) {
      createForm.expiredAtDate = null
    } else {
      createForm.expiredAtDate = Date.now() + days * 86400000
    }
  }

  // 设置用户过期时间
  const setUserExpiredAt = (days) => {
    if (days < 0) {
      createForm.userExpiredAtDate = null
    } else {
      createForm.userExpiredAtDate = Date.now() + days * 86400000
    }
  }

  const generateCode = () => {
    const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
    let result = ''
    for (let i = 0; i < 32; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    createForm.code = result
  }

  const submitCreate = async () => {
    const v = await createFormRef.value.validate().catch(_ => false)
    if (!v) return
    const payload = {
      code: createForm.code,
      max_users: 1,
      expired_at: createForm.expiredAtDate ? Math.floor(createForm.expiredAtDate / 1000) : 0,
      user_expired_at: createForm.userExpiredAtDate ? Math.floor(createForm.userExpiredAtDate / 1000) : 0,
      remark: createForm.remark,
    }
    const res = await invitationCreate(payload).catch(_ => false)
    if (res && res.code === 0) {
      ElMessage.success(T('OperationSuccess'))
      showCreate.value = false
      createForm.code = ''
      createForm.max_users = 1
      createForm.expiredAtDate = Date.now() + 86400000
      createForm.userExpiredAtDate = null
      createForm.user_expired_at = 0
      createForm.remark = ''
      getList()
    }
  }

  const remove = async (row) => {
    const cf = await ElMessageBox.confirm(T('Confirm?', { param: T('Delete') }), {
      confirmButtonText: T('Confirm'),
      cancelButtonText: T('Cancel'),
      type: 'warning',
    }).catch(_ => false)
    if (!cf) return
    const res = await invitationDelete({ id: row.id }).catch(_ => false)
    if (res && res.code === 0) {
      ElMessage.success(T('OperationSuccess'))
      getList()
    }
  }

  const onSelectionChange = (rows) => {
    selectedRows.value = rows
    selectedCode.value = rows.length > 0 ? rows[0].code : ''
  }

  const copySingleLink = (row) => {
    const link = `${baseUrl}/register?invite_code=${row.code}`
    navigator.clipboard.writeText(link).then(() => {
      ElMessage.success(T('LinkCopied'))
    }).catch(() => {
      // Fallback
      const ta = document.createElement('textarea')
      ta.value = link
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      ElMessage.success(T('LinkCopied'))
    })
  }

  const copyInviteLink = () => {
    if (!selectedCode.value) return
    copySingleLink({ code: selectedCode.value })
  }

  // 批量生成
  const batchSetExpiredAt = (days) => {
    if (days < 0) {
      batchCreateForm.expiredAtDate = null
    } else {
      batchCreateForm.expiredAtDate = Date.now() + days * 86400000
    }
  }
  const batchSetUserExpiredAt = (days) => {
    if (days < 0) {
      batchCreateForm.userExpiredAtDate = null
    } else {
      batchCreateForm.userExpiredAtDate = Date.now() + days * 86400000
    }
  }
  const submitBatchCreate = async () => {
    batchLoading.value = true
    batchResult.value = []
    const payload = {
      count: batchCreateForm.count,
      expired_at: batchCreateForm.expiredAtDate ? Math.floor(batchCreateForm.expiredAtDate / 1000) : 0,
      user_expired_at: batchCreateForm.userExpiredAtDate ? Math.floor(batchCreateForm.userExpiredAtDate / 1000) : 0,
      remark: batchCreateForm.remark,
    }
    const res = await invitationBatchCreate(payload).catch(_ => false)
    batchLoading.value = false
    if (res && res.code === 0) {
      batchResult.value = res.data.list || []
      ElMessage.success(T('OperationSuccess'))
      getList()
    }
  }
  const copyAllCodes = () => {
    const codes = batchResult.value.map(item => item.code).join('\n')
    navigator.clipboard.writeText(codes).then(() => {
      ElMessage.success(T('AllCopied'))
    }).catch(() => {
      const ta = document.createElement('textarea')
      ta.value = codes
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      ElMessage.success(T('AllCopied'))
    })
  }

  onMounted(getList)
</script>

<style scoped>
</style>
