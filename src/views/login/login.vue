<template>
  <div class="login-container">
    <div class="login-card">
      <img src="@/assets/logo.png" alt="logo" class="login-logo"/>

      <el-form v-if="!disablePwd && step === 'pwd'" label-position="top" class="login-form">
        <el-form-item :label="T('Username')">
          <el-input v-model="form.username" type="username" class="login-input"></el-input>
        </el-form-item>

        <el-form-item :label="T('Password')">
          <el-input v-model="form.password" type="password" @keyup.enter.native="login" show-password
                    class="login-input"></el-input>
        </el-form-item>
        <el-form-item :label="T('Captcha')" v-if="captchaCode">
          <el-input v-model="form.captcha" @keyup.enter.native="login"  class="login-input captcha-input">
            <template #append>
              <img :src="captchaCode.b64" @click="loadCaptcha" class="captcha" alt="captcha"/>
            </template>
          </el-input>
        </el-form-item>
        <el-form-item>
          <el-button @click="login" type="primary" class="login-button">{{ T('Login') }}</el-button>
          <el-button v-if="allowRegister" @click="register" class="login-button">{{ T('Register') }}</el-button>
        </el-form-item>
      </el-form>

      <el-form v-else-if="!disablePwd && step === 'mfa'" label-position="top" class="login-form">
        <el-alert :title="T('MfaVerifyTip')" type="warning" :closable="false" show-icon style="margin-bottom:12px" />
        <el-form-item :label="useRecovery ? T('MfaRecoveryCode') : T('MfaCode')">
          <el-input v-model="mfaInput" @keyup.enter.native="submitMfa" class="login-input"></el-input>
        </el-form-item>
        <el-form-item>
          <el-button @click="submitMfa" type="primary" class="login-button" :loading="mfaLoading">{{ T('MfaVerify') }}</el-button>
          <el-button @click="backToPwd" class="login-button">{{ T('Back') }}</el-button>
        </el-form-item>
        <el-button link type="primary" class="login-button" @click="useRecovery = !useRecovery">
          {{ useRecovery ? T('MfaUseCode') : T('MfaUseRecovery') }}
        </el-button>
      </el-form>

      <div class="divider" v-if="options.length > 0 && !disablePwd">
        <span>{{ T('or login in with') }}</span>
      </div>

      <div class="oidc-options">
        <div v-for="(option, index) in options" :key="index" class="oidc-option">
          <el-button @click="handleOIDCLogin(option.name)" class="oidc-btn">
            <img :src="getProviderImage(option.name)" alt="provider" class="oidc-icon"/>
            <span>{{ T(option.name) }}</span>
          </el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { reactive, onMounted, ref } from 'vue'
  import { useUserStore } from '@/store/user'
  import { useAppStore } from '@/store/app'
  import { ElMessage } from 'element-plus'
  import { T } from '@/utils/i18n'
  import { useRoute, useRouter } from 'vue-router'
  import { loginOptions, captcha, mfaLogin } from '@/api/login'
  import { getCode, removeCode } from '@/utils/auth'

  const oauthInfo = ref({})
  const userStore = useUserStore()
  const route = useRoute()
  const router = useRouter()
  const options = reactive([]) // 存储 OIDC 登录选项

  let platform = window.navigator.platform
  if (navigator.platform.indexOf('Mac') === 0) {
    platform = 'mac'
  } else if (navigator.platform.indexOf('Win') === 0) {
    platform = 'windows'
  } else if (navigator.platform.indexOf('Linux armv') === 0) {
    platform = 'android'
  } else if (navigator.platform.indexOf('Linux') === 0) {
    platform = 'linux'
  }
  const userAgent = navigator.userAgent
  let browser = 'Unknown Browser'
  if (/chrome|crios/i.test(userAgent)) browser = 'Chrome'
  else if (/firefox|fxios/i.test(userAgent)) browser = 'Firefox'
  else if (/safari/i.test(userAgent) && !/chrome/i.test(userAgent)) browser = 'Safari'
  else if (/edg/i.test(userAgent)) browser = 'Edge'

  const form = reactive({
    username: '',
    password: '',
    platform: platform,
    captcha: '',
    captcha_id: ''
  })

  const captchaCode = ref('')
  const redirect = route.query?.redirect
  const step = ref('pwd')
  const mfaToken = ref('')
  const mfaInput = ref('')
  const useRecovery = ref(false)
  const mfaLoading = ref(false)
  const login = async () => {
    const res = await userStore.login(form).catch(e => e)
    if (!res.code) {
      ElMessage.success(T('LoginSuccess'))
      router.push({ path: redirect || '/home', replace: true })
      return
    }
    if (res.code === 110) {
      // need captcha
      loadCaptcha()
    } else if (res.code === 113) {
      // need MFA second step
      mfaToken.value = res.data.mfa_token
      // 暂存到 sessionStorage，防止会话内重渲染/异常导致 mfa_token 丢失
      if (res.data.mfa_token) {
        sessionStorage.setItem('mfa_token', res.data.mfa_token)
      }
      step.value = 'mfa'
      mfaInput.value = ''
      useRecovery.value = false
    }
  }
  const submitMfa = async () => {
    if (!mfaInput.value) {
      ElMessage.warning(T('MfaCodeRequired'))
      return
    }
    // 兜底从 sessionStorage 读取，避免 mfa_token 在会话内丢失
    if (!mfaToken.value) {
      mfaToken.value = sessionStorage.getItem('mfa_token') || ''
    }
    mfaLoading.value = true
    const payload = { mfa_token: mfaToken.value }
    if (useRecovery.value) {
      payload.recovery_code = mfaInput.value
    } else {
      payload.code = mfaInput.value
    }
    const res = await mfaLogin(payload).catch(e => e)
    mfaLoading.value = false
    if (!res.code) {
      useAppStore().loadConfig()
      userStore.saveUserData(res.data)
      sessionStorage.removeItem('mfa_token')
      ElMessage.success(T('LoginSuccess'))
      router.push({ path: redirect || '/home', replace: true })
    }
  }
  const backToPwd = () => {
    step.value = 'pwd'
    mfaInput.value = ''
    useRecovery.value = false
  }

  const loadCaptcha = async () => {
    const captchaRes = await captcha().catch(_ => false)
    console.log(captchaRes)
    captchaCode.value = captchaRes.data.captcha
    form.captcha_id = captchaRes.data.captcha.id
  }

  const handleOIDCLogin = (provider) => {
    userStore.oidc(provider, platform, browser)
  }

  import googleImage from '@/assets/google.png'
  import githubImage from '@/assets/github.png'
  import oidcImage from '@/assets/oidc.png'
  import webauthImage from '@/assets/webauth.png'
  import defaultImage from '@/assets/oidc.png'

  const providerImageMap = {
    google: googleImage,
    github: githubImage,
    oidc: oidcImage,
    // WebAuth: webauthImage,
    default: defaultImage,
  }

  const getProviderImage = (provider) => {
    return providerImageMap[provider.toLowerCase()] || providerImageMap.default
  }

  const allowRegister = ref(false)
  const disablePwd = ref(false)
  const loadLoginOptions = async () => {
    try {
      const res = await loginOptions().catch(_ => false)
      if (!res || !res.data) return console.error('No valid response received')
      res.data.ops.map(option => (options.push({ name: option }))) // 创建新的对象数组
      if (res.data.auto_oidc) {
        // 如果有自动OIDC登录选项，直接调用第一个
        handleOIDCLogin(res.data.ops[0])
      }
      disablePwd.value = res.data.disable_pwd
      allowRegister.value = res.data.register
      if (res.data.need_captcha) {
        loadCaptcha()
      }
    } catch (error) {
      console.error('Error loading login options:', error.message)
    }
  }

  onMounted(async () => {
    const code = getCode()
    if (code) {
      // 如果code存在，进行query获取user info
      const res = await userStore.query(code)
      if (res) {
        // 删除code，确保跳转之前对code进行清楚
        removeCode()
        ElMessage.success(T('LoginSuccess'))
        router.push({ path: redirect || '/home', replace: true })
      }
    } else {
      // 如果code不存在, 现实登陆页面
      loadLoginOptions() // 组件挂载后调用登录选项加载函数
    }
  })

  const register = () => {
    router.push('/register')
  }
</script>

<style scoped lang="scss">
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  padding: 20px;
  box-sizing: border-box;
  background: linear-gradient(180deg, #fbfbfd 0%, #f5f5f7 100%);
}

html.dark .login-container {
  background: #1c1c1e;
}

.login-card {
  width: 380px;
  max-width: 90vw;
  background: #ffffff;
  padding: 44px 36px;
  border-radius: 18px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.1);
  text-align: center;
  border: 1px solid rgba(0, 0, 0, 0.04);
}

html.dark .login-card {
  background: #2c2c2e;
  border-color: rgba(255, 255, 255, 0.06);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5);
}

h1 {
  margin-bottom: 18px;
  font-size: 26px;
  font-weight: 600;
  color: #1d1d1f;
}

html.dark h1 {
  color: #f5f5f7;
}

.login-form {
  margin-bottom: 8px;
}

.login-input {
  width: 100%;

  .captcha {
    cursor: pointer;
    width: 150px;
    height: 38px;
  }
}

.captcha-input {
  :deep(.el-input-group__append) {
    border-radius: 8px;
    padding: 0;
    overflow: hidden;
  }
}

.login-button {
  width: 100%;
  height: 44px;
  margin-bottom: 12px;
  margin-left: 0;
  font-weight: 600;
  border-radius: 10px;
}

.divider {
  display: flex;
  align-items: center;
  margin: 18px 0;
  font-size: 13px;
  color: #8e8e93;

  &::before,
  &::after {
    content: '';
    flex: 1;
    height: 1px;
    background-color: #e5e5ea;
  }

  &::before {
    margin-right: 10px;
  }

  &::after {
    margin-left: 10px;
  }
}

html.dark .divider {
  &::before,
  &::after {
    background-color: #3a3a3c;
  }
}

.oidc-options {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.oidc-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  width: 100%;
  height: 48px;
  background: #ffffff;
  border: 1px solid #d2d2d7;
  border-radius: 10px;
  color: #1d1d1f;
  font-size: 14px;
  font-weight: 500;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
  transition: background-color 0.2s ease;
}

.oidc-btn:hover {
  background: #f5f5f7;
}

html.dark .oidc-btn {
  background: #3a3a3c;
  border-color: #48484a;
  color: #f5f5f7;
}

html.dark .oidc-btn:hover {
  background: #48484a;
}

.oidc-icon {
  width: 22px;
  height: 22px;
  margin-right: 8px;
}

.login-logo {
  width: 84px;
  height: 84px;
  margin: 0 auto 18px;
  display: block;
}

.el-form-item {
  ::v-deep(.el-form-item__label) {
    color: #1d1d1f;
    font-weight: 500;
  }
}

html.dark .el-form-item {
  ::v-deep(.el-form-item__label) {
    color: #f5f5f7;
  }
}
</style>