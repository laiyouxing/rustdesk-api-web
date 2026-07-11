import { router } from '@/router'
import { useRouteStore } from '@/store/router'
import { useUserStore } from '@/store/user'
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

  // 不再依赖 localStorage token；登录态由后端通过 HttpOnly Cookie 校验。
  // 公开页直接放行，其余页面通过 /user/current 判断是否已登录（cookie 自动携带）。
  if (whiteList.indexOf(to.path) !== -1) {
    next()
    return
  }

  const userStore = useUserStore(pinia)

  if (userStore.route_names.length) {
    next()
    return
  }

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
})

router.afterEach(() => {
  NProgress.done()
})
