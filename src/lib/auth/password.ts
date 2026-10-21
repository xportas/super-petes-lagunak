import argon2 from "argon2";

const OPCIONES = {
  type: argon2.argon2id,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
} as const;

export async function hashearPassword(password: string): Promise<string> {
  return argon2.hash(password, {
    type: OPCIONES.type,
    memoryCost: OPCIONES.memoryCost,
    timeCost: OPCIONES.timeCost,
    parallelism: OPCIONES.parallelism,
  });
}

export async function verificarPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  try {
    return await argon2.verify(hash, password);
  } catch {
    return false;
  }
}
