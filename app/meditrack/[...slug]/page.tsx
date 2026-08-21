import { redirect } from 'next/navigation'

export default async function MeditrackRedirect({
  params,
}: {
  params: Promise<{ slug: string[] }>
}) {
  const { slug } = await params
  const path = slug && slug.length > 0 ? '/' + slug.join('/') : ''
  redirect(`/staff${path}`)
}
