import { describe, expect, test } from "vitest";
import {
  capacidadesDe,
  deniegaAnon,
  excluyeAdminDeRanking,
  puedeAdminEscribir,
  puedeEscribirAlineacionPropia,
  puedeLeerJornadas,
  puedeLeerPlantilla,
  rechazaAlineacionAdmin,
} from "./queries";
import { crearClienteServidor } from "./cliente";

describe("RLS DENY + admin-no-juega (RF-04)", () => {
  test("anon denegado", () => {
    expect(deniegaAnon()).toBe(false);
  });

  test("service_role tras sesión+rol: manager solo lee y escribe su alineación", () => {
    expect(puedeLeerPlantilla("manager")).toBe(true);
    expect(puedeLeerJornadas("manager")).toBe(true);
    expect(puedeEscribirAlineacionPropia("manager", true)).toBe(true);
    expect(puedeEscribirAlineacionPropia("manager", false)).toBe(false);
    expect(capacidadesDe("manager")).not.toContain("escribir:todo");
  });

  test("admin escribe todo pero alinear/rankear rechaza (E-17)", () => {
    expect(puedeAdminEscribir("admin")).toBe(true);
    expect(puedeAdminEscribir("manager")).toBe(false);
    expect(rechazaAlineacionAdmin("admin")).toBe(true);
    expect(rechazaAlineacionAdmin("manager")).toBe(false);
    expect(excluyeAdminDeRanking("admin")).toBe(true);
    expect(puedeEscribirAlineacionPropia("admin", true)).toBe(false);
  });

  test("crearClienteServidor exige env y usa service_role", () => {
    const prevUrl = process.env["SUPABASE_URL"];
    const prevKey = process.env["SUPABASE_SERVICE_ROLE_KEY"];
    const prevPub = process.env["NEXT_PUBLIC_SUPABASE_URL"];
    delete process.env["SUPABASE_URL"];
    delete process.env["SUPABASE_SERVICE_ROLE_KEY"];
    delete process.env["NEXT_PUBLIC_SUPABASE_URL"];
    expect(() => crearClienteServidor()).toThrow();
    process.env["SUPABASE_URL"] = "https://ejemplo.supabase.co";
    process.env["SUPABASE_SERVICE_ROLE_KEY"] = "clave-service-role";
    expect(crearClienteServidor().rol).toBe("service_role");
    if (prevUrl === undefined) {
      delete process.env["SUPABASE_URL"];
    } else {
      process.env["SUPABASE_URL"] = prevUrl;
    }
    if (prevKey === undefined) {
      delete process.env["SUPABASE_SERVICE_ROLE_KEY"];
    } else {
      process.env["SUPABASE_SERVICE_ROLE_KEY"] = prevKey;
    }
    if (prevPub === undefined) {
      delete process.env["NEXT_PUBLIC_SUPABASE_URL"];
    } else {
      process.env["NEXT_PUBLIC_SUPABASE_URL"] = prevPub;
    }
  });
});
