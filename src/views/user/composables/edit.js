import { ref, onMounted, reactive, watch } from 'vue'
import { create, detail, update, remove } from '@/api/user'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useRouter } from 'vue-router'
import { tree as groupTree } from '@/api/group'
import { T } from '@/utils/i18n'

export function useGetDetail (id) {
  let item = ref({})  //保留原始值
  let form = ref({})
  const groupsList = ref([])
  const groupTreeData = ref([])
  const getDetail = async (id) => {
    const res = await detail(id)
    item.value = { ...res.data }
    form.value = {
      ...res.data,
      expiredAtDate: res.data.expired_at > 0 ? String(res.data.expired_at * 1000) : null,
    }
  }
  if (id > 0) {
    onMounted(_ => {getDetail(id)})
  }

  const getGroups = async () => {
    const res = await groupTree().catch(_ => false)
    if (res) {
      groupTreeData.value = res.data || []
      const flat = []
      const walk = (nodes) => nodes.forEach(n => { flat.push(n); if (n.children) walk(n.children) })
      walk(groupTreeData.value)
      groupsList.value = flat
    }
  }
  onMounted(getGroups)
  return {
    form,
    item,
    getDetail,
    groupsList,
    groupTreeData,
  }
}

export function useSubmit (form, id, item) {
  const root = ref(null)
  const router = useRouter()
  const rules = reactive({
    username: [{ required: true, message: T('ParamRequired', { param: T('Username') }) }],
    // email: [{ required: true, message: T('ParamRequired', { param: T('Email') }) }],
    group_id: [{ required: true, message: T('ParamRequired', { param: T('Group') }) }],
    // nickname: [{ required: true, message: '昵称是必须的' }],
    status: [{ required: true, message: T('ParamRequired', { param: T('Status') }) }],
    // 新建用户时密码必填（编辑时密码输入框隐藏，该规则不会触发）
    password: [{ required: true, message: '必须输入密码才能登录' }],
  })

  const validate = async () => {
    const res = await root.value.validate().catch(err => false)
    return res
  }

  const submitCreate = async () => {
    const res = await create(form.value).catch(_ => false)
    return res.code === 0
  }

  const submitUpdate = async () => {
    // 转换 expired_at
    const payload = { ...form.value }
    if (payload.expiredAtDate) {
      payload.expired_at = Math.floor(Number(payload.expiredAtDate) / 1000)
    } else {
      payload.expired_at = 0
    }
    delete payload.expiredAtDate
    const res = await update(payload).catch(_ => false)
    return res.code === 0
  }

  // 提交管理员账号（新建或提升）时校验超级管理员授权信息
  const validateAdminConfirm = () => {
    const isNew = !id || id == 0
    const isAdmin = form.value.role === 'admin'
    const wasAdmin = item?.value?.role === 'admin'
    const needConfirm = isAdmin && (isNew || !wasAdmin)
    if (!needConfirm) {
      return true
    }
    if (!form.value.verify_username) {
      ElMessage.warning('请填写超级管理员用户名以完成授权')
      return false
    }
    if (!form.value.verify_password) {
      ElMessage.warning('请填写超级管理员密码以完成授权')
      return false
    }
    // MFA 动态码选填：若超级管理员已开启 MFA，后端会强制校验
    return true
  }

  // 校验通过后清理敏感字段，避免残留到下一次编辑/复制
  const clearConfirmFields = () => {
    delete form.value.verify_username
    delete form.value.verify_password
    delete form.value.mfa_code
    delete form.value.password
  }
  const submitFunc = id > 0 ? submitUpdate : submitCreate

  const submit = async () => {
    const v = await validate()
    if (!v) {
      return
    }
    if (!validateAdminConfirm()) {
      return
    }

    const res = await submitFunc()
    if (res) {
      ElMessage.success(T('OperationSuccess'))
      router.back()
    }
  }

  const cancel = () => {
    clearConfirmFields()
    router.back()
  }

  return {
    root,
    rules,
    validate,
    submit,
    cancel,
  }
}


