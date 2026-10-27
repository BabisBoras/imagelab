import { open } from "node:fs/promises";

const headPNG = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]); //"89 50 4E 47 0D 0A 1A 0A"
const headJPG = Buffer.from([0xFF, 0xD8, 0xFF]); //"FF D8 FF"
const headIHDR = Buffer.from([0x49, 0x48, 0x44, 0x52]);// "49 48 44 52";

export async function readHeader(path: string, size = 64 * 1024): Promise<Buffer> {
    const fh = await open(path, "r");
    try {
        const buf = Buffer.alloc(size);
        const { bytesRead } = await fh.read(buf, 0, size, 0);
        return buf.subarray(0, bytesRead);
    } finally {
        await fh.close();
    }
}

export function probeImage(header: Buffer) : {format: "png" | "jpg", width: number, height: number} | undefined
{
    if(!header) return;

    const isPNG = header.subarray(0, 8).equals(headPNG);
    const isJPG = header.subarray(0, 3).equals(headJPG);

    if(!isPNG && !isJPG) return;

    if(isPNG){
        if(header.length<24) return;
        const isIHDR = header.subarray(12, 16).equals(headIHDR);
        if(!isIHDR) return;
        const mWidth = header.readUInt32BE(16);
        const mHeight = header.readUInt32BE(20);
        return {format: "png", width: mWidth, height: mHeight};
    }
    if(isJPG){
        // find SOF
        let idx=2;
        while(idx<(header.length-3)){

            // looking for: FF C0, (where C0 can be: C0, C1, ... CF)
            // markerCode1 = FF (255 in 10 base)
            // markerCode2 = C0-CF (192 - 207) (exceptions: C4/196, C8/200, CC/204,)

            const markerCode1 = header.readUInt8(idx);

            if(markerCode1!==0xFF) return;
            
            const markerCode2 = header.readUInt8(idx+1);

            if(markerCode2>=0xC0 && markerCode2<=0xCF && markerCode2!==0xC4 && markerCode2!==0xC8 && markerCode2!==0xCC)
            {
                if(idx>=(header.length-8)) return;
                const mHeight = header.readUInt16BE(idx+5);
                const mWidth = header.readUInt16BE(idx+7);
                return {format: "jpg", width: mWidth, height: mHeight};
            }

            const size = header.readUInt16BE(idx+2);

            if(size<2) return;

            idx = idx+size+2;
        }

    }
}