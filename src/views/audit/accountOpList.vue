<template>
  <div>
    <el-card class="list-query" shadow="hover">
      <el-form inline label-width="80px">
        <el-form-item :label="T('Keyword')">
          <el-input v-model="listQuery.keyword" clearable placeholder="操作者/目标用户" style="width:180px"></el-input>
        </el-form-item>
        <el-form-item :label="T('Type')">
          <el-select v-model="listQuery.action" clearable placeholder="操作类型" style="width:140px">
            <el-option label="新建" value="create" />
            <el-option label="延长" value="extend" />
            <el-option label="终止" value="terminate" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handlerQuery">{{ T('Filter') }}</el-button>
        </el-form-item>
      </el-form>
    </el-card>
    <el-card class="list-body" shadow="hover">
      <el-table :data="listRes.list" v-loading="listRes.loading" border>
        <el-table-column prop="id" :label="T('ID')" align="center" width="100"/>
        <el-table-column label="操作类型" align="center" width="100">
          <template #default="{ row }">
            <el-tag :type="actionTagType(row.action)" size="small">{{ actionText(row.action) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="operator_name" label="操作者" align="center" width="140"/>
        <el-table-column prop="target_username" label="目标用户" align="center" width="140"/>
        <el-table-column prop="detail" label="详情" align="center" min-width="260"/>
        <el-table-column prop="created_at" :label="T('CreatedAt')" align="center" width="180"/>
      </el-table>
    </el-card>
    <el-card class="list-page" shadow="hover">
      <el-pagination background
                     layout="prev, pager, next, sizes, jumper"
                     :page-sizes="[10,20,50,100]"
                     v-model:page-size="listQuery.page_size"
                     v-model:current-page="listQuery.page"
                     :total="listRes.total">
      </el-pagination>
    </el-card>
  </div>
</template>

<script setup>
import { onActivated, onMounted, ref, watch } from 'vue'
import { T } from '@/utils/i18n'
import { adminListAccountOpLogs } from '@/api/subscribe'

const listRes = ref({ list: [], total: 0, loading: false })
const listQuery = ref({
  page: 1,
  page_size: 20,
  keyword: '',
  action: '',
})

const getList = async () => {
  listRes.value.loading = true
  try {
    const res = await adminListAccountOpLogs({
      page: listQuery.value.page,
      page_size: listQuery.value.page_size,
      keyword: listQuery.value.keyword || undefined,
      action: listQuery.value.action || undefined,
    })
    if (!res.code) {
      listRes.value.list = res.data?.list || []
      listRes.value.total = res.data?.total || 0
    }
  } catch (_) {
    listRes.value.list = []
    listRes.value.total = 0
  } finally {
    listRes.value.loading = false
  }
}

const handlerQuery = () => {
  listQuery.value.page = 1
  getList()
}

const actionText = (a) => {
  const map = { create: '新建', extend: '延长', terminate: '终止' }
  return map[a] || a
}
const actionTagType = (a) => {
  const map = { create: 'success', extend: 'warning', terminate: 'danger' }
  return map[a] || 'info'
}

onMounted(getList)
onActivated(getList)
watch(() => listQuery.value.page, getList)
watch(() => listQuery.value.page_size, handlerQuery)
</script>

<style scoped lang="scss">
.list-query .el-select {
  --el-select-width: 140px;
}
</style>
