import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

function getBearerToken(req) {
  const auth = req.headers.get("authorization") || "";
  if (!auth.toLowerCase().startsWith("bearer ")) return null;
  return auth.slice(7).trim();
}

async function isRequesterAdmin(req) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const token = getBearerToken(req);
  if (!url || !anonKey || !token) return { ok: false, error: "No autorizado." };

  const sb = createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  const { data: userData, error: userErr } = await sb.auth.getUser(token);
  if (userErr || !userData?.user) return { ok: false, error: "Sesion invalida." };

  const metaRole = userData.user.user_metadata?.role || userData.user.app_metadata?.role;
  if (metaRole === "admin") return { ok: true, userId: userData.user.id };

  const admin = supabaseAdmin();
  const { data: roleData, error: roleErr } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", userData.user.id)
    .single();

  if (roleErr || roleData?.role !== "admin") return { ok: false, error: "Permisos insuficientes." };
  return { ok: true, userId: userData.user.id };
}

export async function POST(req) {
  try {
    const authCheck = await isRequesterAdmin(req);
    if (!authCheck.ok) {
      return Response.json({ error: authCheck.error }, { status: 403 });
    }

    const body = await req.json();
    const userId = String(body?.user_id || "").trim();
    const newPassword = String(body?.new_password || "");

    if (!userId) {
      return Response.json({ error: "Falta user_id." }, { status: 400 });
    }
    if (newPassword.length < 8) {
      return Response.json({ error: "La nueva contrasena debe tener al menos 8 caracteres." }, { status: 400 });
    }

    const admin = supabaseAdmin();
    const { error } = await admin.auth.admin.updateUserById(userId, {
      password: newPassword,
    });

    if (error) {
      return Response.json({ error: error.message || "No se pudo cambiar la contrasena." }, { status: 400 });
    }

    return Response.json({
      ok: true,
      message: "Contrasena actualizada correctamente.",
      session_refresh_required: authCheck.userId === userId,
    });
  } catch (e) {
    return Response.json({ error: e?.message || "Error desconocido." }, { status: 500 });
  }
}

export async function GET(req) {
  try {
    const authCheck = await isRequesterAdmin(req);
    if (!authCheck.ok) {
      return Response.json({ error: authCheck.error }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const q = String(searchParams.get("q") || "").trim().toLowerCase();
    const limit = Math.min(Math.max(Number(searchParams.get("limit") || 20), 1), 100);

    const admin = supabaseAdmin();
    const { data, error } = await admin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    if (error) {
      return Response.json({ error: error.message || "No se pudo listar usuarios." }, { status: 400 });
    }

    const users = (data?.users || [])
      .map((u) => {
        const fullName = String(
          u?.user_metadata?.full_name ||
            u?.user_metadata?.name ||
            u?.user_metadata?.nombre ||
            ""
        ).trim();
        return {
          id: u.id,
          email: String(u.email || ""),
          full_name: fullName,
          role: String(u?.user_metadata?.role || ""),
        };
      })
      .filter((u) => {
        if (!q) return true;
        return (
          u.email.toLowerCase().includes(q) ||
          u.full_name.toLowerCase().includes(q) ||
          u.id.toLowerCase().includes(q)
        );
      })
      .slice(0, limit);

    return Response.json({ users });
  } catch (e) {
    return Response.json({ error: e?.message || "Error desconocido." }, { status: 500 });
  }
}
