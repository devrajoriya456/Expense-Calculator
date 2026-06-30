import { auth } from "@/lib/nextauth-config"

export async function getSession() {
  try {
    const session = await auth()
    return session
  } catch {
    return null
  }
}



