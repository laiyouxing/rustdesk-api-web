<template>
  <div class="form-card">
    <el-form ref="root" label-width="120px" :model="form" :rules="rules">
      <el-form-item :label="T('Username')" prop="username">
        <el-input v-model="form.username"></el-input>
      </el-form-item>
      <el-form-item :label="T('Email')" prop="email">
        <el-input v-model="form.email"></el-input>
      </el-form-item>
      <el-form-item :label="T('Nickname')" prop="nickname">
        <el-input v-model="form.nickname"></el-input>
      </el-form-item>
      <el-form-item :label="T('Group')" prop="group_id">
        <el-tree-select
            v-model="form.group_id"
            :data="groupTreeData"
            :props="{ label: 'name', children: 'children' }"
            value-key="id"
            node-key="id"
            check-strictly
            :render-after-expand="false"
            clearable
            style="width:100%"
        />
      </el-form-item>
      <el-form-item :label="T('Role')" prop="role">
        <el-select v-model="form.role" style="width:100%">
          <el-option label="普通用户" value="user" />
          <el-option label="管理员" value="admin" />
        </el-select>
      </el-form-item>
      <template v-if="needConfirm">
        <el-divider content-position="left">设置管理员需二次确认</el-divider>
        <el-form-item label="当前管理员密码" prop="verify_password">
          <el-input v-model="form.verify_password" type="password" show-password
                    placeholder="请输入当前登录管理员的密码"></el-input>
        </el-form-item>
        <el-form-item v-if="mfaEnabled" label="MFA 动态码" prop="mfa_code">
          <el-input v-model="form.mfa_code" type="password" show-password
                    placeholder="当前管理员已开启 MFA，请输入动态码"></el-input>
        </el-form-item>
      </template>
      <el-form-item :label="T('Status')" prop="status">
        <el-switch v-model="form.status"
                   :active-value="ENABLE_STATUS"
                   :inactive-value="DISABLE_STATUS"
        ></el-switch>
      </el-form-item>
      <el-form-item :label="T('ExpiredAt')" prop="expiredAtDate">
        <el-date-picker v-model="form.expiredAtDate"
                        type="datetime"
                        value-format="x"
                        :placeholder="T('ExpiredAtPlaceholder')"
                        style="width:100%"/>
        <div style="margin-top:6px; display:flex; gap:4px; flex-wrap:wrap;">
          <el-button size="small" @click="setExpiredAt(30)">1个月</el-button>
          <el-button size="small" @click="setExpiredAt(90)">3个月</el-button>
          <el-button size="small" @click="setExpiredAt(365)">1年</el-button>
          <el-button size="small" @click="setExpiredAt(3650)">10年</el-button>
          <el-button size="small" @click="setExpiredAt(-1)">永久</el-button>
        </div>
      </el-form-item>
      <el-form-item :label="T('Remark')" prop="remark">
          <el-input v-model="form.remark"></el-input>
      </el-form-item>
      <el-form-item>
        <el-button @click="cancel">{{ T('Cancel') }}</el-button>
        <el-button @click="submit" type="primary">{{ T('Submit') }}</el-button>
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup>
  import { computed, onMounted, ref } from 'vue'
  import { useRoute } from 'vue-router'
  import { useGetDetail, useSubmit } from '@/views/user/composables/edit'
  import { ENABLE_STATUS, DISABLE_STATUS } from '@/utils/common_options'
  import { T } from '@/utils/i18n'
  import { mfaStatus } from '@/api/user'

  const route = useRoute()
  const { form, item, getDetail, groupTreeData } = useGetDetail(route.params.id)

  // 当前登录管理员是否已开启 MFA（决定是否展示动态码输入框）
  const mfaEnabled = ref(false)
  const { root, rules, validate, submit, cancel } = useSubmit(form, route.params.id, mfaEnabled, item)

  // 是否需要管理员二次确认：新建管理员 或 将普通用户提升为管理员
  // （编辑已有管理员则不需要，因为其权限未变更）
  const needConfirm = computed(() => {
    const isNew = !route.params.id || route.params.id == 0
    const isAdmin = form.value.role === 'admin'
    const wasAdmin = item.value.role === 'admin'
    return isAdmin && (isNew || !wasAdmin)
  })

  onMounted(async () => {
    // 新建用户默认角色为普通用户
    if (!route.params.id || route.params.id == 0) {
      form.value.role = 'user'
    }
    const res = await mfaStatus().catch(_ => false)
    if (res && res.data) {
      mfaEnabled.value = !!res.data.mfa_enabled
    }
  })

  const setExpiredAt = (days) => {
    if (days < 0) {
      form.value.expiredAtDate = null
    } else {
      form.value.expiredAtDate = String(Date.now() + days * 86400000)
    }
  }

</script>

<style lang="scss" scoped>
.form-card {
}
</style>
