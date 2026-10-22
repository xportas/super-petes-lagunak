import argon2 from "argon2";

const pwd = process.argv[2];
if (!pwd || pwd.length < 8) {
  console.error('Uso: node scripts/gen-admin-hash.mjs "VivaVigo1234!1234!" (min 8 chars)');
  process.exit(1);
}
const hash = await argon2.hash(pwd, { type: argon2.argon2id });
console.log(hash);
