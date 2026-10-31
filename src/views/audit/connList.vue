<template>
  <div>
    <el-card class="list-query" shadow="hover">
      <el-form inline label-width="80px">
        <el-form-item :label="T('Time')">
          <el-date-picker
            v-model="listQuery.dateRange"
            type="datetimerange"
            range-separator="-"
            :start-placeholder="T('StartTime')"
            :end-placeholder="T('EndTime')"
            value-format="YYYY-MM-DD HH:mm:ss"
            :shortcuts="dateShortcuts"
            style="width: 380px"
          />
        </el-form-item>
        <el-form-item :label="T('Peer')">
          <el-input v-model="listQuery.peer_id" clearable style="width: 140px"></el-input>
        </el-form-item>
        <el-form-item :label="T('FromPeer')">
          <el-input v-model="listQuery.from_peer" clearable style="width: 140px"></el-input>
        </el-form-item>
        <el-form-item :label="T('FromName')">
          <el-input v-model="listQuery.from_name" clearable style="width: 140px"></el-input>
        </el-form-item>
        <el-form-item :label="T('Ip')">
          <el-input v-model="listQuery.ip" clearable style="width: 140px"></el-input>
        </el-form-item>
        <el-form-item :label="T('Uuid')">
          <el-input v-model="listQuery.uuid" clearable style="width: 140px"></el-input>
        </el-form-item>
        <el-form-item :label="T('Type')">
          <el-select v-model="listQuery.type" clearable :placeholder="T('All')" style="width: 120px">
            <el-option :label="T('Common')" :value="0"/>
            <el-option :label="T('File')" :value="1"/>
          </el-select>
        </el-form-item>
        <el-form-item :label="T('Action')">
          <el-select v-model="listQuery.action" clearable :placeholder="T('All')" style="width: 120px">
            <el-option label="new" value="new"/>
            <el-option label="close" value="close"/>
          </el-select>
        </el-form-item>
        <el-form-item :label="T('Keyword')">
          <el-input v-model="listQuery.keyword" clearable style="width: 180px"
                    placeholder="peer/ip/uuid"></el-input>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handlerQuery">{{ T('Filter') }}</el-button>
          <el-button @click="resetQuery">{{ T('Reset') }}</el-button>
          <el-button type="danger" @click="toBatchDelete">{{ T('BatchDelete') }}</el-button>
          <el-button type="success" @click="toExport">{{ T('Export') }}</el-button>
        </el-form-item>
      </el-form>
    </el-card>
    <el-card class="list-body" shadow="hover">
      <el-table :data="listRes.list" v-loading="listRes.loading" border @selection-change="handleSelectionChange">
        <el-table-column type="selection" align="center" width="50"/>
        <el-table-column prop="id" :label="T('ID')" align="center" width="100"/>
        <el-table-column :label="T('Peer')" prop="peer_id" align="center" width="120"/>
        <el-table-column :label="T('FromPeer')" prop="from_peer" align="center" width="120"/>
        <el-table-column :label="T('FromName')" prop="from_name" align="center" width="120"/>
        <el-table-column :label="T('Ip')" prop="ip" align="center" width="120"/>
        <el-table-column pop="type" :label="T('Type')" align="center" width="120">
          <template #default="{row}">
            <el-tag v-if="row.type === 1" type="warning">{{ T('File') }}</el-tag>
            <el-tag v-else>{{ T('Common') }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="uuid" :label="T('Uuid')" align="center" width="120" show-overflow-tooltip/>
        <el-table-column prop="created_at" :label="T('CreatedAt')" align="center"/>
        <el-table-column :label="T('CloseTime')" prop="close_time" align="center"/>
        <el-table-column :label="T('Actions')" align="center" width="150">
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
  import { onActivated, onMounted, ref, watch } from 'vue'
  import { useRepositories } from '@/views/audit/reponsitories'
  import { T } from '@/utils/i18n'

  const {
    listRes,
    listQuery,
    getList,
    handlerQuery,
    resetQuery,
    del,
    batchdel,
    toExport,
  } = useRepositories()

  // 常用时间范围快捷项：审计排查多数是"最近一段时间"
  const dateShortcuts = [
    {
      text: T('Today'),
      value: () => {
        const start = new Date()
        start.setHours(0, 0, 0, 0)
        return [start, new Date()]
      },
    },
    {
      text: '7d',
      value: () => {
        const end = new Date()
        const start = new Date()
        start.setDate(start.getDate() - 7)
        return [start, end]
      },
    },
    {
      text: '30d',
      value: () => {
        const end = new Date()
        const start = new Date()
        start.setDate(start.getDate() - 30)
        return [start, end]
      },
    },
  ]

  onMounted(getList)
  onActivated(getList)

  watch(() => listQuery.page, getList)

  watch(() => listQuery.page_size, handlerQuery)
  const multipleSelection = ref([])
  const handleSelectionChange = (val) => {
    multipleSelection.value = val
  }
  const toBatchDelete = () => {
    if (multipleSelection.value.length === 0) {
      return
    }
    batchdel(multipleSelection.value)
  }
</script>

<style scoped lang="scss">

</style>
