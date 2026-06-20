import { Link } from 'react-router-dom'
import { ArrowLeft, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/shared/PageStates'

export function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <PageHeader
        title="Page not found"
        description="This URL doesn't match any page. Use the sidebar or press ⌘K to search."
      />
      <div className="mt-8 flex flex-wrap justify-center gap-2">
        <Button variant="outline" size="sm" asChild>
          <Link to="/dashboard">
            <ArrowLeft className="mr-2 size-3.5" />
            Dashboard
          </Link>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))
          }}
        >
          <Search className="mr-2 size-3.5" />
          Search pages
        </Button>
      </div>
    </div>
  )
}
