import { Metadata } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { redirect } from 'next/navigation'
import { getUsers } from '@/lib/actions/user'
import UsersTable from '@/components/users/UsersTable'

export const metadata: Metadata = {
  title: 'Users',
  description: 'Manage users',
}

export default async function DashboardUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const session = await getServerSession(authOptions)

  if (!session || !['SUPERADMIN', 'ADMIN'].includes(session.user.role as string)) {
    redirect('/admin')
  }

  const params = await searchParams
  const page = Math.max(1, Number(params?.page) || 1)

  const res = await getUsers(page)

  return (
    <section className="main flex flex-col">
      <div className="main__header font-semibold py-3 px-5 border-b bg-gray-100 border-gray-100">
        Users
      </div>
      <div className="main__content py-3 px-5">
        <UsersTable
          users={(res.payload ?? []) as any[]}
          page={page}
          totalPages={res.totalPages ?? 1}
          total={res.total ?? 0}
        />
      </div>
    </section>
  )
}
