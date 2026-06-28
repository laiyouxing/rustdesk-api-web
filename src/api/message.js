import request from '@/utils/request'

export function list() {
  return request({ url: '/station_message/list' })
}

export function unreadCount() {
  return request({ url: '/station_message/unread_count' })
}

export function markRead(data) {
  return request({ url: '/station_message/mark_read', method: 'post', data })
}
