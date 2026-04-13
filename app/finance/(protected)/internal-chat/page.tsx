import InternalChatWorkspace from "@/app/internal-chat/InternalChatWorkspace"

export default function FinanceInternalChatPage({
  searchParams,
}: {
  searchParams: Promise<{ room_id?: string; error?: string }>
}) {
  return <InternalChatWorkspace portal="finance" searchParams={searchParams} />
}
