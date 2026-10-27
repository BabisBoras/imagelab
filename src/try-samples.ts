import { readdir } from "node:fs/promises";
import { readHeader, probeImage } from "./images/probe.js"


async function testSamplesHeaders(){
    const names = await readdir("samples/");

    for(const name of names){
        const header = await readHeader("samples/"+name);

        const result = probeImage(header);

        console.log("File_"+name+": "+JSON.stringify(result));

    }
    
}

await testSamplesHeaders();