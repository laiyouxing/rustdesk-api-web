<template>
  <div class="app-container">
    <!-- 操作栏 -->
    <div class="mb-2">
      <el-button type="primary" icon="el-icon-plus" @click="handleCreate">
        生成授权码
      </el-button>
    </div>

    <!-- 表格 -->
    <el-table
      :data="list"
      v-loading="listLoading"
      border
      stripe
      style="width: 100%"
    >
      <el-table-column :label="T('ID')" prop="id" width="60" />
      <el-table-column label="授权码" prop="code" min-width="160" />
      <el-table-column label="套餐" width="100">
        <template slot-scope="{ row }">
          <el-tag :type="row.plan === 'pro' ? 'primary' : 'warning'" size="mini">
            {{ row.plan }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="状态" width="90">
        <template slot-scope="{ row }">
          <el-tag
            :type="row.status === 'unused' ? 'success' : (row.status === 'used' ? 'info' : 'danger')"
            size="mini"
          >
            {{ row.status === 'unused' ? '未使用' : (row.status === 'used' ? '已使用' : '已失效') }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="使用人" width="120" prop="used_by" />
      <el-table-column label="到期时间" width="170" prop="expire_at" />
      <el-table-column label="创建时间" width="170" prop="created_at" />
      <el-table-column label="操作" width="120" fixed="right">
        <template slot-scope="{ row }">
          <el-button
            v-if="row.status === 'unused'"
            type="danger"
            size="mini"
            @click="handleRevoke(row)"
          >
            失效
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 分页 -->
    <el-pagination
      class="mt-2"
      @size-change="pageSize => { form.size = pageSize; fetchData() }"
      @current-change="page => { form.page = page; fetchData() }"
      :current-page="form.page"
      :page-sizes="[10, 20, 50, 100]"
      :page-size="form.size"
      layout="total, sizes, prev, pager, next, jumper"
      :total="total"
    >
    </el-pagination>

    <!-- 生成授权码弹窗 -->
    <el-dialog title="生成授权码" :visible.sync="createVisible" width="500px">
      <el-form ref="createForm" :model="createForm" :rules="createRules" label-width="100px">
        <el-form-item label="套餐" prop="plan">
          <el-select v-model="createForm.plan" placeholder="请选择套餐">
            <el-option label="Pro" value="pro" />
            <el-option label="Enterprise" value="enterprise" />
          </el-select>
        </el-form-item>
        <el-form-item label="有效天数" prop="expire_days">
          <el-input-number v-model="createForm.expire_days" :min="1" :max="3650" />
        </el-form-item>
      </el-form>
      <span slot="footer">
        <el-button @click="createVisible = false">取消</el-button>
        <el-button type="primary" @click="submitCreate" :loading="creating">确认生成</el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
import { invitationList, invitationCreate, invitationRevoke } from '@/api/user'

export default {
  data () {
    return {
      list: [],
      listLoading: false,
      form: {
        page: 1,
        size: 10,
      },
      total: 0,
      createVisible: false,
      creating: false,
      createForm: {
        plan: 'pro',
        expire_days: 30,
      },
      createRules: {
        plan: [{ required: true, message: '请选择套餐', trigger: 'change' }],
        expire_days: [{ required: true, message: '请输入有效天数', trigger: 'blur' }],
      },
    }
  },
  created () {
    this.fetchData()
  },
  methods: {
    fetchData () {
      this.listLoading = true
      invitationList(this.form).then(res => {
        this.list = res.data.list || []
        this.total = res.data.total || 0
      }).finally(() => {
        this.listLoading = false
      })
    },
    handleCreate () {
      this.createForm = { plan: 'pro', expire_days: 30 }
      this.createVisible = true
      this.$nextTick(() => {
        this.$refs.createForm && this.$refs.createForm.clearValidate()
      })
    },
    submitCreate () {
      this.$refs.createForm.validate(valid => {
        if (!valid) return
        this.creating = true
        invitationCreate(this.createForm).then(() => {
          this.$message.success('生成成功')
          this.createVisible = false
          this.fetchData()
        }).finally(() => {
          this.creating = false
        })
      })
    },
    handleRevoke (row) {
      this.$confirm(`确定要使授权码 ${row.code} 失效吗？`, '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }).then(() => {
        invitationRevoke(row.id).then(() => {
          this.$message.success('已失效')
          this.fetchData()
        })
      })
    },
  },
}
</script>
