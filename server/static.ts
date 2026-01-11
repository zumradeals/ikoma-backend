import express, { type Express } from "express";
import fs from "fs";
import path from "path";

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist
  app.use("*", (req, res) => {
    if (req.path.startsWith("/api")) {
      res.status(404).json({
        ok: false,
        error: {
          code: "NOT_FOUND",
          message: `API route ${req.path} not found`
        }
      });
      return;
    }
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
