import request from '@/utils/request'

export function server () {
  return request({
    url: '/config/server',
    method: 'get',
  })
}

export function app () {
  return request({
    url: '/config/app',
    method: 'get',
  })
}

export function admin () {
  return request({
    url: '/config/admin',
    method: 'get',
  })
}

// 读取后端配置文件（config.yaml）原始内容
export function fileGet () {
  return request({
    url: '/config/file/get',
    method: 'get',
  })
}

// 保存后端配置文件（config.yaml）原始内容
export function fileUpdate (content) {
  return request({
    url: '/config/file/update',
    method: 'post',
    data: { content },
  })
}

// 重启后端服务进程（使配置生效），仅管理员
export function serviceRestart () {
  return request({
    url: '/config/restart',
    method: 'post',
  })
}
