export async function runReminderJob() {
  return { status: 'ok', job: 'reminder' as const }
}
