// Unit tests για το probeImage (PNG/JPEG header parser).
// Τρέξιμο από τη ρίζα του project:  npx tsx tests/probe-edge.ts
// Κάθε περίπτωση: [όνομα, buffer, αναμενόμενο αποτέλεσμα, γιατί υπάρχει το τεστ]

import { readdir } from "node:fs/promises";
import path from "node:path";
import { probeImage, readHeader } from "../src/images/probe.js";

type Probe = { format: "png" | "jpg"; width: number; height: number };
type Case = [name: string, buf: Buffer, expected: Probe | undefined, why: string];

const hex = (s: string): Buffer => Buffer.from(s.replace(/\s+/g, ""), "hex");
const zeros = (n: number): Buffer => Buffer.alloc(n);

const PNG_1x1 = hex("89504e470d0a1a0a 0000000d 49484452 00000001 00000001 0806000000");
const SOI = "ffd8";
const APP0 = "ffe0 0010 4a46494600 0101 00 0001 0001 0000";      // JFIF, μήκος 16
const SOF0_768x1024 = "ffc0 0011 08 0300 0400 03 012200 021101 031101"; // baseline, h=768 w=1024
const SOF2_768x1024 = "ffc2 0011 08 0300 0400 03 012200 021101 031101"; // progressive

const cases: Case[] = [
    // ---------- PNG ----------
    ["png: 1x1 ελάχιστο έγκυρο", PNG_1x1,
        { format: "png", width: 1, height: 1 }, "signature + IHDR, width στο 16, height στο 20"],
    ["png: κομμένο στα 18 bytes", PNG_1x1.subarray(0, 18),
        undefined, "υπάρχει IHDR αλλά όχι ολόκληρα width/height: δεν πρέπει να πετάξει exception"],
    ["png: πρώτο chunk δεν είναι IHDR", hex("89504e470d0a1a0a 0000000d 49444154 00000001 00000001 0806000000"),
        undefined, "η προδιαγραφή λέει ότι το IHDR είναι πάντα πρώτο"],

    // ---------- Όχι εικόνα ----------
    ["κενό buffer", zeros(0), undefined, "αρχείο 0 bytes"],
    ["κείμενο", Buffer.from("hello, I am definitely a png"), undefined, "magic bytes δεν ταιριάζουν"],

    // ---------- JPEG: έγκυρα ----------
    ["jpg: baseline SOF0", hex(SOI + APP0 + SOF0_768x1024 + "00".repeat(32)),
        { format: "jpg", width: 1024, height: 768 }, "βασική περίπτωση: height στο +5, width στο +7"],
    ["jpg: progressive SOF2 + padding", Buffer.concat([hex(SOI + APP0 + SOF2_768x1024), zeros(100)]),
        { format: "jpg", width: 1024, height: 768 }, "όλα τα SOF C0..CF, όχι μόνο το C0"],
    ["jpg: progressive, ακριβές μήκος", hex(SOI + APP0 + SOF2_768x1024),
        { format: "jpg", width: 1024, height: 768 }, "όριο: το τελευταίο byte που διαβάζεται είναι το idx+8"],
    ["jpg: DHT (C4) πριν το SOF", hex(SOI + "ffc4 0004 0000" + SOF0_768x1024 + "00".repeat(16)),
        { format: "jpg", width: 1024, height: 768 }, "C4/C8/CC είναι στο εύρος C0..CF αλλά ΔΕΝ είναι SOF: πρέπει να προσπεραστούν"],
    ["jpg: FF C0 κρυμμένο μέσα σε APP0", hex(SOI + "ffe0 000a 1234ffc00011ffff" + SOF0_768x1024 + "00".repeat(20)),
        { format: "jpg", width: 1024, height: 768 }, "ο parser πηδάει ολόκληρα segments, δεν ψάχνει bytes"],
    ["jpg: παράλογες αλλά συντακτικά σωστές διαστάσεις", hex(SOI + "ffe0 0004 1234" + "ffc0 0011 08 ffff 7777" + "00".repeat(50)),
        { format: "jpg", width: 0x7777, height: 0xffff }, "ο parser αναφέρει τι γράφει το header· το 422 το αποφασίζει το endpoint"],

    // ---------- JPEG: χαλασμένα / κομμένα ----------
    ["jpg: κομμένο 3 bytes μετά από marker", hex(SOI + APP0 + "ffe100"),
        undefined, "off-by-one: το μήκος segment θέλει τα bytes idx+2 ΚΑΙ idx+3"],
    ["jpg: SOF κομμένο πριν το width", hex(SOI + "ffc0 0011 08 0300"),
        undefined, "βρήκε SOF αλλά λείπουν τα bytes των διαστάσεων"],
    ["jpg: segment δείχνει σε μηδενικά", Buffer.concat([hex(SOI + "ffe0 0010"), zeros(70000)]),
        undefined, "μετά το segment δεν υπάρχει FF: σταματάμε"],
    ["jpg: μη-FF εκεί που περιμένουμε marker", hex(SOI + "ffe0 0004 1234" + "12c0 0011 08 ffff 7777" + "00".repeat(20)),
        undefined, "κάθε segment ξεκινάει με FF"],
    ["jpg: μήκος segment 0", Buffer.concat([hex(SOI + "ffe0 0000"), zeros(100)]),
        undefined, "αδύνατο μήκος (< 2): χωρίς έλεγχο ο βρόχος δεν προχωράει σωστά"],
    ["jpg: μήκος segment 1", hex(SOI + "ffe0 0001" + "ffc0 0011 08 ffff 7777" + "00".repeat(20)),
        undefined, "αδύνατο μήκος (< 2), ακόμα κι αν ακολουθεί κάτι που μοιάζει με SOF"],
];

function same(a: Probe | undefined, b: Probe | undefined): boolean {
    if (a === undefined || b === undefined) return a === b;
    return a.format === b.format && a.width === b.width && a.height === b.height;
}

let failed = 0;
for (const [name, buf, expected, why] of cases) {
    let got: Probe | undefined;
    let threw: string | undefined;
    try {
        got = probeImage(buf);
    } catch (e) {
        threw = e instanceof Error ? e.message : String(e);
    }
    const ok = threw === undefined && same(got, expected);
    if (!ok) failed++;
    console.log(`${ok ? "PASS" : "FAIL"}  ${name}`);
    if (!ok) {
        console.log(`      αναμενόταν: ${JSON.stringify(expected)}`);
        console.log(`      πήρε:       ${threw !== undefined ? "EXCEPTION " + threw : JSON.stringify(got)}`);
        console.log(`      γιατί:      ${why}`);
    }
}

// ---------- Πραγματικά αρχεία από το samples/ (αν υπάρχει) ----------
const dir = "samples";
let files: string[] = [];
try { files = await readdir(dir); } catch { console.log("(δεν βρέθηκε φάκελος samples/, παραλείπεται)"); }
for (const f of files) {
    const ext = path.extname(f).toLowerCase();
    const expectedFormat = ext === ".png" ? "png" : ext === ".jpg" || ext === ".jpeg" ? "jpg" : undefined;
    const got = probeImage(await readHeader(path.join(dir, f)));
    const ok = expectedFormat === undefined ? got === undefined : got?.format === expectedFormat;
    if (!ok) failed++;
    console.log(`${ok ? "PASS" : "FAIL"}  samples/${f} -> ${JSON.stringify(got)}`);
}

console.log(failed === 0 ? "\nΟΛΑ ΠΕΡΑΣΑΝ" : `\n${failed} ΑΠΕΤΥΧΑΝ`);
process.exitCode = failed === 0 ? 0 : 1;
