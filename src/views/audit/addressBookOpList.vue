<template>
  <div>
    <el-card class="list-query" shadow="hover">
      <el-form inline label-width="80px">
        <el-form-item :label="T('Keyword')">
          <el-input v-model="listQuery.keyword" clearable placeholder="操作者/所属用户" style="width:180px"></el-input>
        </el-form-item>
        <el-form-item :label="T('Type')">
          <el-select v-model="listQuery.action" clearable placeholder="操作类型" style="width:180px">
            <el-option label="添加" value="create" />
            <el-option label="编辑" value="update" />
            <el-option label="删除" value="delete" />
            <el-option label="批量添加" value="batch_create" />
            <el-option label="批量改标签" value="update_tags" />
            <el-option label="分享" value="share" />
            <el-option label="标签-新建" value="tag_create" />
            <el-option label="标签-编辑" value="tag_update" />
            <el-option label="标签-删除" value="tag_delete" />
            <el-option label="分组-新建" value="collection_create" />
            <el-option label="分组-编辑" value="collection_update" />
            <el-option label="分组-删除" value="collection_delete" />
            <el-option label="规则-新建" value="rule_create" />
            <el-option label="规则-编辑" value="rule_update" />
            <el-option label="规则-删除" value="rule_delete" />
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
        <el-table-column label="操作类型" align="center" width="130">
          <template #default="{ row }">
            <el-tag :type="actionTagType(row.action)" size="small">{{ actionText(row.action) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="operator_name" label="操作者" align="center" width="140"/>
        <el-table-column prop="username" label="所属用户" align="center" width="140"/>
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
import { adminListAddressBookOpLogs } from '@/api/subscribe'

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
    const res = await adminListAddressBookOpLogs({
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
  const map = {
    create: '添加',
    update: '编辑',
    delete: '删除',
    batch_create: '批量添加',
    update_tags: '批量改标签',
    share: '分享',
    tag_create: '标签-新建',
    tag_update: '标签-编辑',
    tag_delete: '标签-删除',
    collection_create: '分组-新建',
    collection_update: '分组-编辑',
    collection_delete: '分组-删除',
    rule_create: '规则-新建',
    rule_update: '规则-编辑',
    rule_delete: '规则-删除',
  }
  return map[a] || a
}
const actionTagType = (a) => {
  if (a?.includes('create')) return 'success'
  if (a?.includes('delete')) return 'danger'
  if (a?.includes('share')) return 'warning'
  return 'primary'
}

onMounted(getList)
onActivated(getList)
watch(() => listQuery.value.page, getList)
watch(() => listQuery.value.page_size, handlerQuery)
</script>

<style scoped lang="scss">
.list-query .el-select {
  --el-select-width: 180px;
}
</style>
