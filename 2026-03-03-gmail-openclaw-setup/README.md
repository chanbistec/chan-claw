# How to Set Up Gmail for OpenClaw

A simple guide to connect your Gmail account to OpenClaw using Google OAuth.

**Time needed:** ~10 minutes | **No coding required**

---

## Step 1: Create a Google Cloud Project

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Click the project dropdown (top left) → **New Project**
3. Name it something like `openclaw-gmail`
4. Click **Create**
5. Make sure the new project is selected

## Step 2: Enable Gmail API

1. Go to **APIs & Services → Library** (left sidebar)
2. Search for **Gmail API**
3. Click on it → click **Enable**

## Step 3: Configure OAuth Consent Screen

1. Go to **APIs & Services → OAuth consent screen**
2. Choose **External** (or **Internal** if you're on Google Workspace)
3. Fill in:
   - **App name:** OpenClaw Gmail
   - **User support email:** your email
   - **Developer contact email:** your email
4. Click **Save and Continue**
5. On the **Scopes** page, click **Add or Remove Scopes** and add:
   - `https://www.googleapis.com/auth/gmail.readonly`
   - `https://www.googleapis.com/auth/gmail.send`
   - `https://www.googleapis.com/auth/gmail.modify`
6. Click **Save and Continue**
7. On the **Test users** page, click **Add Users**
   - Add the Gmail address you want to connect
8. Click **Save and Continue** → **Back to Dashboard**

## Step 4: Create OAuth Credentials

1. Go to **APIs & Services → Credentials**
2. Click **Create Credentials** → **OAuth client ID**
3. Application type: **Desktop app**
4. Name: `OpenClaw` (or anything you like)
5. Click **Create**
6. A dialog appears with your client ID and secret
7. Click **Download JSON**
8. Rename the downloaded file to `google-client.json`

## Step 5: Place the Credentials File

Copy `google-client.json` to your OpenClaw credentials folder:

```
~/.openclaw/credentials/google-client.json
```

Create the folder if it doesn't exist:

```bash
mkdir -p ~/.openclaw/credentials
cp ~/Downloads/google-client.json ~/.openclaw/credentials/
```

## Step 6: Authenticate

1. When OpenClaw first tries to access Gmail, it will show you a Google sign-in URL
2. Open the URL in your browser
3. Sign in with the Gmail account you added as a test user
4. Grant the requested permissions
5. OpenClaw saves the token automatically as `~/.openclaw/credentials/google-token.json`

**Done!** OpenClaw can now read, send, and manage your Gmail.

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| "Access blocked: This app's request is invalid" | Make sure you added your email as a test user (Step 3.7) |
| "Error 403: access_denied" | The Gmail API isn't enabled — go back to Step 2 |
| "Token expired" | Delete `google-token.json` and re-authenticate (Step 6) |
| "Redirect URI mismatch" | Make sure you chose **Desktop app** as the application type (not Web) |
| Can't find credentials folder | Run `mkdir -p ~/.openclaw/credentials` |

## Security Notes

- **Never share** `google-client.json` or `google-token.json` publicly
- **Don't commit** these files to git
- The token gives full access to read/send email — treat it like a password
- To revoke access: go to [myaccount.google.com/permissions](https://myaccount.google.com/permissions) and remove the app

---

*Last updated: March 3, 2026*
