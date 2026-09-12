"use server"

import { cookies } from "next/headers"
import { signAdminToken } from "@/lib/auth"

export async function loginAction(formData: FormData): Promise<{
	success: boolean;
	error?: string;
}> {
  const userName = formData.get("username")
  const password = formData.get("password")

  if (
    userName === process.env.ADMIN_USERNAME &&
    password === process.env.ADMIN_PASSWORD
  ) {
    const token = await signAdminToken()

    const cookieStore = await cookies()
    cookieStore.set("admin_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    })

    return { success: true }
  }
  return { success: false, error: "wrong password or username" }
}