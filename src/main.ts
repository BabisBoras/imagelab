import { type JobStatus, isFinished, statusLabel, parseWidth, type Job } from "./jobs.js";


const job: Job = {
    id: "GammaCorrection",
    imageId: "image1",
    status: "queued"
}
let status: JobStatus = "queued";

job.status = "running"; // This is valid because "running" is a valid JobStatus value.

console.log(isFinished("done")); // true
console.log(isFinished("running")); // false

const r = parseWidth("800");

if(r.ok){
    console.log("Parsed width:", r.value);
}else{
    console.log("Error:", r.error);
}

console.log(parseWidth("800")); 
console.log(parseWidth("")); 
console.log(parseWidth("8.5")); 
console.log(parseWidth("Infinity"));
console.log(parseWidth("abc"));
console.log(parseWidth("-5"));
console.log(parseWidth("     800     ")); 
