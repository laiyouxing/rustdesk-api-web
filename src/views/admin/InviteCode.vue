<template>
  <div>
    <el-tabs v-model="activeTab" @tab-change="handleTabChange">
      <el-tab-pane :label="T('SubscribeInviteCodes')" name="subscribe">
        <SubscribeInviteCodes ref="subscribeRef" />
      </el-tab-pane>
      <el-tab-pane :label="T('RegistrationInviteCodes')" name="registration">
        <RegistrationInviteCodes ref="registrationRef" />
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { T } from '@/utils/i18n'
import SubscribeInviteCodes from './InviteCodeSubscribe.vue'
import RegistrationInviteCodes from './InviteCodeRegistration.vue'

const activeTab = ref('subscribe')
const subscribeRef = ref(null)
const registrationRef = ref(null)

const handleTabChange = () => {
  if (activeTab.value === 'subscribe' && subscribeRef.value?.getList) {
    subscribeRef.value.getList()
  }
  if (activeTab.value === 'registration' && registrationRef.value?.getList) {
    registrationRef.value.getList()
  }
}
</script>
