'use client'
import { useParams } from 'next/navigation'
import ApplyFlow from '../../../components/ApplyFlow'

export default function ApplyCourse() {
  const { id } = useParams()
  return <ApplyFlow initialCourseId={id} />
}
