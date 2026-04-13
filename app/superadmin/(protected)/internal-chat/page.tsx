import InternalChatWorkspace from "@/app/internal-chat/InternalChatWorkspace"

export default function SuperadminInternalChatPage({
  searchParams,
}: {
  searchParams: Promise<{ room_id?: string; error?: string }>
}) {
  return <InternalChatWorkspace portal="superadmin" searchParams={searchParams} />
}
