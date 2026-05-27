"use strict";

const pkg = require("../package.json");

const DEFAULT_UPSTREAM_URL = "https://github.com/OpenBMB/MiniCPM-Desk-Pet";
const DEFAULT_UPSTREAM_LABEL = "MiniCPM Desk Pet";
const ORIGINAL_AUTHOR = "OpenBMB";
const FORK_AUTHOR = "remynan";

function normalizeRepoUrl(url) {
  if (!url || typeof url !== "string") return null;
  return url.replace(/\.git$/i, "").trim();
}

function parseGitHubRepo(url) {
  const normalized = normalizeRepoUrl(url);
  if (!normalized) return null;
  const match = normalized.match(/github\.com\/([^/]+)\/([^/]+)/i);
  if (!match) return null;
  return { owner: match[1], repo: match[2] };
}

function extractCopyrightShort(copyright) {
  if (!copyright) return "© 2026 remynan";
  const match = String(copyright).match(/Copyright\s*©?\s*(\d{4})\s+([^.\n]+)/i);
  if (match) return `© ${match[1]} ${match[2].trim()}`;
  return "© 2026 remynan";
}

const repoUrl = normalizeRepoUrl(pkg.homepage) || normalizeRepoUrl(pkg.repository && pkg.repository.url);
const githubRepo = parseGitHubRepo(repoUrl);
const upstreamRepoUrl = normalizeRepoUrl(pkg.upstreamRepository) || DEFAULT_UPSTREAM_URL;
const upstreamMatch = parseGitHubRepo(upstreamRepoUrl);

module.exports = {
  appDisplayName: (pkg.build && pkg.build.productName) || "Open Desk Pet",
  licenseId: pkg.license || "AGPL-3.0-only",
  copyrightLine: extractCopyrightShort(pkg.build && pkg.build.copyright),
  repoUrl,
  modelRepoUrl: null, // No local model needed in remote API mode
  releasesLatestUrl: repoUrl ? `${repoUrl}/releases/latest` : null,
  githubOwner: githubRepo ? githubRepo.owner : null,
  githubRepo: githubRepo ? githubRepo.repo : null,
  githubReleasesApiPath: githubRepo
    ? `/repos/${githubRepo.owner}/${githubRepo.repo}/releases/latest`
    : null,
  upstreamRepoUrl,
  upstreamLabel: (upstreamMatch && upstreamMatch.repo) || DEFAULT_UPSTREAM_LABEL,
  userAgent: (pkg.build && pkg.build.productName) || "Open-Desk-Pet",
  // Fork information
  originalAuthor: ORIGINAL_AUTHOR,
  forkAuthor: FORK_AUTHOR,
  forkVersion: pkg.version,
  forkDescription: "Forked from MiniCPM Desk Pet, modified to use remote OpenAI-compatible APIs instead of local llama.cpp.",
};
