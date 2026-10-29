<template>
  <div>
    <el-card class="list-query" shadow="hover">
      <el-form inline label-width="90px">
        <el-form-item :label="T('Peer')">
          <el-input v-model="listQuery.peer_id" clearable></el-input>
        </el-form-item>
        <el-form-item :label="T('ToPeer')">
          <el-input v-model="listQuery.target" clearable></el-input>
        </el-form-item>
        <el-form-item :label="T('ConnType')">
          <el-select v-model="listQuery.conn_type" clearable style="width: 140px">
            <el-option label="direct_v4" value="direct_v4"/>
            <el-option label="direct_v6" value="direct_v6"/>
            <el-option label="relay" value="relay"/>
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handlerQuery">{{ T('Filter') }}</el-button>
          <el-button type="danger" @click="toBatchDelete">{{ T('BatchDelete') }}</el-button>
        </el-form-item>
      </el-form>
    </el-card>
    <el-card class="list-body" shadow="hover">
      <el-table :data="listRes.list" v-loading="listRes.loading" border
                @selection-change="handleSelectionChange">
        <el-table-column type="selection" align="center" width="50"/>
        <el-table-column prop="id" :label="T('ID')" align="center" width="80"/>
        <el-table-column prop="peer_id" :label="T('Peer')" align="center" width="130"
                         show-overflow-tooltip/>
        <el-table-column prop="target" :label="T('ToPeer')" align="center" width="130"
                         show-overflow-tooltip/>
        <el-table-column :label="T('ConnType')" align="center" width="120">
          <template #default="{row}">
            <el-tag v-if="row.conn_type === 'direct_v6'" type="success">IPv6</el-tag>
            <el-tag v-else-if="row.conn_type === 'direct_v4'" type="primary">IPv4</el-tag>
            <el-tag v-else type="info">{{ row.conn_type || '-' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="public_addr" :label="T('PublicAddr')" align="center"
                         min-width="180" show-overflow-tooltip/>
        <el-table-column prop="lan_addrs" :label="T('LanAddrs')" align="center"
                         min-width="180" show-overflow-tooltip/>
        <!-- MAC 是客户端算好的哈希，不是原始 MAC；列名明确标注，避免被误解 -->
        <el-table-column prop="mac_hashes" :label="T('MacHash')" align="center"
                         min-width="220" show-overflow-tooltip/>
        <el-table-column prop="created_at" :label="T('CreatedAt')" align="center" width="180"/>
        <el-table-column :label="T('Actions')" align="center" width="110">
          <template #default="{row}">
            <el-button type="danger" @click="del(row)">{{ T('Delete') }}</el-button>
          </template>
        </el-table-column>
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
  import { onActivated, onMounted, reactive, ref, watch } from 'vue'
  import { ElMessage, ElMessageBox } from 'element-plus'
  import { directOkList, directOkRemove, directOkBatchDelete } from '@/api/punch'
  import { T } from '@/utils/i18n'

  const listRes = reactive({
    list: [], total: 0, loading: false,
  })
  const listQuery = reactive({
    page: 1,
    page_size: 10,
    peer_id: null,
    target: null,
    conn_type: null,
  })

  const getList = async () => {
    listRes.loading = true
    const res = await directOkList(listQuery).catch(_ => false)
    listRes.loading = false
    if (res) {
      listRes.list = res.data.list || []
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

  const del = async (row) => {
    const cf = await ElMessageBox.confirm(T('Confirm?', { param: T('Delete') }), {
      confirmButtonText: T('Confirm'),
      cancelButtonText: T('Cancel'),
      type: 'warning',
    }).catch(_ => false)
    if (!cf) {
      return false
    }
    const res = await directOkRemove({ id: row.id }).catch(_ => false)
    if (res) {
      ElMessage.success(T('OperationSuccess'))
      getList()
    }
  }

  const multipleSelection = ref([])
  const handleSelectionChange = (val) => {
    multipleSelection.value = val
  }
  const toBatchDelete = async () => {
    const ids = multipleSelection.value.map(r => r.id)
    if (!ids.length) {
      ElMessage.warning(T('PleaseSelectData'))
      return
    }
    const cf = await ElMessageBox.confirm(T('Confirm?', { param: T('BatchDelete') }), {
      confirmButtonText: T('Confirm'),
      cancelButtonText: T('Cancel'),
      type: 'warning',
    }).catch(_ => false)
    if (!cf) {
      return false
    }
    const res = await directOkBatchDelete({ ids }).catch(_ => false)
    if (res) {
      ElMessage.success(T('OperationSuccess'))
      getList()
    }
  }

  onMounted(getList)
  onActivated(getList)
  watch(() => listQuery.page, getList)
  watch(() => listQuery.page_size, handlerQuery)
</script>

<style scoped lang="scss">
</style>
