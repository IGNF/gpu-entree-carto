<script setup lang="ts">
import { computed, markRaw } from 'vue'
import { useScheme } from '@gouvminint/vue-dsfr'
import { Notivue, Notification } from 'notivue'
import NotificationInfo from '@/components/notifications/icons/NotificationInfo.vue'
import NotificationSuccess from '@/components/notifications/icons/NotificationSuccess.vue'
import NotificationError from '@/components/notifications/icons/NotificationError.vue'
import NotificationWarning from '@/components/notifications/icons/NotificationWarning.vue'
import NotificationClose from '@/components/notifications/icons/NotificationClose.vue'
import { resolveCartoNotificationsTheme } from '@/lib/notifications/cartoNotificationsTheme'

const scheme = useScheme()

const notificationIcons = {
  warning: markRaw(NotificationWarning),
  success: markRaw(NotificationSuccess),
  info: markRaw(NotificationInfo),
  error: markRaw(NotificationError),
  close: markRaw(NotificationClose),
}

const notificationsTheme = computed(() =>
  resolveCartoNotificationsTheme(scheme?.theme.value === 'dark'),
)
</script>

<template>
  <Notivue v-slot="item">
    <Notification :item="item" :icons="notificationIcons" :theme="notificationsTheme" />
  </Notivue>
</template>
