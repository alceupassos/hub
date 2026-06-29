import { NavSidebar } from '@/components/NavSidebar'
import { BrisaChat } from '@/components/BrisaChat'

interface Props {
  searchParams: Promise<{ agent?: string }>
}

export default async function ChatPage({ searchParams }: Props) {
  const { agent = 'brisa' } = await searchParams

  return (
    <div className="flex h-screen overflow-hidden bg-app-bg">
      <NavSidebar />

      <main className="flex flex-1 min-w-0 bg-app-bg">
        <div className="flex flex-col flex-1 min-w-0 bg-surface border-r border-border-base">
          <BrisaChat agentId={agent} />
        </div>
      </main>
    </div>
  )
}
