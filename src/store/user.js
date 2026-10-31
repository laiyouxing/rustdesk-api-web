import { defineStore, acceptHMRUpdate } from 'pinia'
import { current, login } from '@/api/user'
import { removeToken, setCode, removeCode } from '@/utils/auth'
import request from '@/utils/request'
import { useRouteStore } from '@/store/router'
import { useAppStore } from '@/store/app'
import { oidcAuth, oidcQuery } from '@/api/login'

export const useUserStore = defineStore({
  id: 'user',
  state: () => ({
    nickname: '',
    username: '',
    email: '',
    token: '',
    role: '',
    avatar: '',
    route_names: [],
    mfa_enabled: false,
  }),

  actions: {
    async logout () {
      // 调用后端 /logout 清除 HttpOnly Cookie 与 user_token 记录
      try {
        await request({ url: '/logout', method: 'post' })
      } catch (e) {
        // 即使请求失败也继续清理本地状态
      }
      this.clearLocal()
    },

    // 只清理本地状态，**不调用后端 /logout**。
    //
    // 为什么必须区分：
    // 后端 /logout 会删除 user_tokens 记录并清 Cookie —— 那是**销毁服务端会话**。
    // 而"路由守卫判断登录态"时的失败原因很多是**临时的**：
    //   - 页面刷新/跳转导致 in-flight 的 /user/current 请求被中断（浏览器 abort）
    //   - 网络抖动、超时、多标签页互相影响导致某次请求没带 Cookie
    // 这些情况下会话其实仍然有效。若一律走 logout()，就会把"一次临时失败"
    // 升级成"真的被登出"，带 MFA 的账户被迫重新输一次动态码。
    clearLocal () {
      removeToken()
      removeCode()
      this.$patch({
        name: '',
        role: {},
      })
    },

    saveUserData (userData) {
      // token 由后端通过 HttpOnly Cookie 下发，前端不再存储
      localStorage.setItem('user_info', JSON.stringify({ name: userData.username }))
      this.$patch({
        ...userData,
      })
      if (userData.route_names && userData.route_names.length) {
        useRouteStore().addRoutes(userData.route_names)
      }
    },

    async login (form) {
      const res = await login(form).catch(e => e)
      console.log('login', res)
      if (!res.code) {
        useAppStore().loadConfig()
        const userData = res.data
        this.saveUserData(userData)
        return userData
      } else {
        return Promise.reject(res)
      }
    },
    // 读取当前登录用户。失败原因分两类，必须区别对待：
    //   - 401：会话确实失效（Cookie 没有/过期/token 被删）→ 返回 false，交给守卫跳登录页
    //   - 其它（请求被中断、网络抖动、超时、5xx）→ **重试**，不能当成未登录。
    //     页面刷新会让 in-flight 请求被浏览器 abort，这类"假失败"如果被当作
    //     退出登录，带 MFA 的账户每次刷新都要重新输动态码。
    async info (retry = 1) {
      for (let i = 0; i <= retry; i++) {
        try {
          const res = await current()
          if (res && res.data) {
            useAppStore().loadConfig()
            const userData = res.data
            // token 由后端通过 HttpOnly Cookie 下发，前端不再存储
            this.$patch({
              ...userData,
            })
            useRouteStore().addRoutes(userData.route_names)
            return userData
          }
          return false
        } catch (e) {
          // 明确的会话失效：不重试，直接判定未登录
          if (e && e.code === 401) return false
          if (i === retry) return false
          await new Promise(resolve => setTimeout(resolve, 300))
        }
      }
      return false
    },
    async oidc (provider, platform, browser) {
      // oidc data need to be implement
      const data = {
        deviceInfo: {
          name: navigator.userAgent, // 使用浏览器的 User-Agent 作为设备名
          os: platform, // 获取操作系统信息
          type: 'webadmin', // any vaule
        },
        id: `${platform}-${browser}`,
        op: provider, // 传入的 provider
        uuid: '',//crypto.randomUUID(), // 自动生成 UUID
      }
      const res = await oidcAuth(data).catch(_ => false)
      if (res) {
        const { code, url } = res.data
        setCode(code)
        if (provider == 'webauth') {
          window.open(url)
        } else {
          window.location.href = url
        }
      }
    },
    async query (code) {
      const params = { 'code': code, uuid: '' }
      const res = await oidcQuery(params).catch(_ => false)
      if (res) {
        removeCode()
        useAppStore().loadConfig()
        const userData = res.data
        this.saveUserData(userData)
        return userData
      }
      return false
    },
  },
})

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useUserStore, import.meta.hot))
}
