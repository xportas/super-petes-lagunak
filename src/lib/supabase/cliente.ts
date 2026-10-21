export interface ConfigServidorSupabase {
  readonly url: string;
  readonly serviceRoleKey: string;
}

export interface ClienteServidorSupabase {
  readonly url: string;
  readonly rol: "service_role";
}

function leerEnv(nombre: string): string | null {
  const v = process.env[nombre];
  if (typeof v === "string" && v.length > 0) {
    return v;
  }
  return null;
}

export function crearClienteServidor(): ClienteServidorSupabase {
  const url =
    leerEnv("SUPABASE_URL") ?? leerEnv("NEXT_PUBLIC_SUPABASE_URL");
  const key = leerEnv("SUPABASE_SERVICE_ROLE_KEY");
  if (url === null || key === null) {
    throw new Error(
      "[supabase] Falta SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en el servidor",
    );
  }
  return { url, rol: "service_role" };
}

export function crearClienteSupabase(): never {
  throw new Error("no implementado — usar crearClienteServidor (spec-03)");
}
