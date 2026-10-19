import { hashPassword, verifyPassword } from "./auth/password.js"

const myPassword1 = "abracatabra1";
const myPassword2 = "abracatabra2";

const startHash = performance.now();
const myPassword1_hash1 = await hashPassword(myPassword1);
const hashingTime = performance.now() - startHash;
const myPassword1_hash2 = await hashPassword(myPassword1);

console.log("Password 1: Hash 1: ", myPassword1_hash1);
console.log("Password 1: Hash 2: ", myPassword1_hash2);
console.log("1 Hash time:", hashingTime);


const ver1 = await verifyPassword(myPassword1, myPassword1_hash1);
const ver2 = await verifyPassword(myPassword2, myPassword1_hash1);

console.log("Verification Test 1: ", ver1);
console.log("Verification Test 2: ", ver2);