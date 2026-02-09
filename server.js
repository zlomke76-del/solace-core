import express from "express";
import { authorizeExecution } from "./authority-engine.js";

const app = express();
app.use(express.json());

app.post("/v1/authorize", (req, res) => {
  const decision = authorizeExecution(req.body);
  res.status(200).json(decision);
});

app.listen(3000, () => {
  console.log("Solace Core Authority running on :3000");
});
