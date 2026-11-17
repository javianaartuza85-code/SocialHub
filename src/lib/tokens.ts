import "server-only";
import { createHash, randomBytes } from "node:crypto";

/** Token aleatorio de 32 bytes, apto para URL. Solo se muestra una vez. */
export function newToken() {
  return randomBytes(32).toString("base64url");
}

/** Lo que se guarda en la base de datos: la huella SHA-256, nunca el token. */
export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}
