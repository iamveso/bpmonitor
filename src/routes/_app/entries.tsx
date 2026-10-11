import { createFileRoute, Outlet } from '@tanstack/solid-router'

export const Route = createFileRoute('/_app/entries')({
  component: EntriesLayout,
})

function EntriesLayout() {
  return <Outlet />
}
