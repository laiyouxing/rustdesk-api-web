import { reactive } from 'vue'
import { list, remove, fileList, fileRemove, batchDelete, fileBatchDelete } from '@/api/audit'
import { ElMessage, ElMessageBox } from 'element-plus'
import { formatTime } from '@/utils/time'
import { T } from '@/utils/i18n'
import { downBlob, jsonToCsv } from '@/utils/file'

// 把前端筛选状态整理成后端查询参数：
// - 空串/null 一律不发，避免后端把 "" 当成有效筛选条件；
// - 时间范围用 el-date-picker 的 value-format 直接产出字符串；
// - type / is_file 用 null 表示"不限"，0 是有效值，必须与"未选"区分。
const buildParams = (q) => {
  const p = { page: q.page, page_size: q.page_size }
  const strFields = [
    'peer_id', 'from_peer', 'from_name', 'ip', 'uuid',
    'keyword', 'path', 'action', 'order', 'order_dir',
  ]
  strFields.forEach((k) => {
    const v = q[k]
    if (v !== null && v !== undefined && String(v).trim() !== '') {
      p[k] = String(v).trim()
    }
  })
  if (q.type !== null && q.type !== undefined && q.type !== '') {
    p.type = q.type
  }
  if (q.is_file !== null && q.is_file !== undefined && q.is_file !== '') {
    p.is_file = q.is_file
  }
  if (Array.isArray(q.dateRange) && q.dateRange.length === 2 && q.dateRange[0] && q.dateRange[1]) {
    p.start_time = q.dateRange[0]
    p.end_time = q.dateRange[1]
  }
  return p
}

const blankQuery = () => ({
  page: 1,
  page_size: 10,
  peer_id: '',
  from_peer: '',
  from_name: '',
  ip: '',
  uuid: '',
  keyword: '',
  type: null,
  is_file: null,
  path: '',
  action: '',
  dateRange: [],
})

export function useRepositories () {
  const listRes = reactive({
    list: [], total: 0, loading: false,
  })
  const listQuery = reactive(blankQuery())

  const getList = async () => {
    listRes.loading = true
    const res = await list(buildParams(listQuery)).catch(_ => false)
    listRes.loading = false
    if (res) {
      listRes.list = res.data.list.map(item => {
        item.close_time = item.close_time ? formatTime(item.close_time * 1000) : '-'
        return item
      })
      listRes.total = res.data.total
    }
  }
  const handlerQuery = () => {
    if (listQuery.page === 1) {
      getList()
    } else {
      listQuery.page = 1
    }
  }
  const resetQuery = () => {
    Object.assign(listQuery, blankQuery())
    getList()
  }

  const del = async (row) => {
    const cf = await ElMessageBox.confirm(T('Confirm?', { param: T('Delete') }), {
      confirmButtonText: T('Confirm'),
      cancelButtonText: T('Cancel'),
      type: 'warning',
    }).catch(_ => false)
    if (!cf) {
      return false
    }

    const res = await remove({ id: row.id }).catch(_ => false)
    if (res) {
      ElMessage.success(T('OperationSuccess'))
      getList()
    }
  }
  const batchdel = async (rows) => {
    const ids = rows.map(r => r.id)
    if (!ids.length) {
      ElMessage.warning(T('PleaseSelectData'))
      return false
    }
    const cf = await ElMessageBox.confirm(T('Confirm?', { param: T('BatchDelete') }), {
      confirmButtonText: T('Confirm'),
      cancelButtonText: T('Cancel'),
      type: 'warning',
    }).catch(_ => false)
    if (!cf) {
      return false
    }

    const res = await batchDelete({ ids }).catch(_ => false)
    if (res) {
      ElMessage.success(T('OperationSuccess'))
      getList()
    }
  }

  const toExport = async () => {
    const q = buildParams({ ...listQuery, page: 1, page_size: 1000000 })
    const res = await list(q).catch(_ => false)
    if (res) {
      const csv = jsonToCsv(res.data.list)
      downBlob(csv, 'connectLog.csv')
    }
  }
  return {
    listRes,
    listQuery,
    getList,
    handlerQuery,
    resetQuery,
    del,
    batchdel,
    toExport,
  }
}

export function useFileRepositories () {
  const listRes = reactive({
    list: [], total: 0, loading: false,
  })
  const listQuery = reactive(blankQuery())

  const getList = async () => {
    listRes.loading = true
    const res = await fileList(buildParams(listQuery)).catch(_ => false)
    listRes.loading = false
    if (res) {
      listRes.list = res.data.list.map(item => {
        item.info = item.info ? JSON.parse(item.info) : '-'
        return item
      })
      listRes.total = res.data.total
    }
  }
  const handlerQuery = () => {
    if (listQuery.page === 1) {
      getList()
    } else {
      listQuery.page = 1
    }
  }
  const resetQuery = () => {
    Object.assign(listQuery, blankQuery())
    getList()
  }

  const del = async (row) => {
    const cf = await ElMessageBox.confirm(T('Confirm?', { param: T('Delete') }), {
      confirmButtonText: T('Confirm'),
      cancelButtonText: T('Cancel'),
      type: 'warning',
    }).catch(_ => false)
    if (!cf) {
      return false
    }

    const res = await fileRemove({ id: row.id }).catch(_ => false)
    if (res) {
      ElMessage.success(T('OperationSuccess'))
      getList()
    }
  }
  const batchdel = async (rows) => {
    const ids = rows.map(r => r.id)
    if (!ids.length) {
      ElMessage.warning(T('PleaseSelectData'))
      return false
    }
    const cf = await ElMessageBox.confirm(T('Confirm?', { param: T('BatchDelete') }), {
      confirmButtonText: T('Confirm'),
      cancelButtonText: T('Cancel'),
      type: 'warning',
    }).catch(_ => false)
    if (!cf) {
      return false
    }

    const res = await fileBatchDelete({ ids }).catch(_ => false)
    if (res) {
      ElMessage.success(T('OperationSuccess'))
      getList()
    }
  }

  const toExport = async () => {
    const q = buildParams({ ...listQuery, page: 1, page_size: 1000000 })
    const res = await fileList(q).catch(_ => false)
    if (res) {
      const csv = jsonToCsv(res.data.list)
      downBlob(csv, 'fileTransformLog.csv')
    }
  }

  return {
    listRes,
    listQuery,
    getList,
    handlerQuery,
    resetQuery,
    del,
    batchdel,
    toExport,
  }
}
