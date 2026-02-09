import express from "express";
import { authorizeExecution } from "./authority-engine.js";

const app = express();
app.use(express.json());

app.post("/v1/authorize", (req, res) => {
  try {
    const decision = authorizeExecution(req.body);
    res.status(200).json(decision);
  } catch (err) {
    res.status(500).json({
      decision: "DENY",
      reason: "authority_evaluation_error",
      error: err?.message ?? "unknown_error"
    });
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Solace Core Authority listening on http://localhost:${PORT}`);
});
