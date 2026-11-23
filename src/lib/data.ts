import fs from "fs";
import path from "path";

export function getJsonData<T = any>(filename: string): T | null {
  try {
    const filePath = path.join(process.cwd(), filename);
    if (!fs.existsSync(filePath)) return null;
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch (error) {
    console.error(`Failed to read ${filename}:`, error);
    return null;
  }
}