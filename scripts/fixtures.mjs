export const tags = [
  {
    id: '1',
    name: 'Kubernetes',
    slug: 'kubernetes',
    url: '/tag/kubernetes/',
    visibility: 'public',
    description: 'Clusters, orchestration, and the tools that help us understand them.',
    count: { posts: 4 },
  },
  {
    id: '2',
    name: 'Observability',
    slug: 'observability',
    url: '/tag/observability/',
    visibility: 'public',
    description: 'Metrics, logs, and a closer look at what is happening.',
    count: { posts: 2 },
  },
  {
    id: '3',
    name: 'Storage',
    slug: 'storage',
    url: '/tag/storage/',
    visibility: 'public',
    description: 'A home for persistent data.',
    count: { posts: 1 },
  },
  {
    id: '4',
    name: 'Networking',
    slug: 'networking',
    url: '/tag/networking/',
    visibility: 'public',
    description: 'Connecting the pieces of a homelab.',
    count: { posts: 1 },
  },
  {
    id: '5',
    name: 'Self-hosting',
    slug: 'self-hosting',
    url: '/tag/self-hosting/',
    visibility: 'public',
    description: 'Your services, on your terms.',
    count: { posts: 1 },
  },
];
export const author = {
  id: 'harish',
  slug: 'harish',
  name: 'Harish Thangadurai',
  url: '/author/harish/',
  bio: 'I write down what I learn from building, running, and troubleshooting my homelab.',
  website: 'https://harish2k01.xyz',
};
export const articleHtml = `<p>Earlier in our Kubernetes Home Lab journey, we looked at K9s, a terminal-based interface that made managing our Kubernetes cluster much easier than working with kubectl alone.</p><h2 id="what-is-sofka">What is Sofka?</h2><p>Sofka is an open-source terminal user interface for Kubernetes inspired by K9s. It brings resource browsing, logs, YAML views, and GitOps integrations into one workspace.</p><h2>Installing Sofka</h2><p>Download the executable for your operating system and architecture, extract it, and add the folder to your PATH.</p><aside class="kg-card kg-callout-card"><div class="kg-callout-text">Choose the binary for the computer you use to access your cluster.</div></aside><h2>Read-only exploration</h2><p>If we only want to inspect our cluster, we can launch Sofka in read-only mode:</p><pre><code class="language-shell">sofka --readonly</code></pre><p>Shortcuts depend on the current view. Press <code>?</code> to check available bindings.</p><h2>Read-only exploration</h2><p>Duplicate headings receive unique anchors. Existing Ghost headings keep their original IDs.</p><h2>Content cards</h2><figure class="kg-card kg-bookmark-card"><a class="kg-bookmark-container" href="https://harish2k01.in/introducing-k9s-terminal-based-kubernetes-dashboard/"><div class="kg-bookmark-content"><div class="kg-bookmark-title">Introducing K9s: Terminal-based Kubernetes Dashboard</div><div class="kg-bookmark-description">Explore resources in a Kubernetes cluster using the terminal.</div><div class="kg-bookmark-metadata">Harish's Tech Bytes</div></div></a></figure><h3>A wide illustration</h3><figure class="kg-card kg-image-card kg-width-wide"><img class="kg-image" src="/fixtures/homelab.svg" width="1000" height="500" alt="A colorful illustrated server stack"><figcaption>A local fixture illustration for layout verification.</figcaption></figure><h3>Image gallery</h3><figure class="kg-card kg-gallery-card"><div class="kg-gallery-container"><div class="kg-gallery-row"><div class="kg-gallery-image"><img src="/fixtures/homelab.svg" width="1000" height="500" alt="Server illustration"></div><div class="kg-gallery-image"><img src="/fixtures/homelab.svg" width="500" height="500" alt="Second server illustration"></div></div></div></figure><h3>Tables</h3><table><thead><tr><th>Tool</th><th>Purpose</th><th>Example</th></tr></thead><tbody><tr><td>Sofka</td><td>Cluster exploration</td><td><code>sofka --readonly</code></td></tr><tr><td>kubectl</td><td>Resource inspection</td><td><code>kubectl get pods</code></td></tr></tbody></table><blockquote>Build it. Learn from it. Share what you find.</blockquote><p>Happy Homelabbing!!!</p>`;
const entries = [
  ['sofka', 'Exploring Sofka: A Modern Terminal UI for Kubernetes', '2026-09-26', 0, 4],
  ['why', 'Why Kubernetes for a Home Lab?', '2026-05-30', 0, 7],
  ['logs', 'Enhancing Kubernetes Observability with Loki and Alloy', '2025-09-28', 1, 7],
  ['metrics', 'Monitoring Kubernetes with Prometheus and Grafana', '2025-09-13', 1, 5],
  ['storage', 'Installing Longhorn: Distributed Storage for Kubernetes', '2025-09-06', 2, 6],
  ['network', 'Installing MetalLB and NGINX Ingress Controller in Kubernetes', '2025-08-27', 3, 5],
  ['k9s', 'Introducing K9s: Terminal-based Kubernetes Dashboard', '2025-07-26', 0, 3],
  ['cluster', 'Installing Kubernetes: Building a Bare-Metal Cluster', '2025-07-23', 0, 8],
  [
    'jellyfin',
    'Installing Jellyfin: Your Open-Source Media Streaming Solution',
    '2024-09-21',
    4,
    7,
  ],
];
export const posts = entries.map(([id, title, date, topic, time]) => ({
  id,
  slug: title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-$/, ''),
  title,
  published_at: date,
  primary_tag: tags[topic],
  tags: [tags[topic]],
  authors: [author],
  url: `/${id}/`,
  excerpt:
    id === 'sofka'
      ? 'A closer look at cluster browsing, debugging, and read-only exploration.'
      : 'Practical notes from building and running the pieces of a homelab.',
  html: articleHtml,
  reading_time: `${time} min read`,
  access: true,
  visibility: 'public',
  comments: true,
  feature_image: '/fixtures/homelab.svg',
  feature_image_alt: 'Colorful server illustration',
  feature_image_caption: 'Theme fixture artwork',
  trail: ['cluster', 'network', 'storage', 'metrics'].includes(id),
}));
export const illustration = `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="500" viewBox="0 0 1000 500"><rect width="1000" height="500" fill="#92cde9"/><circle cx="780" cy="110" r="65" fill="#f4cf51"/><rect x="295" y="85" width="410" height="340" rx="24" fill="#cec1f2" stroke="#302738" stroke-width="5"/><g fill="#403554"><rect x="325" y="130" width="350" height="70" rx="10"/><rect x="325" y="215" width="350" height="70" rx="10"/><rect x="325" y="300" width="350" height="70" rx="10"/></g><g fill="#c7df87"><circle cx="640" cy="165" r="8"/><circle cx="640" cy="250" r="8"/><circle cx="640" cy="335" r="8"/></g><text x="85" y="440" font-family="monospace" font-size="30" fill="#302738">BUILD. LEARN. SHARE.</text></svg>`;
