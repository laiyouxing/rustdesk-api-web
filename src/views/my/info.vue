<template>
  <div>
    <el-card :title="T('Userinfo')" shadow="hover">
      <el-form class="info-form" ref="form" label-width="120px" label-suffix="：">
        <el-form-item :label="T('Username')">
          <div>{{ userStore.username }}</div>
        </el-form-item>
        <el-form-item :label="T('Email')">
          <div>{{ userStore.email }}</div>
        </el-form-item>
        <el-form-item :label="T('Password')" prop="password">
          <el-button type="danger" @click="showChangePwd">{{ T('ChangePassword') }}</el-button>
        </el-form-item>
        <el-form-item label="OIDC">
          <el-table :data="oidcData" border fit>
            <el-table-column :label="T('IdP')" prop="op" align="center"></el-table-column>
            <el-table-column :label="T('Status')" prop="status" align="center">
              <template #default="{ row }">
                <el-tag v-if="row.status === 1" type="success">{{ T('HasBind') }}</el-tag>
                <el-tag v-else type="danger">{{ T('NoBind') }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column :label="T('Actions')" align="center" width="200">
              <template #default="{ row }">
                <el-button v-if="row.status === 1" type="danger" size="small" @click="toUnBind(row)">{{ T('UnBind') }}</el-button>
                <el-button v-else type="success" size="small" @click="toBind(row)">{{ T('ToBind') }}</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-form-item>
      </el-form>
    </el-card>
    <el-card shadow="hover" style="margin-top: 20px">
      <template #header>
        <span>{{ T('MfaTitle') }}</span>
      </template>
      <el-form label-width="120px" label-suffix="：">
        <el-form-item :label="T('Status')">
          <el-tag v-if="mfaEnabled" type="success">{{ T('MfaEnabled') }}</el-tag>
          <el-tag v-else type="info">{{ T('MfaDisabled') }}</el-tag>
        </el-form-item>
        <el-form-item>
          <el-button v-if="!mfaEnabled" type="primary" @click="openSetup">{{ T('MfaSetup') }}</el-button>
          <el-button v-else type="danger" @click="disableMfa">{{ T('MfaDisable') }}</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-dialog v-model="setupVisible" :title="T('MfaSetup')" width="480px">
      <div v-if="setupData">
        <p>{{ T('MfaScanTip') }}</p>
        <div style="text-align:center;margin:12px 0">
          <img v-if="setupData.qr" :src="setupData.qr" alt="qr" style="width:200px;height:200px" />
        </div>
        <el-form label-width="80px">
          <el-form-item :label="T('MfaSecret')">
            <el-input :model-value="setupData.secret" readonly>
              <template #append>
                <el-button @click="copySecret">{{ T('Copy') }}</el-button>
              </template>
            </el-input>
          </el-form-item>
          <el-form-item :label="T('MfaCode')">
            <el-input v-model="enableCode" />
          </el-form-item>
        </el-form>
      </div>
      <template #footer>
        <el-button @click="setupVisible = false">{{ T('Cancel') }}</el-button>
        <el-button type="primary" :loading="enabling" @click="enableMfa">{{ T('MfaEnable') }}</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="recoveryVisible" :title="T('MfaRecoveryCodes')" width="480px">
      <el-alert :title="T('MfaRecoveryTip')" type="warning" :closable="false" show-icon />
      <ul style="margin-top:12px;font-family:monospace;font-size:14px;line-height:1.8">
        <li v-for="(c, i) in recoveryCodes" :key="i">{{ c }}</li>
      </ul>
      <template #footer>
        <el-button type="primary" @click="recoveryVisible = false">{{ T('Confirm') }}</el-button>
      </template>
    </el-dialog>

    <el-card shadow="hover" style="margin-top: 20px">
      <div v-html="html"></div>
    </el-card>
    <changePwdDialog v-model:visible="changePwdVisible"></changePwdDialog>
  </div>
</template>

<script setup>
  import changePwdDialog from '@/components/changePwdDialog.vue'
  import { computed, ref } from 'vue'
  import { useUserStore } from '@/store/user'
  import { useAppStore } from '@/store/app'
  import { bind, unbind } from '@/api/oauth'
  import { myOauth, mfaSetup, mfaEnable, mfaDisable, mfaStatus } from '@/api/user'
  import { ElMessage, ElMessageBox } from 'element-plus'
  import { T } from '@/utils/i18n'
  import { marked } from 'marked'

  const appStore = useAppStore()
  const userStore = useUserStore()
  const changePwdVisible = ref(false)
  const showChangePwd = () => {
    changePwdVisible.value = true
  }
  const oidcData = ref([])
  const getMyOauth = async () => {
    const res = await myOauth().catch(_ => false)
    if (res) {
      oidcData.value = res.data
    }

  }
  getMyOauth()

  // ===================== MFA (TOTP) =====================
  const mfaEnabled = ref(false)
  const setupVisible = ref(false)
  const setupData = ref(null)
  const enableCode = ref('')
  const enabling = ref(false)
  const recoveryVisible = ref(false)
  const recoveryCodes = ref([])

  const loadMfaStatus = async () => {
    const res = await mfaStatus().catch(_ => false)
    if (res) {
      mfaEnabled.value = !!res.data.mfa_enabled
    }
  }
  loadMfaStatus()

  const openSetup = async () => {
    const res = await mfaSetup().catch(_ => false)
    if (res) {
      setupData.value = res.data
      enableCode.value = ''
      setupVisible.value = true
    }
  }
  const copySecret = async () => {
    try {
      await navigator.clipboard.writeText(setupData.value.secret)
      ElMessage.success(T('OperationSuccess'))
    } catch (e) {
      ElMessage.warning(setupData.value.secret)
    }
  }
  const enableMfa = async () => {
    if (!enableCode.value) {
      ElMessage.warning(T('MfaCodeRequired'))
      return
    }
    enabling.value = true
    const res = await mfaEnable({ code: enableCode.value }).catch(_ => false)
    enabling.value = false
    if (res) {
      recoveryCodes.value = res.data.recovery_codes || []
      setupVisible.value = false
      mfaEnabled.value = true
      recoveryVisible.value = true
      ElMessage.success(T('MfaEnabled'))
    }
  }
  const disableMfa = async () => {
    const cf = await ElMessageBox.prompt(T('MfaDisableConfirm'), T('MfaDisable'), {
      inputType: 'password',
      inputPlaceholder: T('Password'),
      confirmButtonText: T('Confirm'),
      cancelButtonText: T('Cancel'),
      type: 'warning',
    }).catch(_ => false)
    if (!cf) return
    const res = await mfaDisable({ password: cf.value }).catch(_ => false)
    if (res) {
      mfaEnabled.value = false
      ElMessage.success(T('MfaDisabled'))
    }
  }
  const toBind = async (row) => {
    const res = await bind({ op: row.op }).catch(_ => false)
    if (res) {
      const { code, url } = res.data
      window.open(url)
    }
  }
  const toUnBind = async (row) => {
    const cf = await ElMessageBox.confirm(T('Confirm?', { param: T('UnBind') }), {
      confirmButtonText: T('Confirm'),
      cancelButtonText: T('Cancel'),
      type: 'warning',
    }).catch(_ => false)
    if (!cf) {
      return false
    }
    const res = await unbind({ op: row.op }).catch(_ => false)
    if (res) {
      getMyOauth()
    }

  }

  const html = computed(_ => marked(appStore.setting.hello||''))

</script>

<style scoped lang="scss">
.info-form {
  width: 600px;
  margin: 0 auto;

}
</style>
