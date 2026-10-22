import { scrypt, randomBytes, timingSafeEqual } from "node:crypto";

const dummyPassword = "AnteNaSeDwTwraPwsThaToVreisAyto13243546!#@$%|^";
const dummyPasswordHashStored = await hashPassword(dummyPassword);


function scryptAsync(password: string, salt: Buffer) : Promise<Buffer>{
    return new Promise((resolve, reject)=>{
        scrypt(password, salt, 64, { N: 2 ** 17, maxmem: 256 * 1024 * 1024 }, (err, key) => {
            if(err) reject(err);
            else resolve(key);
        })
    });
}

export async function hashPassword(password: string): Promise<string>{
    const salt = randomBytes(16);
    const key = await scryptAsync(password, salt);
    return `${salt.toString("hex")}:${key.toString("hex")}`;
}

export async function verifyPasswordDummy() : Promise<boolean>{
    await verifyPassword(dummyPassword, dummyPasswordHashStored);
    return false;
}


export async function verifyPassword(password: string, stored: string) : Promise<boolean>{
    const tokens = stored.split(":");
    if(tokens.length!==2){
        // Wrong stored data format
        return false;
    }
    if(!tokens[0] || !tokens[1]){
        // At least one empty stored data
        return false;
    }
    
    const storedSalt = Buffer.from(tokens[0],"hex");
    const storedKey = Buffer.from(tokens[1],"hex");

    const key = await scryptAsync(password, storedSalt);

    if(key.length!==storedKey.length){
        // Mismatch between the key length and the stored key length; the stored hash is likely corrupted
        return false;
    }

    return timingSafeEqual(key,storedKey);
}