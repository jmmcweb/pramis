"use server"

import prisma from "@/lib/prisma"
import { hash } from "bcrypt"
import { revalidateTag, revalidatePath } from "next/cache"
import { cacheLife, cacheTag } from "next/cache"
import { USERS_PER_PAGE } from "@/config/constants"
import { isValidEmail } from "@/lib/helper"
import { requireAdmin, requireUser, sanitizeUser, sanitizeUsers } from "@/lib/actions/guard"

const table = "user"
const MIN_PASSWORD_LENGTH = 8
const VALID_ROLES = ["SUPERADMIN", "ADMIN", "USER"]

async function getUserData(id: string) {
  'use cache'
  cacheTag('users')
  cacheLife('max')

  try {
    const user = await prisma[table].findFirst({ where: { id: +id, deletedAt: null } })
    return { success: true, payload: sanitizeUser(user) }
  } catch {
    return { success: false, payload: null, message: "Failed to get user" }
  }
}

export async function getUser(id: string) {
  // Any signed-in user reaching an admin surface; page-level guards still apply.
  if (!(await requireUser())) return { success: false, payload: null, message: "Not authorized" }
  return getUserData(id)
}

// GET ALL (paginated)
async function getUsersData(page: number, perPage: number) {
  'use cache'
  cacheTag('users')
  cacheLife('max')

  try {
    const skip = (page - 1) * perPage
    const [users, total] = await prisma.$transaction([
      prisma[table].findMany({
        where: { deletedAt: null },
        skip,
        take: perPage,
        orderBy: { id: "asc" },
      }),
      prisma[table].count({ where: { deletedAt: null } }),
    ])
    return {
      success: true,
      payload: sanitizeUsers(users),
      total,
      totalPages: Math.max(1, Math.ceil(total / perPage)),
    }
  } catch {
    return { success: false, payload: null, total: 0, totalPages: 1, message: "Failed to get users" }
  }
}

export async function getUsers(page: number = 1, perPage: number = USERS_PER_PAGE) {
  if (!(await requireAdmin())) return { success: false, payload: null, total: 0, totalPages: 1, message: "Not authorized" }
  return getUsersData(page, perPage)
}

export async function signupUser(_prevState: any, formData: FormData) {
  const name = formData.get("name")?.toString().trim()
  const email = formData.get("email")?.toString().trim()
  const password = formData.get("password")?.toString().trim()

  const errors: Record<string, string> = {}
  if (!name) errors.name = "Name is required."
  if (!email) errors.email = "Email is required."
  else if (!isValidEmail(email)) errors.email = "Please enter a valid email address."
  if (!password) errors.password = "Password is required."
  else if (password.length < MIN_PASSWORD_LENGTH)
    errors.password = `Password must be at least ${MIN_PASSWORD_LENGTH} characters long.`

  if (Object.keys(errors).length > 0) {
    return { success: false, errors, input: { name, email } }
  }

  return persistNewUser({ name: name!, email: email!, password: password!, role: "USER" })
}

export async function createUser(_prevState: any, formData: FormData) {
  if (!(await requireAdmin())) {
    return { success: false, message: "You are not authorized to perform this action." }
  }

  const name = formData.get("name")?.toString().trim()
  const email = formData.get("email")?.toString().trim()
  const password = formData.get("password")?.toString().trim()
  const role = formData.get("role")?.toString().trim() || "USER"
  const safeRole = VALID_ROLES.includes(role) ? role : "USER"

  const errors: Record<string, string> = {}
  if (!name) errors.name = "Name is required."
  if (!email) errors.email = "Email is required."
  else if (!isValidEmail(email)) errors.email = "Please enter a valid email address."
  if (!password) errors.password = "Password is required."
  else if (password.length < MIN_PASSWORD_LENGTH)
    errors.password = `Password must be at least ${MIN_PASSWORD_LENGTH} characters long.`

  if (Object.keys(errors).length > 0) {
    return { success: false, errors, input: { name, email } }
  }

  return persistNewUser({ name: name!, email: email!, password: password!, role: safeRole })
}

// Shared insert path for signup + admin create.
async function persistNewUser(data: { name: string; email: string; password: string; role: string }) {
  try {
    const userExist = await prisma[table].findFirst({ where: { email: data.email, deletedAt: null } })
    if (userExist) {
      return {
        success: false,
        message: [`Email ${data.email} already exists.`],
        input: { name: data.name, email: data.email },
      }
    }

    const user = await prisma[table].create({
      data: {
        name: data.name,
        email: data.email,
        password: await hash(data.password, 12),
        role: data.role as any,
      },
    })

    revalidateTag("users", "max")
    revalidatePath("/dashboard/users")

    return { success: true, message: "User created successfully", payload: sanitizeUser(user) }
  } catch {
    
    return { success: false, payload: null, message: "Failed to create user" }
  }
}

export async function softDeleteUser(id: string) {
  const session = await requireAdmin()
  if (!session) {
    return { success: false, payload: null, message: "You are not authorized to perform this action." }
  }

  const targetId = parseInt(id)
  if (Number.isNaN(targetId)) {
    return { success: false, payload: null, message: "Invalid user id." }
  }

  if (String(targetId) === String(session.user.id)) {
    return { success: false, payload: null, message: "You cannot delete your own account." }
  }

  try {
    const target = await prisma[table].findFirst({ where: { id: targetId, deletedAt: null } })
    if (!target) {
      return { success: false, payload: null, message: "User not found." }
    }

    // Only a SUPERADMIN may delete another SUPERADMIN.
    if (target.role === "SUPERADMIN" && session.user.role !== "SUPERADMIN") {
      return { success: false, payload: null, message: "You cannot delete a superadmin." }
    }

    const user = await prisma[table].update({
      where: { id: targetId },
      data: { deletedAt: new Date() },
    })

    revalidateTag("users", "max")
    revalidatePath("/dashboard/users")

    return { success: true, payload: sanitizeUser(user) }
  } catch {
    return { success: false, payload: null, message: "Failed to delete user" }
  }
}

export async function updateUser(_prevState: any, formData: FormData) {
  const session = await requireAdmin()
  if (!session) {
    return { success: false, message: "You are not authorized to perform this action." }
  }

  const id = formData.get("id")?.toString().trim()
  const name = formData.get("name")?.toString().trim()
  const email = formData.get("email")?.toString().trim()
  const role = formData.get("role")?.toString().trim() || "USER"
  const safeRole = VALID_ROLES.includes(role) ? role : "USER"

  const errors: Record<string, string> = {}
  if (!name) errors.name = "Name is required."
  if (!email) errors.email = "Email is required."
  else if (!isValidEmail(email)) errors.email = "Please enter a valid email address."

  if (Object.keys(errors).length > 0) {
    return { success: false, errors, input: { id, name, email, role } }
  }

  const targetId = parseInt(id!)
  if (Number.isNaN(targetId)) {
    return { success: false, message: "Invalid user id.", input: { id, name, email, role } }
  }

  try {
    const target = await prisma[table].findFirst({ where: { id: targetId, deletedAt: null } })
    if (!target) {
      return { success: false, message: "User not found.", input: { id, name, email, role } }
    }

    if (
      session.user.role !== "SUPERADMIN" &&
      (target.role === "SUPERADMIN" || safeRole === "SUPERADMIN")
    ) {
      return { success: false, message: "You cannot modify superadmin roles.", input: { id, name, email, role } }
    }

    const userExist = await prisma[table].findFirst({
      where: { email, NOT: { id: targetId } },
    })
    if (userExist) {
      return {
        success: false,
        message: `Email ${email} is already in use.`,
        input: { id, name, email, role },
      }
    }

    const user = await prisma[table].update({
      where: { id: targetId },
      data: { name, email, role: safeRole as any, updatedAt: new Date() },
    })

    revalidateTag("users", "max")
    revalidatePath("/dashboard/users")

    return { success: true, message: "User updated successfully.", payload: sanitizeUser(user) }
  } catch {
    return { success: false, payload: null, message: "Failed to update user." }
  }
}
