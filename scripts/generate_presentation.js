import pptxgen from "pptxgenjs";

const pptx = new pptxgen();
pptx.layout = "LAYOUT_WIDE";
pptx.author = "AmataSettle";
pptx.subject = "Offline-ready dairy cooperative settlement prototype";
pptx.title = "AmataSettle";
pptx.company = "Academic prototype";
pptx.lang = "en-RW";
pptx.theme = {
  headFontFace: "Aptos Display",
  bodyFontFace: "Aptos",
  lang: "en-US"
};
pptx.defineSlideMaster({
  title: "CONTENT",
  background: { color: "F6F4EC" },
  objects: [
    { rect: { x: 0, y: 0, w: 13.333, h: 0.13, line: { color: "153D32", transparency: 100 }, fill: { color: "153D32" } } },
    { text: { text: "AMATASETTLE  /  DAIRY SETTLEMENTS, MADE VERIFIABLE", options: { x: 0.55, y: 7.12, w: 10.8, h: 0.18, fontFace: "Aptos", fontSize: 8, color: "718076", charSpacing: 0.5, margin: 0 } } },
    { text: { text: "ACADEMIC PROTOTYPE", options: { x: 10.75, y: 7.12, w: 2.0, h: 0.18, fontFace: "Aptos", fontSize: 8, color: "718076", align: "right", margin: 0 } } }
  ],
  slideNumber: { x: 12.82, y: 0.3, color: "718076", fontFace: "Aptos", fontSize: 9 }
});

const C = {
  forest: "153D32",
  green: "35765E",
  leaf: "8AA78A",
  cream: "F6F4EC",
  sand: "E8E4D7",
  ink: "20332A",
  muted: "65736A",
  white: "FFFFFF",
  amber: "B17939",
  red: "9B5145",
  pale: "EAF2E9"
};

function title(slide, kicker, heading, subtitle = "") {
  slide.addText(kicker.toUpperCase(), {
    x: 0.7, y: 0.48, w: 8.5, h: 0.25, fontFace: "Aptos", fontSize: 10,
    bold: true, charSpacing: 2, color: C.green, margin: 0
  });
  slide.addText(heading, {
    x: 0.7, y: 0.88, w: 11.9, h: 0.62, fontFace: "Aptos Display",
    fontSize: 28, bold: true, color: C.forest, margin: 0
  });
  if (subtitle) slide.addText(subtitle, {
    x: 0.72, y: 1.57, w: 11.6, h: 0.48, fontSize: 13,
    color: C.muted, breakLine: false, margin: 0
  });
}

function card(slide, x, y, w, h, heading, body, accent = C.green) {
  slide.addShape(pptx.ShapeType.roundRect, {
    x, y, w, h, rectRadius: 0.12,
    line: { color: "E5E3D8", width: 1 },
    fill: { color: C.white }
  });
  slide.addShape(pptx.ShapeType.rect, {
    x: x + 0.02, y: y + 0.15, w: 0.06, h: h - 0.3,
    line: { color: accent, transparency: 100 },
    fill: { color: accent }
  });
  slide.addText(heading, {
    x: x + 0.24, y: y + 0.2, w: w - 0.42, h: 0.35,
    fontSize: 16, bold: true, color: C.forest, margin: 0
  });
  slide.addText(body, {
    x: x + 0.24, y: y + 0.66, w: w - 0.44, h: h - 0.82,
    fontSize: 12, color: C.muted, breakLine: false, valign: "top",
    margin: 0, paraSpaceAfterPt: 7
  });
}

function bullets(slide, items, x = 0.95, y = 2.15, w = 11.3, fontSize = 17) {
  slide.addText(items.map((text) => ({ text, options: { bullet: { indent: fontSize }, hanging: 4, breakLine: true } })), {
    x, y, w, h: 3.8, fontSize, color: C.ink, breakLine: false,
    paraSpaceAfterPt: 17, margin: 0.08, valign: "mid"
  });
}

function flowBox(slide, x, y, w, heading, detail, fill = C.white) {
  slide.addShape(pptx.ShapeType.roundRect, {
    x, y, w, h: 1.05, rectRadius: 0.08,
    line: { color: "DCE4DC", width: 1 },
    fill: { color: fill }
  });
  slide.addText(heading, {
    x: x + 0.12, y: y + 0.2, w: w - 0.24, h: 0.25,
    fontSize: 14, bold: true, color: C.forest, align: "center", margin: 0
  });
  slide.addText(detail, {
    x: x + 0.1, y: y + 0.56, w: w - 0.2, h: 0.28,
    fontSize: 9, color: C.muted, align: "center", margin: 0
  });
}

function line(slide, x1, y1, x2, y2, color = C.green) {
  slide.addShape(pptx.ShapeType.line, {
    x: x1, y: y1, w: x2 - x1, h: y2 - y1,
    line: { color, width: 1.8, beginArrowType: "none", endArrowType: "triangle" }
  });
}

// 1 — cover
{
  const slide = pptx.addSlide();
  slide.background = { color: C.forest };
  slide.addShape(pptx.ShapeType.ellipse, { x: 8.2, y: 0.2, w: 4.4, h: 4.4, line: { color: "47705D", transparency: 100 }, fill: { color: "234B3C", transparency: 12 } });
  slide.addShape(pptx.ShapeType.ellipse, { x: 9.0, y: 1.0, w: 2.8, h: 2.8, line: { color: "60816D", transparency: 30, width: 1.2 }, fill: { color: C.forest, transparency: 100 } });
  slide.addText("AMATASETTLE", { x: 0.8, y: 0.55, w: 4.8, h: 0.35, fontSize: 13, bold: true, charSpacing: 3, color: "AFC6AA", margin: 0 });
  slide.addText("Dairy settlements,\nmade verifiable.", { x: 0.8, y: 1.35, w: 7.2, h: 1.65, fontFace: "Aptos Display", fontSize: 38, bold: true, color: C.white, breakLine: false, margin: 0 });
  slide.addText("An offline-ready blockchain-based micro-settlement prototype for Rwanda's dairy supply chain", { x: 0.84, y: 3.25, w: 6.7, h: 0.9, fontSize: 18, color: "D9E5D8", breakLine: false, margin: 0 });
  slide.addShape(pptx.ShapeType.roundRect, { x: 8.75, y: 4.45, w: 3.35, h: 1.5, rectRadius: 0.1, line: { color: "FFFFFF", transparency: 80 }, fill: { color: "FFFFFF", transparency: 91 } });
  slide.addText("15.0 L   ·   7,500 mRWF", { x: 8.95, y: 4.85, w: 2.95, h: 0.35, fontSize: 17, bold: true, color: C.white, align: "center", margin: 0 });
  slide.addText("SAMPLE CALCULATION · TEST TOKEN ONLY", { x: 8.95, y: 5.32, w: 2.95, h: 0.25, fontSize: 8, charSpacing: 1, color: "C8D6C8", align: "center", margin: 0 });
  slide.addText("ACADEMIC PROTOTYPE   /   SEPOLIA DEPLOYED", { x: 0.84, y: 6.7, w: 7.7, h: 0.25, fontSize: 10, bold: true, charSpacing: 1, color: "B7CBB6", margin: 0 });
}

// 2 — problem
{
  const slide = pptx.addSlide("CONTENT");
  title(slide, "The problem", "A delivery needs a settlement record that travels with it", "The project targets record transparency and reconciliation—not a claim that every cooperative experiences the same issue.");
  card(slide, 0.75, 2.35, 3.75, 2.2, "Many fields, many handoffs", "Quantity, quality, price, and payment status must stay connected to one delivery.", C.green);
  card(slide, 4.8, 2.35, 3.75, 2.2, "Disagreement is possible", "Farmer and cooperative need to compare the same receipt and settlement calculation.", C.amber);
  card(slide, 8.85, 2.35, 3.75, 2.2, "Connectivity can vary", "A station may need to capture a signed record before it can synchronize.", C.leaf);
  slide.addText("Design objective: make the payment obligation inspectable, replay-resistant, and safe to reconcile.", { x: 1.2, y: 5.3, w: 10.8, h: 0.65, fontSize: 19, bold: true, color: C.forest, align: "center", margin: 0 });
}

// 3 — mission
{
  const slide = pptx.addSlide("CONTENT");
  title(slide, "Mission alignment", "Build financial tools that remain understandable and verifiable", "Personal mission: secure, accessible and reliable payment systems for underserved Rwandan communities and businesses.");
  bullets(slide, [
    "Transparent digital records connect delivery details to payment status.",
    "Cryptographic verification helps detect altered or replayed receipts.",
    "Offline-first capture preserves the original signed receipt for later submission.",
    "Role-aware screens separate farmer, station, cooperative, and resolver actions."
  ], 1.2, 2.25, 10.8, 18);
  slide.addText("These are design goals. The prototype does not measure community impact or prove the underlying operational problem's prevalence.", { x: 1.0, y: 6.2, w: 11.1, h: 0.35, fontSize: 11, italic: true, color: C.muted, align: "center", margin: 0 });
}

// 4 — solution
{
  const slide = pptx.addSlide("CONTENT");
  title(slide, "The solution", "AmataSettle connects signed receipts to reserved obligations", "The contract enforces the financial state machine; the browser handles signing, viewing, and offline persistence.");
  flowBox(slide, 0.85, 2.75, 2.25, "Capture", "Station enters the delivery");
  flowBox(slide, 3.55, 2.75, 2.25, "Sign", "EIP-712 receipt");
  flowBox(slide, 6.25, 2.75, 2.25, "Reserve", "Contract checks funds");
  flowBox(slide, 8.95, 2.75, 2.25, "Settle", "Claim or dispute");
  line(slide, 3.1, 3.27, 3.48, 3.27);
  line(slide, 5.8, 3.27, 6.18, 3.27);
  line(slide, 8.5, 3.27, 8.88, 3.27);
  slide.addText("Simulated mRWF only · no real currency · no redemption", { x: 1.1, y: 4.55, w: 11.0, h: 0.45, fontSize: 16, bold: true, color: C.amber, align: "center", margin: 0 });
}

// 5 — architecture
{
  const slide = pptx.addSlide("CONTENT");
  title(slide, "Architecture", "Keep trust-critical rules on-chain; keep retries in the browser");
  flowBox(slide, 0.7, 2.4, 2.35, "Station wallet", "Authorized signing key", "EAF2E9");
  flowBox(slide, 3.55, 2.4, 2.35, "React + MetaMask", "User interface / tx", C.white);
  flowBox(slide, 6.4, 2.4, 2.35, "AmataSettle", "Receipt / reserve / dispute", "EAF2E9");
  flowBox(slide, 9.25, 2.4, 2.35, "MockRWF", "Six-decimal ERC-20", C.white);
  line(slide, 3.08, 2.92, 3.48, 2.92);
  line(slide, 5.93, 2.92, 6.33, 2.92);
  line(slide, 8.78, 2.92, 9.18, 2.92);
  card(slide, 2.25, 4.25, 3.75, 1.35, "IndexedDB", "Stores the signed local receipt until confirmed.", C.amber);
  card(slide, 7.3, 4.25, 3.75, 1.35, "Sepolia / Hardhat", "Public testnet target; tests run on local Hardhat.", C.green);
}

// 6 — workflow
{
  const slide = pptx.addSlide("CONTENT");
  title(slide, "Delivery lifecycle", "From measured milk to a claimable allocation");
  bullets(slide, [
    "Station creates one unique delivery ID and signs typed fields.",
    "The contract verifies station role, EIP-712 domain, deadline, data, and available treasury.",
    "Accepted payment becomes a reserved liability—not a completed transfer.",
    "The farmer claims, or disputes before the configured window closes.",
    "A resolver upholds the reserve or rejects the payment and releases it."
  ], 1.0, 2.0, 11.0, 16);
}

// 7 — EIP-712
{
  const slide = pptx.addSlide("CONTENT");
  title(slide, "Receipt integrity", "EIP-712 makes the station's approval specific to this deployment");
  card(slide, 0.8, 2.25, 3.8, 2.6, "Typed fields", "Delivery ID · farmer · quantity mL · whole RWF/L · grade · deliveredAt · deadline", C.green);
  card(slide, 4.8, 2.25, 3.8, 2.6, "Domain separation", "Name AmataSettle · version 1 · chain ID · verifying contract address", C.amber);
  card(slide, 8.8, 2.25, 3.8, 2.6, "Verification", "ECDSA recovery must match an authorized station and the transaction sender.", C.leaf);
  slide.addText("A valid signature proves key approval and data integrity—not the physical accuracy of the measurement.", { x: 1.0, y: 5.5, w: 11.1, h: 0.45, fontSize: 15, bold: true, color: C.forest, align: "center", margin: 0 });
}

// 8 — contract
{
  const slide = pptx.addSlide("CONTENT");
  title(slide, "Smart contract", "Three roles create a bounded, auditable workflow");
  card(slide, 0.8, 2.3, 3.7, 2.4, "Administrator", "Authorizes stations and resolvers; withdraws only unallocated funds.", C.forest);
  card(slide, 4.8, 2.3, 3.7, 2.4, "Collection station", "Signs and submits its own receipt. A unique ID blocks replay.", C.green);
  card(slide, 8.8, 2.3, 3.7, 2.4, "Resolver", "Decides disputed allocations. Disputed funds remain reserved.", C.amber);
  slide.addText("OpenZeppelin AccessControl · EIP712 · ECDSA · SafeERC20 · ReentrancyGuard", { x: 1.0, y: 5.2, w: 11.2, h: 0.4, fontSize: 14, color: C.muted, align: "center", margin: 0 });
}

// 9 — accounting
{
  const slide = pptx.addSlide("CONTENT");
  title(slide, "Financial accounting", "Available treasury always excludes reserved farmer liabilities");
  slide.addShape(pptx.ShapeType.roundRect, { x: 1.35, y: 2.25, w: 10.6, h: 1.15, rectRadius: 0.12, line: { color: "DCE4DC" }, fill: { color: C.white } });
  slide.addText("Available = contract token balance − reservedFunds", { x: 1.6, y: 2.58, w: 10.1, h: 0.45, fontSize: 25, bold: true, color: C.forest, align: "center", margin: 0 });
  card(slide, 1.3, 4.15, 3.25, 1.45, "15,000 mL", "Milk quantity", C.green);
  card(slide, 5.05, 4.15, 3.25, 1.45, "500 RWF/L", "Whole simulated RWF", C.amber);
  card(slide, 8.8, 4.15, 3.25, 1.45, "7,500 mRWF", "7.5 billion token base units", C.leaf);
}

// 10 — disputes
{
  const slide = pptx.addSlide("CONTENT");
  title(slide, "Dispute state machine", "Disputed payments cannot be claimed or withdrawn");
  flowBox(slide, 0.9, 2.65, 2.4, "Allocated", "Claimable");
  flowBox(slide, 5.45, 2.65, 2.4, "Disputed", "Reserve stays locked", "FFF3DF");
  flowBox(slide, 10.0, 2.65, 2.4, "Claimed / Rejected", "Final state", "EAF2E9");
  line(slide, 3.32, 3.18, 5.32, 3.18);
  line(slide, 7.88, 3.18, 9.87, 3.18);
  slide.addText("Uphold → allocation becomes claimable again", { x: 1.0, y: 4.45, w: 5.3, h: 0.4, fontSize: 15, color: C.green, bold: true, align: "center", margin: 0 });
  slide.addText("Reject → reserved amount returns to available treasury", { x: 6.9, y: 4.45, w: 5.4, h: 0.4, fontSize: 15, color: C.amber, bold: true, align: "center", margin: 0 });
}

// 11 — offline
{
  const slide = pptx.addSlide("CONTENT");
  title(slide, "Offline-first", "Persist the same signed receipt; do not pretend it is on-chain");
  flowBox(slide, 0.85, 2.65, 2.45, "Sign receipt", "One ID + signature", C.white);
  flowBox(slide, 3.75, 2.65, 2.45, "Save locally", "IndexedDB pending", "FFF3DF");
  flowBox(slide, 6.65, 2.65, 2.45, "Reconnect", "Retry original data", C.white);
  flowBox(slide, 9.55, 2.65, 2.45, "Confirm", "Then synchronized", "EAF2E9");
  line(slide, 3.32, 3.18, 3.62, 3.18);
  line(slide, 6.22, 3.18, 6.52, 3.18);
  line(slide, 9.12, 3.18, 9.42, 3.18);
  slide.addText("Limits: browser storage can be lost; a signature cannot validate the physical milk measurement.", { x: 1.0, y: 4.6, w: 11.3, h: 0.45, fontSize: 14, italic: true, color: C.muted, align: "center", margin: 0 });
}

// 12 — frontend
{
  const slide = pptx.addSlide("CONTENT");
  title(slide, "User experience", "Role-aware dashboards use live contract reads");
  card(slide, 0.75, 2.3, 2.95, 2.15, "Farmer", "Delivery history, claimable amount, claim, dispute.", C.green);
  card(slide, 3.9, 2.3, 2.95, 2.15, "Station", "Sign receipt, local queue, sync status, retry.", C.amber);
  card(slide, 7.05, 2.3, 2.95, 2.15, "Cooperative", "Treasury, deposits, reserves, station authorization.", C.forest);
  card(slide, 10.2, 2.3, 2.4, 2.15, "Resolver", "Resolve by delivery ID.", C.leaf);
  slide.addText("React + TypeScript + Vite · ethers v6 · MetaMask · IndexedDB · Tailwind CSS", { x: 1.0, y: 5.15, w: 11.3, h: 0.4, fontSize: 14, color: C.muted, align: "center", margin: 0 });
}

// 13 — testing
{
  const slide = pptx.addSlide("CONTENT");
  title(slide, "Validation", "38 Hardhat tests pass; frontend production build succeeds");
  slide.addText("38 / 38", { x: 1.0, y: 2.35, w: 4.4, h: 1.0, fontSize: 46, bold: true, color: C.green, align: "center", margin: 0 });
  slide.addText("Hardhat tests passing", { x: 1.0, y: 3.35, w: 4.4, h: 0.35, fontSize: 16, color: C.muted, align: "center", margin: 0 });
  slide.addText("PASS", { x: 7.8, y: 2.35, w: 3.2, h: 1.0, fontSize: 44, bold: true, color: C.green, align: "center", margin: 0 });
  slide.addText("Frontend TypeScript + production build", { x: 6.8, y: 3.35, w: 5.2, h: 0.35, fontSize: 15, color: C.muted, align: "center", margin: 0 });
  slide.addText("Contracts deployed to Ethereum Sepolia (chain ID 11155111), November 23, 2026.", { x: 1.1, y: 5.1, w: 11.1, h: 0.65, fontSize: 15, bold: true, color: C.forest, align: "center", margin: 0 });
}

// 14 — limitations
{
  const slide = pptx.addSlide("CONTENT");
  title(slide, "Limitations & next steps", "A reliable prototype still depends on real-world trust");
  bullets(slide, [
    "mRWF is an admin-mintable test token; no real payments or redemption.",
    "Station key and resolver are trusted; measurement accuracy is off-chain.",
    "IndexedDB queue is local to one browser and may be erased.",
    "Sepolia deployment is complete; live wallet interaction screenshots are still being captured.",
    "Next: key governance, independent audit, privacy review, recovery, and user testing."
  ], 1.0, 2.05, 11.2, 16);
}

// 15 — conclusion
{
  const slide = pptx.addSlide();
  slide.background = { color: C.forest };
  slide.addText("TAKEAWAY", { x: 0.9, y: 0.8, w: 3.5, h: 0.3, fontSize: 12, bold: true, charSpacing: 2, color: "B7CBB6", margin: 0 });
  slide.addText("A delivery record can become a verifiable financial obligation.", { x: 0.9, y: 1.65, w: 10.8, h: 1.5, fontFace: "Aptos Display", fontSize: 34, bold: true, color: C.white, breakLine: false, margin: 0 });
  slide.addText("AmataSettle combines signed receipts, reserved treasury accounting, farmer claims, dispute states, and offline synchronization—while keeping its testnet and physical-measurement limits explicit.", { x: 0.95, y: 3.65, w: 10.4, h: 1.0, fontSize: 18, color: "D9E5D8", breakLine: false, margin: 0 });
  slide.addText("QUESTIONS?", { x: 0.95, y: 5.45, w: 4.2, h: 0.5, fontSize: 23, bold: true, charSpacing: 1, color: "AFC6AA", margin: 0 });
  slide.addText("Academic prototype · Sepolia deployed", { x: 0.95, y: 6.75, w: 7.5, h: 0.25, fontSize: 10, color: "B7CBB6", margin: 0 });
}

await pptx.writeFile({ fileName: "AmataSettle_Presentation.pptx" });
console.log("Generated AmataSettle_Presentation.pptx (15 slides)");
