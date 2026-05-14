import InternalChatWorkspace from "@/app/internal-chat/InternalChatWorkspace"

export default function MarketingInternalChatPage({
  searchParams,
}: {
  searchParams: Promise<{ room_id?: string; error?: string }>
}) {
  return <InternalChatWorkspace portal="marketing" searchParams={searchParams} />
}
