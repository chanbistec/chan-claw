# Step 5: Conditional Access

Configure or provide requirements for Entra ID Conditional Access policies.

## What You'll Configure

You typically don't configure CA policies yourself—customer IT does. But you need to:

1. **Provide requirements** to customer IT
2. **Test your agent** under their CA policies

## Provide This to Customer IT

```
REQUIREMENTS FOR COPILOT STUDIO DEPLOYMENT

Service URL: https://copilotstudio.microsoft.com

Required Access:
- Users must be able to access copilotstudio.microsoft.com
- Users must be able to authenticate via Entra ID
- MFA is required (acceptable methods: Microsoft Authenticator, FIDO2, etc.)

Recommended Conditions:
- Block access from unknown locations (optional)
- Require compliant device (optional)
- Require hybrid joined device (optional)

Required User Roles:
- Copilot Studio User (minimum)
- Copilot Studio Editor (for makers)
- Copilot Studio Admin (for administrators)

Blocked Actions:
- None required
```

## Test Conditional Access

```powershell
# As a regular user, test access
1. Sign out of all sessions
2. Go to https://copilotstudio.microsoft.com
3. Attempt to sign in
4. Verify MFA is prompted
5. Verify you can access your environment

# As admin, check access logs
Get-AzureADUserSignInLog -Filter "AppDisplayName eq 'Copilot Studio'"
```

## Next Steps

Proceed to **Step 6: Audit Logging**
