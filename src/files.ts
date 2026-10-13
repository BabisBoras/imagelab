import { stat, readdir } from "node:fs/promises";

const names = await readdir("samples/");
let totalSize = 0;


let startTime = performance.now();
for(const name of names){
    const info = await stat("samples/"+name);
    console.log(name, info.size);
    totalSize += info.size;
}
let totalTime = performance.now() - startTime;
console.log("1. Total size:", totalSize, "bytes. Total time:", totalTime, "ms.");




startTime = performance.now();
const promises = names.map((name) => stat("samples/"+name));

const stats = await Promise.all(promises);
totalSize = 0;
for(let i=0 ; i<stats.length; i++){
    const mStat = stats[i];
    const mName = names[i];
    if(mName && mStat){
        totalSize += mStat.size;
        console.log(mName, mStat.size);
    }
}
totalTime = performance.now() - startTime;
console.log("2. Total size:", totalSize, "bytes. Total time:", totalTime, "ms.");



totalSize = 0;
startTime = performance.now();
const mapResProm = await Promise.all(
    names.map( async (name) => {
        const info = await stat("samples/" + name)
        return { name, size : info.size};
    })
);

for(const r of mapResProm){
    totalSize += r.size;
    console.log(r.name, r.size);
}
totalTime = performance.now() - startTime;
console.log("3. Total size:", totalSize, "bytes. Total time:", totalTime, "ms.");
