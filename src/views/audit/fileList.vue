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
        <el-form-item :label="T('Path')">
          <el-input v-model="listQuery.path" clearable style="width: 180px"
                    :placeholder="T('FileInfo')"></el-input>
        </el-form-item>
        <el-form-item :label="T('Type')">
          <el-select v-model="listQuery.is_file" clearable :placeholder="T('All')" style="width: 120px">
            <el-option :label="T('File')" :value="true"/>
            <el-option :label="T('Common')" :value="false"/>
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
      <el-table :data="listRes.list" v-loading="listRes.loading" border max-height="750" @selection-change="handleSelectionChange">
        <el-table-column type="selection" align="center" width="50"/>
        <el-table-column prop="id" :label="T('ID')" align="center" width="100"/>
        <el-table-column :label="T('Peer')" prop="peer_id" align="center" width="120"/>
        <el-table-column :label="T('FromPeer')" prop="from_peer" align="center" width="120"/>
        <el-table-column :label="T('FromName')" prop="from_name" align="center" width="120"/>
        <el-table-column :label="T('Ip')" prop="ip" align="center" width="120"/>
        <el-table-column prop="type" :label="T('Type')" align="center" width="200">
          <template #default="{row}">
            <el-tag v-if="row.type === 1" type="warning"> {{ T('ToRemote') }}:
              <el-icon>
                <Right/>
              </el-icon>
              {{ row.peer_id }}
            </el-tag>
            <el-tag v-else>{{ T('ToLocal') }}:
              <el-icon>
                <Right/>
              </el-icon>
              {{ row.from_peer }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="num" :label="T('Num')" align="center" width="100"/>
        <el-table-column :label="T('FileInfo')" align="center" width="300">
          <template #default="{row}">
            <template v-if="!row.is_file">
              <el-table size="small" :data="row.info?.files?.filter((v,k) => k<showDirFileNum)" fit>
                <el-table-column prop="0" :label="T('FileName')" align="center" width="150" show-overflow-tooltip></el-table-column>
                <el-table-column prop="1" :label="T('Size')" align="center">
                  <template #default="{row:_row}">
                    {{ sizeFormat(_row[1]) }}
                  </template>
                </el-table-column>
              </el-table>
              <el-button size="small" v-if="row.info.files.length>showDirFileNum" style="width: 100%;margin-top: 5px" type="primary" @click="showAllFile(row.info.files)">
                {{ T('More') }}({{ row.info.files.length - showDirFileNum }})
              </el-button>
            </template>
            <div v-else>
              {{ sizeFormat(row.info.files[0][1]) }}
            </div>

          </template>
        </el-table-column>
        <el-table-column prop="path" :label="T('Path')" align="center" width="150" show-overflow-tooltip/>
        <el-table-column prop="uuid" :label="T('Uuid')" align="center" width="120" show-overflow-tooltip/>
        <el-table-column prop="created_at" :label="T('CreatedAt')" align="center" min-width="120"/>
        <el-table-column :label="T('Actions')" align="center" width="150" fixed="right">
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
    <el-dialog v-model="allFilesVisible" :title="T('File')">
      <el-table :data="showFiles" max-height="800px">
        <el-table-column type="index" :label="T('IndexNum')" width="120" align="center"></el-table-column>
        <el-table-column prop="0" :label="T('FileName')" align="center"></el-table-column>
        <el-table-column prop="1" :label="T('Size')" align="center">
          <template #default="{row:_row}">
            {{ sizeFormat(_row[1]) }}
          </template>
        </el-table-column>
      </el-table>
      <el-button @click="allFilesVisible=false" style="margin-top: 20px;width: 100%" type="primary">{{ T('Close') }}</el-button>
    </el-dialog>
  </div>
</template>

<script setup>
  import { onActivated, onMounted, ref, watch } from 'vue'
  import { useFileRepositories } from '@/views/audit/reponsitories'
  import { T } from '@/utils/i18n'
  import { sizeFormat } from '@/utils/file'
  import { Right } from '@element-plus/icons'

  const showDirFileNum = 3
  const {
    listRes,
    listQuery,
    getList,
    handlerQuery,
    resetQuery,
    del,
    batchdel,
    toExport,
  } = useFileRepositories()

  // 常用时间范围快捷项
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

  const allFilesVisible = ref(false)
  const showFiles = ref([])
  const showAllFile = (files) => {
    showFiles.value = files
    allFilesVisible.value = true
  }

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
