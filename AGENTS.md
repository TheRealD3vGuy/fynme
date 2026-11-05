<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->
Staff media upload validation is centralized in src/lib/upload.ts and must match the Cloud storage cap so every uploader enforces the same limit.
Private events use hashed invite codes and opaque HttpOnly cookie sessions checked server-side against event expiry, publication, lock and access version; revocation never depends on browser state. Guest media uses the dedicated private bucket with short-lived signed URLs, so it is not exposed through storefront content.
