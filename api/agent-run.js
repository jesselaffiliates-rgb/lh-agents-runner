import { createClient } from "@supabase/supabase-js";
import { sheetWrite } from "../tools/sheetWrite.js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  try {
    const limit = Math.min(parseInt(req.query.limit || "5", 10), 50);

    // get pending tasks
    const { data: tasks, error } = await supabase
      .from("task_queue")
      .select("*")
      .eq("status", "pending")
      .lte("scheduled_for", new Date().toISOString())
      .order("priority", { ascending: true })
      .order("created_at", { ascending: true })
      .limit(limit);

    if (error) throw error;
    if (!tasks?.length) return res.status(200).json({ processed: 0 });

    let processed = 0;

    for (const t of tasks) {
      try {
        // ✅ If task payload includes a sheetId, write to Google Sheets
        if (t.payload?.sheetId) {
          const updated = await sheetWrite({
            spreadsheetId: t.payload.sheetId,
            range: t.payload.range || "Sheet1!A1",
            values: [[
              new Date().toISOString(),
              t.task_type,
              JSON.stringify(t.payload || {})
            ]]
          });

          await supabase.from("audit_logs").insert({
            task_id: t.id,
            agent_id: t.agent_id,
            input: t.payload,
            output: { wrote: updated }
          });
        }

        // mark task completed
        await supabase
          .from("task_queue")
          .update({ status: "completed", completed_at: new Date().toISOString() })
          .eq("id", t.id);

        processed++;
      } catch (e) {
        // mark as failed if something breaks
        await supabase.from("task_queue").update({ status: "failed" }).eq("id", t.id);
      }
    }

    return res.status(200).json({ processed });
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
}
