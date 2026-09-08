# webpack 5.110 HTML minifier deduplicates the `%}` delimiter in copied `.html`

webpack 5.110.0 added a built-in HTML minifier, on by default in
`mode: 'production'`. It re-serializes every `.html` asset, including files that
`copy-webpack-plugin` passes through unchanged. When such a file contains
`{% ... %}` server-side template statements (the statement delimiter of the
Django/Jinja family: Jinja2, Django, Twig, Liquid, Nunjucks, HubSpot HubL), the
minifier can drop a `%}` delimiter and emit invalid markup from valid input. No
HTML loader, `html-webpack-plugin`, or configured minimizer is involved.

## Run

```bash
npm install
npm run verify   # build, then print each src/*.html next to its dist/ output
```

## Result

```
== src/corrupt-conditional-attribute.html -> dist/corrupt-conditional-attribute.html ==
  in : <input type="text"{% if required %} required{% endif %}>
  out: <input type=text {% if required %} required{% endif>
== src/corrupt-space-inside-conditional.html -> dist/corrupt-space-inside-conditional.html ==
  in : <div class="btn{% if active %} btn-active{% endif %}"></div>
  out: <div class="btn{% if active %} btn-active{% endif"></div>
== src/survive-space-outside-conditional.html -> dist/survive-space-outside-conditional.html ==
  in : <div class="btn {% if active %}btn-active{% endif %}"></div>
  out: <div class="btn {% if active %}btn-active{% endif %}"></div>
```

`type="text"` quote removal is valid HTML minification and is not the problem.
The problem is the dropped `%}`.

## Root cause

The minifier (`webpack/lib/html/syntax.js`) is a spec-compliant HTML parser with
no template-syntax awareness. `%}` tokenizes as a valid HTML attribute name (the
attribute-name state accepts every character except whitespace, `/`, `>`, and
`=`), so `{% if required %} required{% endif %}` produces two `%}`
attribute-name tokens. Two mechanisms then drop the repeat:

- **Duplicate attribute-name removal**
  ([`syntax.js` L8520-L8528 @ v5.110.3](https://github.com/webpack/webpack/blob/a2d7b9ca343905667770c3e80321387fb0332c23/lib/html/syntax.js#L8520-L8528)),
  spec-mandated and what a real browser also does. Corrupts
  `corrupt-conditional-attribute.html`.
- **Token-list deduplication**
  ([`syntax.js` `_normalizeTokenList`, L10200-L10231 @ v5.110.3](https://github.com/webpack/webpack/blob/a2d7b9ca343905667770c3e80321387fb0332c23/lib/html/syntax.js#L10200-L10231)),
  webpack's own minify transform for `DOMTokenList` attributes like `class`,
  not spec behavior — a browser preserves `class` verbatim. Corrupts
  `corrupt-space-inside-conditional.html`.

(Links are pinned to the `v5.110.3` commit, so the line numbers stay accurate as
the code changes.)

## Versions

Byte-identical (correct) output on `5.109.2`, the final 5.109.x release, which
predates the built-in minifier. Identical corruption on `5.110.0`, `5.110.2`,
and `5.110.3`. The break lands at the 5.109 to 5.110 boundary.
