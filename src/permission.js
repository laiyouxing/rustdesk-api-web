import { router } from '@/router'
import { useRouteStore } from '@/store/router'
import { useUserStore } from '@/store/user'
import { getToken } from '@/utils/auth'
import { pinia } from '@/store'
import NProgress from 'nprogress' // progress bar
import 'nprogress/nprogress.css'
import { useAppStore } from '@/store/app' // progress bar style
import { T } from '@/utils/i18n'

NProgress.configure({ showSpinner: false }) // NProgress Configuration

const whiteList = ['/login', '/register']
const routeStore = useRouteStore(pinia)
const appStore = useAppStore(pinia)
appStore.getAdminConfig()
router.beforeEach(async (to, from, next) => {

  document.title = T(to.meta?.title) + ' - ' + appStore.setting.title
  NProgress.start()

  const token = getToken()
  if (!token) {
    //无token，跳转到登录
    if (whiteList.indexOf(to.path) !== -1) {
      next()
    } else {
      next(`/login?redirect=${to.path}`)
    }

  } else {
    //有token

    const userStore = useUserStore(pinia)

    if (!userStore.route_names.length) {
      const info = await userStore.info()
      if (!info) {
        userStore.logout()
        next(`/login?redirect=${to.path}`)
      } else {
        // 检查目标路由是否已注册，避免因动态路由未覆盖而落到 404
        const resolved = router.resolve(to.path)
        if (resolved.name) {
          next({ ...to, replace: true })
        } else {
          next({ path: '/home', replace: true })
        }
      }
    } else if (to.path === '/404') {
      next({ path: to.redirectedFrom?.fullPath || '/home', replace: true })
    } else {
      next()
    }
  }
})

router.afterEach(() => {
  NProgress.done()
})
