import request from '@/utils/request'

export function userLogin(data) {
  return request({
    url: '/login',
    method: 'post',
    data,
  })
}
export function userMfaLogin(data) {
  return request({
    url: '/login/mfa',
    method: 'post',
    data,
  })
}
export function userInfo(data) {
  return request({
    url: '/user/current',
    method: 'get',
    data,
  })
}
export function userLogout(data) {
  return request({
    url: '/logout',
    method: 'post',
    data,
  })
}
export function userCaptcha(data) {
  return request({
    url: '/captcha',
    method: 'get',
    data,
  })
}
export function userLoginOptions(data) {
  return request({
    url: '/login-options',
    method: 'get',
    data,
  })
}
export function changeCurPwd(data) {
  return request({
    url: '/user/changeCurPwd',
    method: 'post',
    data,
  })
}
export function groupUsersList(data) {
  return request({
    url: '/user/groupUsers',
    method: 'post',
    data,
  })
}
export function getUserList(data) {
  return request({
    url: '/user/list',
    method: 'get',
    data,
  })
}
export function getUserDetail(id) {
  return request({
    url: '/user/detail/' + id,
    method: 'get',
  })
}
export function userCreate(data) {
  return request({
    url: '/user/create',
    method: 'post',
    data,
  })
}
export function userUpdate(data) {
  return request({
    url: '/user/update',
    method: 'post',
    data,
  })
}
export function userDelete(data) {
  return request({
    url: '/user/delete',
    method: 'post',
    data,
  })
}
export function changePwd(data) {
  return request({
    url: '/user/changePwd',
    method: 'post',
    data,
  })
}
export function userMyOauth(data) {
  return request({
    url: '/user/myOauth',
    method: 'post',
    data,
  })
}
export function userRegister(data) {
  return request({
    url: '/user/register',
    method: 'post',
    data,
  })
}
export function mfaSetup(data) {
  return request({
    url: '/user/mfa/setup',
    method: 'post',
    data,
  })
}
export function mfaEnable(data) {
  return request({
    url: '/user/mfa/enable',
    method: 'post',
    data,
  })
}
export function mfaDisable(data) {
  return request({
    url: '/user/mfa/disable',
    method: 'post',
    data,
  })
}
export function mfaReset(data) {
  return request({
    url: '/user/mfa/reset',
    method: 'post',
    data,
  })
}
export function mfaStatus(data) {
  return request({
    url: '/user/mfa/status',
    method: 'get',
    data,
  })
}
export function userTokenBatchDelete(data) {
  return request({
    url: '/user_tokens/batchDelete',
    method: 'post',
    data,
  })
}

export function loginOptions(data) {
  return request({
    url: '/login-options',
    method: 'get',
    data,
  })
}

export function oidcAuth(data) {
  return request({
    url: '/oidc/auth',
    method: 'post',
    data,
  })
}
export function oidcAuthQuery(params) {
  return request({
    url: '/oidc/auth-query',
    method: 'get',
    params,
  })
}

export function invitationList(data) {
  return request({
    url: '/invitation/list',
    method: 'get',
    data,
  })
}
export function invitationCreate(data) {
  return request({
    url: '/invitation/create',
    method: 'post',
    data,
  })
}
export function invitationDelete(data) {
  return request({
    url: '/invitation/delete',
    method: 'post',
    data,
  })
}
export function invitationBatchCreate(data) {
  return request({
    url: '/invitation/batchCreate',
    method: 'post',
    data,
  })
}