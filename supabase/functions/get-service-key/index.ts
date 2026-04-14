Deno.serve(async () => {
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "NOT_FOUND";
  return new Response(JSON.stringify({ SUPABASE_SERVICE_ROLE_KEY: key }), {
    headers: { "Content-Type": "application/json" },
  });
});
