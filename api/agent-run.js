import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

export default async function handler(req, res) {
  try {
    const limit = Math.min(parseInt(req.query.limit || "5", 10), 50);

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

    const ids = tasks.map(t => t.id);
    await supabase.from("task_queue").update({ status: "completed" }).in("id", ids);

    return res.status(200).json({ processed: tasks.length });
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
}
