export function classroomStatusLabel(status: string): string {
  switch (status) {
    case "completed": return "Complete";
    case "cancelled": return "Cancelled";
    case "interrupted": return "Interrupted";
    case "active": return "In progress";
    default: return "Unknown";
  }
}
