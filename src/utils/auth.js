const TokenKey = 'access_token'
const OidcCode = 'oidc_code'
const OidcCodeExpiry = 'oidc_code_expiry';

// token 由后端通过 HttpOnly Cookie 下发，前端 JS 不可读写，从根本上消除 XSS 盗取风险。
// 因此不再用 localStorage 存储 token；以下函数保留签名以兼容调用点，但不再持久化。
export function getToken () {
  return ''
}

export function setToken (token) {
  // no-op: token 存于 HttpOnly Cookie，前端不接触
  return
}

export function removeToken () {
  // no-op: 登出由后端清除 Cookie（见 store/user.js logout）
  return
}

// 设置 code，并存储当前时间戳（单位：毫秒）
export function setCode(code) {
  const now = Date.now(); // 当前时间戳（毫秒）
  const expiry = now + 60 * 1000; // 60 秒后过期

  localStorage.setItem(OidcCode, code); // 存储 code
  localStorage.setItem(OidcCodeExpiry, expiry); // 存储过期时间戳
}

// 获取 code，如果已过期则删除并返回 null
export function getCode() {
  const expiry = localStorage.getItem(OidcCodeExpiry); // 获取过期时间戳
  const now = Date.now(); // 当前时间戳

  if (expiry && now > parseInt(expiry)) {
    // 如果已过期，删除 code 和过期时间
    removeCode();
    return null;
  }
  return localStorage.getItem(OidcCode); // 返回 code（如果未过期）
}

// 删除 code 和过期时间
export function removeCode() {
  localStorage.removeItem(OidcCode);
  localStorage.removeItem(OidcCodeExpiry);
}
