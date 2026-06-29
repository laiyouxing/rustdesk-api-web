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

export function send(data) {
  return request({ url: '/station_message/send', method: 'post', data })
}

export function broadcast(data) {
  return request({ url: '/station_message/broadcast', method: 'post', data })
}

export function cleanup(data) {
  return request({ url: '/station_message/cleanup', method: 'post', data })
}
