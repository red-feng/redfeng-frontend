import InternalChatWorkspace from "@/app/internal-chat/InternalChatWorkspace"

export default function AdminInternalChatPage({
  searchParams,
}: {
  searchParams: Promise<{ room_id?: string; error?: string }>
}) {
  return <InternalChatWorkspace portal="admin" searchParams={searchParams} />
}
