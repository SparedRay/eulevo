# Sign-in email templates (pt-BR)

Supabase's default sign-in emails are in English and only contain a link. These add the **code** that the
login screen's "Código do e-mail" field expects (`{{ .Token }}`), so a host can sign in on any phone,
browser or the installed app, wherever the email itself opens.

Paste them in the Supabase dashboard: **Authentication → Emails → Templates**. Switch the editor to the
source/HTML view, replace the whole body, and set the subject.

| Template | Subject | Body | Sent when |
|---|---|---|---|
| Magic Link | `Seu acesso ao Eu Levo` | `magic-link.html` | an existing host asks for a link |
| Confirm signup | `Confirme seu e-mail no Eu Levo` | `confirm-signup.html` | a new email asks for a link (first sign-in, co-host invites) |

Both templates need `{{ .ConfirmationURL }}` (the button) and `{{ .Token }}` (the code). The code length is set
under **Authentication → Providers → Email → Email OTP Length** (6 by default; the app accepts 6 to 10 digits).
