// server.ts
import express from "express";
import { evaluateIntent } from "./governor-engine";

const app = express();
app.use(express.json());

// Authority endpoint — this IS Solace Core as a product
app.post("/v1/authorize", async (req, res) => {
  try {
    const decision = await evaluateIntent(req.body);
    res.status(200).json(decision);
  } catch (err: any) {
    res.status(500).json({
      decision: "DENY",
      reason: "authority_evaluation_error",
      error: err?.message ?? "unknown_error"
    });
  }
});

// Fail-closed invariant: if this service is down, callers must not proceed
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Solace Core Authority listening on port ${PORT}`);
});
