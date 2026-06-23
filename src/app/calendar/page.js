'use client'
import dynamic from 'next/dynamic'

const ContentCalendar = dynamic(
  () => import('../../components/ContentCalendar'),
  { ssr: false }
)

export default function CalendarPage() {
  return <ContentCalendar />
}
