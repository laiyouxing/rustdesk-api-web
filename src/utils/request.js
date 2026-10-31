import axios from 'axios'
import { ElMessage } from 'element-plus'
import { removeToken } from '@/utils/auth'
import { useAppStore } from '@/store/app'

// create an axios instance
const service = axios.create({
  baseURL: import.meta.env.VITE_SERVER_API,
  withCredentials: true, // send cookies when cross-domain requests
  timeout: 50000, // request timeout
})

// request interceptor
service.interceptors.request.use(
  config => {
    if (!config.headers) {
      config.headers = {}
    }
    const app = useAppStore()
    const lang = app.setting.lang
    if (lang) {
      // console.log('lang', lang)
      config.headers['Accept-Language'] = lang
    }

    return config
  },
  error => {
    // do something with request error
    return Promise.reject(error)
  },
)

// response interceptor
service.interceptors.response.use(
  /**
   * If you want to get http information such as headers or status
   * Please return  response => response
   */

  /**
   * Determine the request status by custom code
   * Here is just an example
   * You can also judge the status by HTTP Status Code
   */
  response => {
    const res = response.data

    // for the endpoint /login-options
    // I'm not sure if this is a good idea
    if (Array.isArray(res)) {
      return res;
    }

    // if the custom code is not 20000, it is judged as an error.
    if (res.code !== 0) {
      ElMessage({
        message: res.message || 'error',
        type: 'error',
        duration: 5 * 1000,
      })

      // 401 = 会话无效（未登录 / Cookie 过期 / 指纹不匹配 / 账户被禁用或过期）。
      // 只有这种情况才登出并跳转登录页。
      if (res.code === 401) {
        removeToken()
        // 切勿 window.location.reload()：在受保护页会因持续 401 陷入 reload 死循环横跳，
        // 表现为"登录界面反复刷新横跳"，且刷新瞬间未完成的请求被中止报 "Request aborted"。
        import('@/router').then(m => {
          const r = m.default
          const cur = r.currentRoute.value
          if (cur.path !== '/login' && cur.path !== '/register') {
            r.push(`/login?redirect=${encodeURIComponent(cur.fullPath)}`)
          }
        }).catch(() => {
          if (!window.location.hash.includes('/login') && window.location.pathname !== '/login') {
            window.location.href = '/#/login'
          }
        })
      }
      // 403 = 无权限（已登录，但没有该接口的管理员权限）。
      // 绝不能再当成掉线处理：否则普通用户 / 权限不足时会被反复踢回登录页；
      // 若该账户还开了 MFA，就表现为"登录成功→立刻退出→又要输入一次动态码"。
      // 这里只提示错误（上面 ElMessage 已提示），保持当前会话不动。
      return Promise.reject(res)
    } else {
      return res
    }
  },
  error => {
    if (error.code === 'ECONNABORTED'
      && error.message.indexOf('timeout') > -1) {
      error.message = 'Connection Time Out!'
    }
    ElMessage({
      message: error.message,
      type: 'error',
      duration: 5 * 1000,
    })
    return Promise.reject(error)
  },
)

export default service
