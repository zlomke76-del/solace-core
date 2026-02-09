import { generateKeyPairSync } from "crypto";
import fs from "fs";

const { privateKey, publicKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  publicKeyEncoding: { type: "pkcs1", format: "pem" },
  privateKeyEncoding: { type: "pkcs1", format: "pem" }
});

fs.writeFileSync("issuer.key", privateKey);
fs.writeFileSync("issuer.pub", publicKey);

console.log("Issuer keypair generated:");
console.log(" - issuer.key (PRIVATE, keep secret)");
console.log(" - issuer.pub (PUBLIC, safe to share)");
