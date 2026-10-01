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

- Keep Cyber Raid client-only and centralize mission state in the Zustand game store, because the WebGL scene and HUD need one deterministic campaign state.
- Use procedural geometry for room architecture and locally hosted CC0 GLB files for recognizable office/server props, because the game must not depend on runtime third-party assets.
