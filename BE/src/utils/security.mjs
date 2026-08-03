import crypto from "node:crypto";

export function hashPassword(password) {
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, "airpath-static-salt", 64, (error, derivedKey) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(derivedKey.toString("hex"));
    });
  });
}

export function generateTemporaryPassword(length = 12) {
  const raw = crypto.randomBytes(Math.ceil(length * 0.75)).toString("base64url");
  return raw.slice(0, length);
}

