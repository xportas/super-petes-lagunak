export type Rol = "manager" | "admin";
export type AlcanceRateLimit = "login" | "cambiar_password" | "registro";
export type PasoOnboarding = 1 | 2 | "completado";

export interface UsuarioAuth {
  readonly id: string;
  readonly usernameDisplay: string;
  readonly usernameNorm: string;
  readonly hashPassword: string;
  readonly rol: Rol;
  readonly esTemporal: boolean;
  readonly onboardingPaso: PasoOnboarding;
  readonly onboardingCompletadoAt: Date | null;
  readonly creadoAt: Date;
}

export interface Sesion {
  readonly id: string;
  readonly usuarioId: string;
  readonly tokenHash: string;
  readonly creadaAt: Date;
  readonly expiraAt: Date;
  readonly ultimaRenovacionAt: Date;
  readonly revocadaAt: Date | null;
  readonly creadaDesdeTemporal: boolean;
}

export interface InvitacionLiga {
  readonly id: string;
  readonly codigoNorm: string;
  readonly activa: boolean;
  readonly creadaAt: Date;
}

export interface FilaRateLimit {
  readonly alcance: AlcanceRateLimit;
  readonly sujeto: string;
  readonly intentos: number;
  readonly primerFalloAt: Date;
  readonly bloqueadoHasta: Date | null;
}

export type DestinoGuardia =
  | { readonly a: "/login" }
  | { readonly a: "/cambiar-password" }
  | { readonly a: "/onboarding"; readonly paso: 1 | 2 }
  | { readonly a: "/" }
  | { readonly a: "/admin" }
  | { readonly a: "permitir" };
