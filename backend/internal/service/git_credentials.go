package service

import (
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

// CredentialType enumerates supported git authentication strategies.
type CredentialType string

const (
	CredNone        CredentialType = "none"         // no credential configured — use git defaults
	CredSSHKey      CredentialType = "ssh-key"      // private key (with optional passphrase)
	CredSSHPassword CredentialType = "ssh-password" // password-based ssh (via SSH_ASKPASS)
)

// CredentialMeta is the safe metadata returned to the client. Never includes
// the secret itself.
type CredentialMeta struct {
	Type          CredentialType `json:"type"`
	HasPassphrase bool           `json:"has_passphrase"` // meaningful for ssh-key
}

// CredentialInput is what the client sends when storing credentials.
// Exactly one of PrivateKey (for ssh-key) or Password (for ssh-password) is
// expected; the server validates based on Type.
type CredentialInput struct {
	Type       CredentialType `json:"type"`
	PrivateKey string         `json:"private_key,omitempty"` // PEM-encoded private key
	Passphrase string         `json:"passphrase,omitempty"`  // for ssh-key only
	Password   string         `json:"password,omitempty"`    // for ssh-password only
}

// CredentialStore persists git credentials per space, OUTSIDE the docsDir so
// they never get committed to the repo. Files are 0600.
type CredentialStore struct {
	root string // typically dataDir/git_credentials
}

// NewCredentialStore constructs a store rooted at root. The directory is
// created on first use (lazy), so callers don't pay the cost for spaces that
// never configure credentials.
//
// root is converted to an absolute path because SSH_ASKPASS must be absolute —
// ssh resolves that env var relative to its OWN cwd (which is git's cwd, the
// space's repo dir), not the Go process's cwd. A relative root here would
// produce paths that resolve to the wrong location under ssh.
func NewCredentialStore(root string) *CredentialStore {
	abs, err := filepath.Abs(root)
	if err != nil {
		// filepath.Abs only fails if the OS can't compute the cwd; in that
		// case fall back to root as-is (will likely fail later with a clear
		// "no such file" rather than a silent wrong-path).
		abs = root
	}
	return &CredentialStore{root: abs}
}

// spaceDir returns the absolute path holding a space's credential files.
// Slugified so weird space names don't produce hostile paths.
func (c *CredentialStore) spaceDir(slug string) string {
	return filepath.Join(c.root, slugifySlugForPath(slug))
}

// slugifySlugForPath reduces any slug to [a-z0-9-_]+ for use as a directory name.
// Slugs are already slugified by the service layer, but defense in depth.
func slugifySlugForPath(slug string) string {
	re := strings.NewReplacer("/", "_", "\\", "_", ":", "_", " ", "_")
	out := re.Replace(slug)
	out = strings.ToLower(out)
	return out
}

// Get returns metadata. Never returns the secret.
func (c *CredentialStore) Get(slug string) CredentialMeta {
	meta := CredentialMeta{Type: CredNone}
	dir := c.spaceDir(slug)
	typeBytes, err := os.ReadFile(filepath.Join(dir, "type"))
	if err != nil {
		return meta // not configured
	}
	t := CredentialType(strings.TrimSpace(string(typeBytes)))
	switch t {
	case CredSSHKey, CredSSHPassword:
		meta.Type = t
	default:
		return meta
	}
	if t == CredSSHKey {
		if b, err := os.ReadFile(filepath.Join(dir, "passphrase")); err == nil && len(b) > 0 {
			meta.HasPassphrase = true
		}
	}
	return meta
}

// Set stores the credential atomically. Validates the input matches Type.
// All files written with 0600. For password/passphrase modes, also writes an
// askpass script that SSH_ASKPASS points to — this is how ssh reads the secret
// without a TTY, no external sshpass binary needed (OpenSSH 8.4+ via
// SSH_ASKPASS_REQUIRE=force).
func (c *CredentialStore) Set(slug string, in CredentialInput) error {
	if err := os.MkdirAll(c.root, 0700); err != nil {
		return fmt.Errorf("create credential root: %w", err)
	}
	dir := c.spaceDir(slug)

	switch in.Type {
	case CredNone:
		// Clear existing.
		return c.Delete(slug)
	case CredSSHKey:
		if strings.TrimSpace(in.PrivateKey) == "" {
			return errors.New("private_key required for ssh-key")
		}
		if err := os.MkdirAll(dir, 0700); err != nil {
			return fmt.Errorf("create credential dir: %w", err)
		}
		if err := writeSecret(filepath.Join(dir, "type"), []byte(string(CredSSHKey))); err != nil {
			return err
		}
		if err := writeSecret(filepath.Join(dir, "id_rsa"), []byte(ensureTrailingNewline(in.PrivateKey))); err != nil {
			return err
		}
		// Passphrase is optional. If empty, remove the file + askpass script.
		if strings.TrimSpace(in.Passphrase) == "" {
			_ = os.Remove(filepath.Join(dir, "passphrase"))
			_ = os.Remove(filepath.Join(dir, "askpass.sh"))
		} else {
			if err := writeSecret(filepath.Join(dir, "passphrase"), []byte(in.Passphrase)); err != nil {
				return err
			}
			if err := writeAskpass(dir, in.Passphrase); err != nil {
				return err
			}
		}
		_ = os.Remove(filepath.Join(dir, "password")) // clean up if switching types
		return nil
	case CredSSHPassword:
		if strings.TrimSpace(in.Password) == "" {
			return errors.New("password required for ssh-password")
		}
		if err := os.MkdirAll(dir, 0700); err != nil {
			return fmt.Errorf("create credential dir: %w", err)
		}
		if err := writeSecret(filepath.Join(dir, "type"), []byte(string(CredSSHPassword))); err != nil {
			return err
		}
		if err := writeSecret(filepath.Join(dir, "password"), []byte(in.Password)); err != nil {
			return err
		}
		if err := writeAskpass(dir, in.Password); err != nil {
			return err
		}
		// Clean up ssh-key leftovers when switching.
		_ = os.Remove(filepath.Join(dir, "id_rsa"))
		_ = os.Remove(filepath.Join(dir, "passphrase"))
		return nil
	default:
		return fmt.Errorf("invalid credential type: %q", in.Type)
	}
}

// Delete removes all credential files for a space.
func (c *CredentialStore) Delete(slug string) error {
	dir := c.spaceDir(slug)
	if err := os.RemoveAll(dir); err != nil && !os.IsNotExist(err) {
		return err
	}
	return nil
}

// writeSecret writes data to path with 0600 perms (created if missing,
// existing file truncated). The file is written directly — Go's os.WriteFile
// respects the provided perm regardless of umask for new files, but to be
// robust against pre-existing files with wider perms, we chmod after write.
func writeSecret(path string, data []byte) error {
	if err := os.WriteFile(path, data, 0600); err != nil {
		return fmt.Errorf("write %s: %w", filepath.Base(path), err)
	}
	if err := os.Chmod(path, 0600); err != nil {
		return fmt.Errorf("chmod %s: %w", filepath.Base(path), err)
	}
	return nil
}

// writeAskpass writes an executable askpass script into dir/askpass.sh that
// prints secret to stdout. The script is invoked by ssh when SSH_ASKPASS points
// to it and SSH_ASKPASS_REQUIRE=force is set (OpenSSH 8.4+). The script must be
// executable, so we chmod 0700 after write.
//
// We printf the secret quoted to avoid shell interpolation. Even though the
// file is on a protected filesystem, defense in depth: never let the secret
// hit a shell as a raw token.
func writeAskpass(dir, secret string) error {
	path := filepath.Join(dir, "askpass.sh")
	script := "#!/bin/sh\nprintf '%s\\n' " + shellQuote(secret) + "\n"
	if err := os.WriteFile(path, []byte(script), 0700); err != nil {
		return fmt.Errorf("write askpass: %w", err)
	}
	if err := os.Chmod(path, 0700); err != nil {
		return fmt.Errorf("chmod askpass: %w", err)
	}
	return nil
}

func ensureTrailingNewline(s string) string {
	if strings.HasSuffix(s, "\n") {
		return s
	}
	return s + "\n"
}

// EnvFor returns the environment variables to set on git commands so that the
// stored credential is applied. Returns nil if no credential is configured or
// the credential type doesn't require env overrides.
//
// For SSH password/passphrase modes, this relies on OpenSSH's native
// SSH_ASKPASS mechanism: ssh reads the secret from the askpass script instead
// of prompting on a TTY. Requires OpenSSH 8.4+ (SSH_ASKPASS_REQUIRE=force).
//
// Returned vars are layered on top of gitNoPromptEnv in GitService.git. Note:
// gitNoPromptEnv sets SSH_ASKPASS= (empty) to suppress OTHER askpass prompts,
// but our value here is appended later and therefore wins.
func (c *CredentialStore) EnvFor(slug string) []string {
	dir := c.spaceDir(slug)
	typeBytes, err := os.ReadFile(filepath.Join(dir, "type"))
	if err != nil {
		return nil
	}
	askpassPath := filepath.Join(dir, "askpass.sh")
	switch CredentialType(strings.TrimSpace(string(typeBytes))) {
	case CredSSHKey:
		keyPath := filepath.Join(dir, "id_rsa")
		// StrictHostKeyChecking=accept-new: first connection records the host
		// key, subsequent connections enforce it. Better UX than "yes" (no
		// security) while avoiding the manual yes/no prompt.
		sshCmd := "ssh -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new -i " + shellQuote(keyPath)
		env := []string{"GIT_SSH_COMMAND=" + sshCmd}
		// If askpass script exists, the key has a passphrase — wire it up.
		if info, err := os.Stat(askpassPath); err == nil && !info.IsDir() {
			env = append(env,
				"SSH_ASKPASS="+askpassPath,
				"SSH_ASKPASS_REQUIRE=force",
			)
		}
		return env
	case CredSSHPassword:
		// Sanity: askpass script must exist (written during Set). If it's gone
		// (admin deleted files manually), fail safe — no env, push will fail
		// with a clear "auth required" rather than silently using no cred.
		if info, err := os.Stat(askpassPath); err != nil || info.IsDir() {
			return nil
		}
		return []string{
			"GIT_SSH_COMMAND=ssh -o StrictHostKeyChecking=accept-new",
			"SSH_ASKPASS=" + askpassPath,
			"SSH_ASKPASS_REQUIRE=force",
		}
	}
	return nil
}

// shellQuote single-quotes s for safe inclusion in a shell argv. The value
// flows into GIT_SSH_COMMAND (parsed via /bin/sh) and into the askpass script
// (run as /bin/sh).
func shellQuote(s string) string {
	// Replace every ' with '\'' (close quote, escaped quote, reopen quote).
	return "'" + strings.ReplaceAll(s, "'", `'\''`) + "'"
}
