Typescript (vite + react + pixijs) application.

- After making changes, run the following in parallel sub-agents to verify correctness, fixing any errors:
 - `npm run build`
 - `npm run test:run`
 - `npm run knip`
    - remove any unused files or dependencies reported by knip


Do the above in sub-agents so they run in parallel.

- If adding code to a file will considerably increase its length, consider splitting it into multiple files.
- Prefer self-documenting code over comments
- Never run `npm run dev` - the output runs in the browser which you won't see
