import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

function bearer(req) {
  const auth = req.headers.get("authorization") || "";
  if (!auth.toLowerCase().startsWith("bearer ")) return "";
  return auth.slice(7).trim();
}

function lower(v) {
  return String(v || "").trim().toLowerCase();
}

export async function POST(req) {
  try {
    const token = bearer(req);
    if (!token) return Response.json({ error: "No autorizado." }, { status: 401 });

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anon) {
      return Response.json({ error: "Faltan variables de Supabase." }, { status: 500 });
    }

    const pairEmail1 = lower(process.env.PASSWORD_PAIR_EMAIL_1);
    const pairEmail2 = lower(process.env.PASSWORD_PAIR_EMAIL_2);
    const pairId1 = String(process.env.PASSWORD_PAIR_USER_ID_1 || "").trim();
    const pairId2 = String(process.env.PASSWORD_PAIR_USER_ID_2 || "").trim();
    if (!pairEmail1 || !pairEmail2 || !pairId1 || !pairId2) {
      return Response.json(
        { error: "Configura PASSWORD_PAIR_EMAIL_1/2 y PASSWORD_PAIR_USER_ID_1/2 en .env.local." },
        { status: 500 }
      );
    }

    const client = createClient(url, anon, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });

    const { data: userData, error: userErr } = await client.auth.getUser(token);
    if (userErr || !userData?.user) {
      return Response.json({ error: "Sesion invalida." }, { status: 401 });
    }

    const requesterEmail = lower(userData.user.email);
    if (requesterEmail !== pairEmail1 && requesterEmail !== pairEmail2) {
      return Response.json({ error: "Solo Usuario 1 o Usuario 2 puede usar esta accion." }, { status: 403 });
    }

    const body = await req.json();
    const currentPassword = String(body?.current_password || "");
    const newPassword = String(body?.new_password || "");

    if (!currentPassword || !newPassword) {
      return Response.json({ error: "Faltan datos de contrasena." }, { status: 400 });
    }
    if (newPassword.length < 8) {
      return Response.json({ error: "La nueva contrasena debe tener al menos 8 caracteres." }, { status: 400 });
    }

    const verify = await client.auth.signInWithPassword({
      email: userData.user.email,
      password: currentPassword,
    });
    if (verify.error) {
      return Response.json({ error: "La contrasena actual es incorrecta." }, { status: 401 });
    }

    const admin = supabaseAdmin();
    const update1 = await admin.auth.admin.updateUserById(pairId1, { password: newPassword });
    if (update1.error) {
      return Response.json({ error: update1.error.message || "No se pudo actualizar Usuario 1." }, { status: 400 });
    }
    const update2 = await admin.auth.admin.updateUserById(pairId2, { password: newPassword });
    if (update2.error) {
      return Response.json({ error: update2.error.message || "No se pudo actualizar Usuario 2." }, { status: 400 });
    }

    return Response.json({
      ok: true,
      message: "Contrasena sincronizada para Usuario 1 y Usuario 2.",
      session_refresh_required: true,
    });
  } catch (e) {
    return Response.json({ error: e?.message || "Error desconocido." }, { status: 500 });
  }
}
