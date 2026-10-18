import {
  randomBytes,
  randomUUID,
  scrypt,
  timingSafeEqual
} from 'node:crypto'
import { promisify } from 'node:util'

import { db } from '../db.js'
import {
  createLocalUser,
  createSession,
  findAllUsers,
  findUserBySession,
  findUserByUsername,
  transferOwnership,
  updateUserRole
} from '../repositories/userRepository.js'
import { readCookie } from '../middleware/auth.js'
import { createOperationLog } from '../repositories/logRepository.js'

// ---------- 基础配置 ----------

const scryptAsync = promisify(scrypt)

const SESSION_COOKIE = 'media_session'
const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000

const ADMIN_ROLES = new Set(['owner', 'admin'])
const MEMBER_ROLES = new Set([
  'owner',
  'admin',
  'designer',
  'viewer'
])

// 上线使用 HTTPS 后设置 COOKIE_SECURE=true。
// 本地 HTTP 调试不要设为 true，否则浏览器不会正常发送登录 Cookie。
const COOKIE_SECURE = process.env.COOKIE_SECURE === 'true'

const HASH_PATTERN = /^[0-9a-f]{128}$/i

// 不存在的账号也进行一次密码计算，减少明显的响应时间差异。
const DUMMY_HASH = Buffer.alloc(64)

// ---------- 公共工具 ----------

function readText(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function readPassword(value) {
  // 密码不能 trim，否则会改变用户输入的密码。
  return typeof value === 'string' ? value : ''
}

function publicUser(user) {
  if (!user) return null

  return {
    id: user.id,
    username: user.username ?? null,
    nickname: user.nickname,
    avatarUrl: user.avatarUrl ?? null,
    role: user.role
  }
}

function isAdmin(user) {
  return ADMIN_ROLES.has(user?.role)
}

function denyAdminAccess(response) {
  return response.status(403).json({
    message: '只有所有者或管理员可以执行此操作。'
  })
}

export async function hashPassword(password, username) {
  // 与现有数据库中的密码格式保持一致。
  // 使用异步 scrypt，避免同步计算阻塞 Node 主线程。
  return Buffer.from(
    await scryptAsync(password, username, 64)
  )
}

function setSessionCookie(response, token) {
  response.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: COOKIE_SECURE,
    path: '/',
    maxAge: SESSION_DURATION_MS
  })
}

// ---------- 禁用公开建号入口 ----------

export function register(_request, response) {
  return response.status(403).json({
    message: '注册已关闭，请联系管理员创建账号。'
  })
}

// ---------- 当前登录用户 ----------

export async function currentUser(request, response, next) {
  try {
    response.setHeader('Cache-Control', 'no-store')

    const token = readCookie(request, SESSION_COOKIE)

    if (!token) {
      return response.json({ data: null })
    }

    const user = await findUserBySession(token)

    return response.json({
      data: publicUser(user)
    })
  } catch (error) {
    next(error)
  }
}

// ---------- 账号密码登录 ----------

export async function login(request, response, next) {
  try {
    response.setHeader('Cache-Control', 'no-store')

    const username = readText(request.body?.username)
    const password = readPassword(request.body?.password)

    if (!username || !password) {
      return response.status(400).json({
        message: '请输入账号和密码。'
      })
    }

    // 不给旧账号增加最低密码长度要求。
    // 上限仅用于拒绝异常大的登录输入。
    if (username.length > 30 || password.length > 4096) {
      return response.status(400).json({
        message: '账号或密码长度超出限制。'
      })
    }

    const user = await findUserByUsername(username)

    const validStoredHash =
      typeof user?.passwordHash === 'string' &&
      HASH_PATTERN.test(user.passwordHash)

    // 使用数据库保存的账号计算，兼容数据库不区分大小写的查询。
    const salt = user?.username || username
    const candidateHash = await hashPassword(password, salt)

    const storedHash = validStoredHash
      ? Buffer.from(user.passwordHash, 'hex')
      : DUMMY_HASH

    const passwordMatches = timingSafeEqual(
      candidateHash,
      storedHash
    )

    if (!user || !validStoredHash || !passwordMatches) {
      return response.status(401).json({
        message: '账号或密码错误。'
      })
    }

    const token = randomBytes(32).toString('hex')
    const expiresAt = new Date(
      Date.now() + SESSION_DURATION_MS
    ).toISOString()

    const previousToken = readCookie(
      request,
      SESSION_COOKIE
    )

    await db.transaction(async () => {
      await createSession(token, user.id, expiresAt)

      await createOperationLog({
        userId: user.id,
        action: 'login',
        targetType: 'user',
        targetId: user.id
      })

      // 登录成功后淘汰当前浏览器原来的会话，
      // 不影响其他浏览器或设备的登录。
      if (previousToken) {
        await db.prepare(
          'DELETE FROM sessions WHERE token = ?'
        ).run(previousToken)
      }
    })

    setSessionCookie(response, token)

    return response.json({
      data: publicUser(user)
    })
  } catch (error) {
    next(error)
  }
}

// ---------- 查看成员 ----------

export async function listMembers(request, response, next) {
  try {
    if (!request.user) {
      return response.status(401).json({
        message: '请先登录。'
      })
    }

    response.setHeader('Cache-Control', 'no-store')

    const members = await findAllUsers()

    // 保留已登录成员查看团队名单的原有功能。
    return response.json({
      data: members.map(member => ({
        ...publicUser(member),
        createdAt: member.createdAt
      }))
    })
  } catch (error) {
    next(error)
  }
}

// ---------- 管理员创建账号 ----------

export async function createMember(request, response, next) {
  try {
    if (!isAdmin(request.user)) {
      return denyAdminAccess(response)
    }

    const username = readText(request.body?.username)
    const nickname = readText(request.body?.nickname)
    const password = readPassword(request.body?.password)

    if (!username || username.length > 30) {
      return response.status(400).json({
        message: '账号不能为空，且不能超过30个字。'
      })
    }

    if (!nickname || nickname.length > 30) {
      return response.status(400).json({
        message: '名字不能为空，且不能超过30个字。'
      })
    }

    if (password.length < 9 || password.length > 128) {
      return response.status(400).json({
        message: '新账号密码需要9到128位。'
      })
    }

    if (await findUserByUsername(username)) {
      return response.status(409).json({
        message: '账号已存在，请换一个账号。'
      })
    }

    const passwordHash = (
      await hashPassword(password, username)
    ).toString('hex')

    const member = await db.transaction(async () => {
      const user = await createLocalUser({
        id: randomUUID(),
        username,
        nickname,
        avatarUrl: null,
        passwordHash
      })

      // 忽略请求中可能携带的 role。
      // 创建接口只能创建美工，提权走单独的权限接口。
      const updated = await updateUserRole(
        user.id,
        'designer'
      )

      if (!updated) {
        throw new Error('设置成员角色失败。')
      }

      await createOperationLog({
        userId: request.user.id,
        action: 'create',
        targetType: 'user',
        targetId: user.id,
        details: {
          username,
          nickname
        }
      })

      return {
        id: user.id,
        username,
        nickname,
        avatarUrl: null,
        role: 'designer'
      }
    })

    response.setHeader('Cache-Control', 'no-store')

    // 不创建会话，不设置 Cookie，不返回密码哈希。
    return response.status(201).json({
      data: member
    })
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return response.status(409).json({
        message: '账号已存在，请换一个账号。'
      })
    }

    next(error)
  }
}

// ---------- 修改成员权限 ----------

export async function changeMemberRole(request, response, next) {
  try {
    if (!isAdmin(request.user)) {
      return denyAdminAccess(response)
    }

    const role = readText(request.body?.role)
    const targetId = readText(request.params.id)

    if (!MEMBER_ROLES.has(role)) {
      return response.status(400).json({
        message: '无效的成员角色。'
      })
    }

    const members = await findAllUsers()
    const target = members.find(
      member => member.id === targetId
    )

    if (!target) {
      return response.status(404).json({
        message: '成员不存在。'
      })
    }

    if (target.role === role) {
      return response.json({
        data: {
          ...publicUser(target),
          createdAt: target.createdAt
        }
      })
    }

    if (target.role === 'owner') {
      return response.status(400).json({
        message: '请先把所有者身份转移给其他成员。'
      })
    }

    if (role === 'owner' && request.user.role !== 'owner') {
      return response.status(403).json({
        message: '只有当前所有者可以转移所有者身份。'
      })
    }

    await db.transaction(async () => {
      if (role === 'owner') {
        await transferOwnership(target.id)
      } else {
        const updated = await updateUserRole(
          target.id,
          role
        )

        if (!updated) {
          throw new Error('修改成员角色失败。')
        }
      }

      await createOperationLog({
        userId: request.user.id,
        action: 'role',
        targetType: 'user',
        targetId: target.id,
        details: { role }
      })
    })

    const updatedMembers = await findAllUsers()
    const updatedMember = updatedMembers.find(
      member => member.id === target.id
    )

    return response.json({
      data: updatedMember
        ? {
            ...publicUser(updatedMember),
            createdAt: updatedMember.createdAt
          }
        : null
    })
  } catch (error) {
    next(error)
  }
}
