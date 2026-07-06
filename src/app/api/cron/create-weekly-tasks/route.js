import { NextResponse } from 'next/server';
import { appendTask } from '../../../../lib/tasksSheet';
import { RECURRING_WEEKLY_TASKS } from '../../../../lib/recurringTasks';

// Vercel Cron hits this route every Monday (see vercel.json). Secured with
// CRON_SECRET — Vercel automatically sends this as a Bearer token when it
// invokes the job, so no manual header wiring is needed on Vercel's side.
export const dynamic = 'force-dynamic';

export async function GET(request) {
  const authHeader = request.headers.get('authorization');
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const created = [];
  const failed = [];

  for (const template of RECURRING_WEEKLY_TASKS) {
    try {
      const task = await appendTask(template);
      created.push(task.id);
    } catch (err) {
      console.error(`Failed to create recurring task for ${template.client}:`, err);
      failed.push(template.client);
    }
  }

  return NextResponse.json({ success: true, created, failed });
}
