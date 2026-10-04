import { NextResponse } from "next/server"
import { getEvents, updateEvent, createEvent } from "@/lib/actions/event"
import { getServices, updateService } from "@/lib/actions/service"
import { getSession } from "@/lib/actions/guard"

export async function GET() {
  const session = await getSession()
  const out: any = { session: session ? { id: session.user?.id, role: session.user?.role } : null }
  const before: any = await getEvents()
  out.beforeArchiveLen = before.archive?.length
  const upd: any = await updateEvent({ id: "EVT-1002", title: "Blood Donation Program", date: "2026-09-20", time: "3:00pm to 5:00pm", type: "donation", status: "Done", description: "" })
  out.updateResult = upd
  const after: any = await getEvents()
  out.afterArchiveLen = after.archive?.length
  out.afterArchive = after.archive
  out.afterScheduledLen = after.scheduled?.length
  await updateEvent({ id: "EVT-1002", title: "Blood Donation Program", date: "2026-09-20", time: "3:00pm to 5:00pm", type: "donation", status: "Scheduled", description: "" })
  const svc: any = await updateService({ id: "SVC-1002", title: "Pre-natal Care", availability: false })
  out.serviceUpdate = svc
  const s2: any = await getServices()
  out.servicesAvailability = s2.services?.map((x:any)=>`${x.id}:${x.availability}`)
  await updateService({ id: "SVC-1002", title: "Pre-natal Care", availability: true })
  return NextResponse.json(out)
}
