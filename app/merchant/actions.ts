"use server"

import { createClient } from "../../lib/supabase/server"

export async function createTour(formData: FormData) {
  const supabase = await createClient()

  const title = formData.get("title") as string

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return

  await supabase.from("tours").insert({
    title,
    user_id: user.id,
    status: "draft",
  })
}