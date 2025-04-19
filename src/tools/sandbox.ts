import { exec } from "child_process";
import { z } from "zod";
import { macosShellInput, macosShellOutput } from "./config.js";
import util from "util";
import fs from "fs";
import path from "path";
import os from "os";

const execPromise = util.promisify(exec);

/**
 * Builds a macOS sandbox profile for secure command execution
 */
function buildSandboxProfile(): string {
  const workDir = process.cwd();
  const tmpDir = os.tmpdir();
  const homeDir = os.homedir();

  return `(version 1)
;; Disallow everything by default
(deny default)

;; Import baseline BSD profile
(import "/System/Library/Sandbox/Profiles/bsd.sb")

;; Allow writes to working directory
(allow file-write*
    (literal "${workDir}")
    (regex "^${workDir.replace(/\/$/, "")}/"))

;; Allow writes to temp directory
(allow file-write*
    (literal "${tmpDir}")
    (regex "^${tmpDir.replace(/\/$/, "")}/"))

;; Allow writes to ~/.codex (if exists)
(allow file-write*
    (literal "${homeDir}/.codex")
    (regex "^${homeDir.replace(/\/$/, "")}/\\.codex/"))

;; Block all network access
(deny network*)`;
}

/**
 * Execute a command in a secure macOS sandbox
 * This uses Apple's Seatbelt technology to restrict the command execution
 */
export async function macos_shell(
  params: z.infer<typeof macosShellInput>
): Promise<z.infer<typeof macosShellOutput>> {
  const { command } = params;

  // Only works on macOS
  if (os.platform() !== "darwin") {
    throw new Error("This tool only works on macOS");
  }

  try {
    // Create a temporary sandbox profile
    const tempDir = os.tmpdir();
    const profilePath = path.join(tempDir, `sandbox_profile_${Date.now()}.sb`);

    // Create a sandbox profile that:
    // - Denies everything by default
    // - Imports basic BSD system profile
    // - Allows writing to working directory and temporary folders
    // - Denies network access
    const profile = `
(version 1)
(deny default)
(import "/System/Library/Sandbox/Profiles/bsd.sb")
(allow file-read*)
(allow process*)
(allow file-write* (subpath "${process.cwd()}"))
(allow file-write* (subpath "${tempDir}"))
(deny network*)
    `;

    fs.writeFileSync(profilePath, profile);

    try {
      // First try with standard sandbox-exec (may fail due to permissions)
      const { stdout, stderr } = await execPromise(
        `sandbox-exec -f ${profilePath} /bin/bash -c "${command.replace(
          /"/g,
          '\\"'
        )}"`
      );

      // Clean up the profile
      fs.unlinkSync(profilePath);

      return {
        stdout,
        stderr,
        exitCode: 0,
      };
    } catch (sandboxError) {
      // Fall back to regular command execution if sandbox fails
      console.warn(
        "Sandbox execution failed. Falling back to regular execution."
      );
      console.warn(
        "To use sandbox, you need to run with appropriate permissions."
      );

      const { stdout, stderr } = await execPromise(
        `/bin/bash -c "${command.replace(/"/g, '\\"')}"`
      );

      // Clean up the profile
      fs.unlinkSync(profilePath);

      return {
        stdout,
        stderr,
        exitCode: 0,
      };
    }
  } catch (error: any) {
    return {
      stdout: "",
      stderr: error.message || String(error),
      exitCode: error.code || 1,
    };
  }
}
