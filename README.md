# Tech Bytes Playground

A custom Ghost theme for hands-on technology writing, created for [Harish's Tech Bytes](https://harish2k01.in). Colorful illustrations, an interactive homelab, and topic discovery introduce the articles; readable typography and a focus mode support longer tutorials.

![Homepage rendered from the theme's actual templates with local fixture content](docs/homepage.jpg)

## Features

- Light, dark, and system appearance, with a remembered reader preference.
- Native Ghost search, Portal membership, subscription, account access, and comments.
- Topic navigation generated from public tags, plus randomized article discovery.
- Illustrated article cards or original feature images, selected in Ghost Admin.
- Automatic article contents, reading progress, copyable code blocks, and sharing.
- Tag and author archives, Load More with pagination links as a fallback, related posts, and existing post URLs.
- Ghost editor content, including wide/full-width cards, image zoom and galleries, embeds, and member-gated content.
- Local fonts and icons, keyboard navigation, mobile layouts, and reduced-motion support.

## Build and install

Download the versioned theme ZIP from [GitHub Releases](https://github.com/harish2k01/tech-bytes-playground/releases). `SHA256SUMS.txt` accompanies each release. The automatically generated source-code archives are not the installable theme.

Requires Node.js 22.17+ or 24 and Ghost 5.54.1 or later.

```sh
npm ci
npm test
npm run zip
```

Upload `dist/tech-bytes-playground-0.1.0.zip` through Ghost Admin's theme settings. Preview the theme before activating it. The theme does not change posts, routes, membership settings, or existing comments. A previous theme can be activated again in Ghost Admin.

`npm run dev` rebuilds assets on changes. `npm run preview` serves a local fixture preview of the actual templates; it does not connect to Ghost accounts or send subscriptions or comments.

## Configuration

Ghost Admin exposes hero text, default appearance, card artwork, reading-trail text, newsletter heading, and footer copy. Navigation, logo, secondary navigation, public tags, membership, and comments use the publication's existing Ghost settings.

The reading trail appears when published posts have the internal tag `#trail`. It lists up to eight posts from oldest to newest. Internal tags are not displayed to visitors. Remove that tag to remove a post from the trail. The illustrated homelab links to the three most-used public tags, so topic destinations are not fixed to one publication. Topic navigation includes up to 100 public tags. Surprise Me chooses from the latest 100 published posts.

The existing `custom-full-feature-image`, `custom-narrow-feature-image`, and `custom-no-feature-image` template names remain available for articles already using them.

## Automatic releases

Every PR targeting the repository's default branch requires exactly one `major`, `minor`, or `patch` label. Other labels are allowed. `path` is a typo and fails the check. A merged PR triggers validation, packaging, and publication of a GitHub Release with the installable ZIP and SHA-256 checksum. No npm package is published.

| Label   | Example from v1.2.3 |
| ------- | ------------------- |
| `major` | v2.0.0              |
| `minor` | v1.3.0              |
| `patch` | v1.2.4              |

Before the first release, `package.json` supplies the baseline, currently 0.1.0: `major` produces 1.0.0, `minor` produces 0.2.0, and `patch` produces 0.1.1. Later releases use the highest stable version tag. Each tag points to the exact merged PR revision; the ZIP's package metadata is set to that release version during the build. Source files on the default branch are not changed by the release job.

| Scenario                                                         | Behavior                                                                                                                             |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Missing or multiple release labels                               | PR check fails; publication stops if the PR is merged anyway.                                                                        |
| Label added, removed, or changed                                 | The label check reruns using current PR labels.                                                                                      |
| PR closed without merging or merged into another branch          | No release.                                                                                                                          |
| Direct push to the default branch                                | Theme validation runs; no new release is created.                                                                                    |
| Closely spaced merges                                            | Serialized runs process pending PRs in default-branch order. A replacement queued run still processes every pending merged PR.       |
| Build, validation, or API failure                                | Publication stops; later pending PRs wait for successful recovery.                                                                   |
| Failure after tag creation or draft upload                       | Run **Release theme** manually or rerun the failed workflow. The existing version is reused and incomplete draft assets are rebuilt. |
| Rerun after successful publication                               | No new version or asset overwrite. Later label edits do not change a published release.                                              |
| Tag points to the wrong revision or published assets are missing | Fails for manual investigation; published assets and tags are never overwritten.                                                     |

The manual **Release theme** workflow reconciles all pending merged PRs; it does not release unmerged changes. The release label is validated again before reserving a version. Retain the intended label during recovery; once a tag is reserved, changing its release label fails until the original label is restored. Only trusted default-branch code is used by the privileged release workflow, including for merged fork PRs. Branch protection requires **Release label** and **Theme validation** before merging.

## Validation

`npm test` builds assets, checks template syntax and integration hooks, tests heading-anchor collisions, and runs Ghost's GScan validator. GitHub Actions repeats validation and produces a theme ZIP. A fixture preview is useful for visual review; native Portal, search indexing, comments, and access restrictions must also be checked on a running Ghost installation before production activation.

GScan's archive-extraction dependency currently has upstream npm audit advisories. This project validates its local directory, does not extract externally supplied ZIP files through GScan, and excludes development dependencies from the installable theme. Handlebars is overridden to the patched 4.7.10 release.

## License

MIT. Fonts include their respective upstream license files. Lucide icons are ISC licensed, and PhotoSwipe is MIT licensed. Third-party license notices accompany the packaged assets.
