"use server"

import prisma from "@/lib/prisma"
import { hash } from "bcrypt"
import { revalidateTag, revalidatePath } from "next/cache"
import { cacheLife, cacheTag } from "next/cache"
import { USERS_PER_PAGE } from "@/config/constants"
import { isValidEmail } from "@/lib/helper"
import { requireAdmin, requireUser, sanitizeUser, sanitizeUsers } from "@/lib/actions/guard"
import { nextReferenceId } from "@/lib/referenceId"

const table = "user"
const MIN_PASSWORD_LENGTH = 8
const VALID_ROLES = ["SUPERADMIN", "ADMIN", "USER"]

function displayName(user: any): string {
  const p = user?.profile
  if (p?.firstName || p?.lastName) {
    return `${p.firstName ?? ""} ${p.lastName ?? ""}`.trim()
  }
  return String(user?.email ?? "").split("@")[0]
}

async function getUserData(id: string) {
  'use cache'
  cacheTag('users')
  cacheLife('max')

  try {
    const user = await prisma[table].findFirst({ where: { id } })
    return { success: true, payload: sanitizeUser(user) }
  } catch {
    return { success: false, payload: null, message: "Failed to get user" }
  }
}

export async function getUser(id: string) {
  if (!(await requireUser())) return { success: false, payload: null, message: "Not authorized" }
  return getUserData(id)
}

async function getUsersData(page: number, perPage: number) {
  'use cache'
  cacheTag('users')
  cacheLife('max')

  try {
    const skip = (page - 1) * perPage
    const [users, total] = await prisma.$transaction([
      prisma[table].findMany({
        skip,
        take: perPage,
        orderBy: { createdAt: "asc" },
        include: { profile: true },
      }),
      prisma[table].count(),
    ])
    return {
      success: true,
      payload: sanitizeUsers(users.map((u: any) => ({ ...u, name: displayName(u) }))),
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

  const email = formData.get("email")?.toString().trim()
  const password = formData.get("password")?.toString().trim()
  const role = formData.get("role")?.toString().trim() || "USER"
  const safeRole = VALID_ROLES.includes(role) ? role : "USER"

  const errors: Record<string, string> = {}
  if (!email) errors.email = "Email is required."
  else if (!isValidEmail(email)) errors.email = "Please enter a valid email address."
  if (!password) errors.password = "Password is required."
  else if (password.length < MIN_PASSWORD_LENGTH)
    errors.password = `Password must be at least ${MIN_PASSWORD_LENGTH} characters long.`

  if (Object.keys(errors).length > 0) {
    return { success: false, errors, input: { email } }
  }

  return persistNewUser({ name: "", email: email!, password: password!, role: safeRole })
}

async function persistNewUser(data: { name: string; email: string; password: string; role: string }) {
  try {
    const userExist = await prisma[table].findFirst({ where: { email: data.email } })
    if (userExist) {
      return {
        success: false,
        message: [`Email ${data.email} already exists.`],
        input: { name: data.name, email: data.email },
      }
    }

    const user = await prisma[table].create({
      data: {
        id: await nextReferenceId("USR"),
        email: data.email,
        password: await hash(data.password, 12),
        role: data.role as any,
      },
    })

    revalidateTag("users", "max")
    revalidatePath("/admin/users")
    revalidatePath("/staff/users")

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

  const targetId = id?.toString().trim()
  if (!targetId) {
    return { success: false, payload: null, message: "Invalid user id." }
  }

  if (targetId === session.user.id) {
    return { success: false, payload: null, message: "You cannot delete your own account." }
  }

  try {
    const target = await prisma[table].findFirst({ where: { id: targetId } })
    if (!target) {
      return { success: false, payload: null, message: "User not found." }
    }

    if (target.role === "SUPERADMIN" && session.user.role !== "SUPERADMIN") {
      return { success: false, payload: null, message: "You cannot delete a superadmin." }
    }

    await prisma[table].delete({ where: { id: targetId } })

    revalidateTag("users", "max")
    revalidatePath("/admin/users")
    revalidatePath("/staff/users")

    return { success: true, payload: sanitizeUser(target) }
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
  const email = formData.get("email")?.toString().trim()
  const role = formData.get("role")?.toString().trim() || "USER"
  const safeRole = VALID_ROLES.includes(role) ? role : "USER"

  const errors: Record<string, string> = {}
  if (!email) errors.email = "Email is required."
  else if (!isValidEmail(email)) errors.email = "Please enter a valid email address."

  if (Object.keys(errors).length > 0) {
    return { success: false, errors, input: { id, email, role } }
  }

  if (!id) {
    return { success: false, message: "Invalid user id.", input: { id, email, role } }
  }

  try {
    const target = await prisma[table].findFirst({ where: { id } })
    if (!target) {
      return { success: false, message: "User not found.", input: { id, email, role } }
    }

    if (
      session.user.role !== "SUPERADMIN" &&
      (target.role === "SUPERADMIN" || safeRole === "SUPERADMIN")
    ) {
      return { success: false, message: "You cannot modify superadmin roles.", input: { id, email, role } }
    }

    const userExist = await prisma[table].findFirst({
      where: { email, NOT: { id } },
    })
    if (userExist) {
      return {
        success: false,
        message: `Email ${email} is already in use.`,
        input: { id, email, role },
      }
    }

    const user = await prisma[table].update({
      where: { id },
      data: { email, role: safeRole as any, updatedAt: new Date() },
    })

    revalidateTag("users", "max")
    revalidatePath("/admin/users")
    revalidatePath("/staff/users")

    return { success: true, message: "User updated successfully.", payload: sanitizeUser(user) }
  } catch {
    return { success: false, payload: null, message: "Failed to update user." }
  }
}