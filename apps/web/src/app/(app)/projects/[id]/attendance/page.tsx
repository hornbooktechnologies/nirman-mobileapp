import { AttendancePage } from "@/features/attendance";

interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function AttendanceRoute({ params }: PageProps) {
    const { id } = await params;
    return <AttendancePage projectId={id} />;
}
