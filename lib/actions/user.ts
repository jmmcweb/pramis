// Guarded, exported entry point: verifies the caller is a user
"use server"

import prisma from "@/lib/prisma"
import { hash } from "bcrypt"
import { revalidateTag, revalidatePath } from "next/cache"
import { cacheLife, cacheTag } from "next/cache"
import { USERS_PER_PAGE } from "@/config/constants"
import { isValidEmail } from "@/lib/helper"
import { requireAdmin, requireUser, sanitizeUser, sanitizeUsers } from "@/lib/actions/guard"
import { recordAudit } from "@/lib/actions/audit"
import { nextReferenceId } from "@/lib/referenceId"

const table = "user"
const MIN_PASSWORD_LENGTH = 8
const VALID_ROLES = ["SUPERADMIN", "ADMIN", "USER"]

// Displays a user's name based on their profile information. If the user has a first and/or last name, it returns the full name; otherwise, it defaults to using the email prefix (the part before the '@' symbol) as the display name.
function displayName(user: any): string {
  const p = user?.profile
  if (p?.firstName || p?.lastName) {
    return `${p.firstName ?? ""} ${p.lastName ?? ""}`.trim()
  }
  return String(user?.email ?? "").split("@")[0]
}

// Fetches a user's data from the database based on their ID. It retrieves the user record and sanitizes it to remove sensitive information before returning it. If the user is not found or an error occurs during the database query, it returns a failure status with a null payload and an error message.
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

// Retrieves a user's data based on their ID, ensuring that the caller is an authenticated user. If the caller is not authorized, it returns a failure status with a null payload and an error message. Otherwise, it fetches the user's data using the getUserData function.
export async function getUser(id: string) {
  if (!(await requireUser())) return { success: false, payload: null, message: "Not authorized" }
  return getUserData(id)
}

// Fetches a paginated list of users from the database, including their profile information. It calculates the total number of users and the total number of pages based on the specified page and perPage parameters. The function sanitizes the user data to remove sensitive information before returning it. If an error occurs during the database query, it returns a failure status with an empty payload and an error message.
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

// Retrieves a paginated list of users, ensuring that the caller is an authenticated admin. If the caller is not authorized, it returns a failure status with an empty payload and an error message. Otherwise, it fetches the users' data using the getUsersData function.
export async function getUsers(page: number = 1, perPage: number = USERS_PER_PAGE) {
  if (!(await requireAdmin())) return { success: false, payload: null, total: 0, totalPages: 1, message: "Not authorized" }
  return getUsersData(page, perPage)
}

// Creates a new user account based on the provided form data. It validates the input fields (name, email, password) and checks for existing users with the same email. If the input is valid and the email is unique, it hashes the password and creates a new user record in the database. The function returns a success status, message, and sanitized user data if successful; otherwise, it returns an error message and any validation errors.
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

// Creates a new user account in the database with the provided data. It checks for existing users with the same email, hashes the password, and creates a new user record. The function also revalidates relevant cache tags and paths to ensure that the user list is updated. It returns a success status, message, and sanitized user data if successful; otherwise, it returns an error message.
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

// Creates a new user in the database with the provided data. It checks for existing users with the same email, hashes the password, and creates a new user record. The function also revalidates relevant cache tags and paths to ensure that the user list is updated. It returns a success status, message, and sanitized user data if successful; otherwise, it returns an error message.
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

    await recordAudit({
      action: "CREATE",
      entity: "USER",
      entityId: user.id,
      description: `Created user account ${data.email} with role ${data.role}.`,
      metadata: { email: data.email, role: data.role },
    })

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

    await recordAudit({
      action: "DELETE",
      entity: "USER",
      entityId: targetId,
      description: `Deleted user account ${(target as any).email}.`,
      metadata: { email: (target as any).email, role: (target as any).role },
    })

    return { success: true, payload: sanitizeUser(target) }
  } catch {
    return { success: false, payload: null, message: "Failed to delete user" }
  }
}

// Updates a user's information based on the provided form data. It validates the input fields (email, role) and checks for existing users with the same email. If the input is valid and the email is unique, it updates the user record in the database. The function returns a success status, message, and sanitized user data if successful; otherwise, it returns an error message and any validation errors.
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

    await recordAudit({
      action: "UPDATE",
      entity: "USER",
      entityId: id,
      description: `Updated user account ${email} (role: ${safeRole}).`,
      metadata: {
        email,
        previousRole: (target as any).role,
        role: safeRole,
      },
    })

    return { success: true, message: "User updated successfully.", payload: sanitizeUser(user) }
  } catch {
    return { success: false, payload: null, message: "Failed to update user." }
  }
}