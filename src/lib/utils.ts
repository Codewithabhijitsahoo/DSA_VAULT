import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getPlatformPrefix(platform: string | null) {
  const p = platform?.toLowerCase() || "";
  if (p.includes("leetcode")) return "LC";
  if (p.includes("codeforces")) return "CF";
  if (p.includes("atcoder")) return "AT";
  if (p.includes("geeks") || p === "gfg") return "GFG";
  if (p.includes("hackerrank")) return "HR";
  if (p.includes("codechef")) return "CC";
  if (p.includes("interviewbit")) return "IB";
  if (p.includes("cses")) return "CSES";
  if (p.includes("coding ninjas")) return "CN";
  return "PB"; // Problem
}
