export function initTopicsDirectory() {
  const button = document.querySelector('[data-more-topics]');
  if (!button) return;
  const grid = document.querySelector('[data-topics-grid]');
  const status = document.querySelector('[data-topics-status]');
  const script = document.querySelector('script[data-ghost][data-key], script[data-sodo-search][data-key]');
  button.addEventListener('click', async () => {
    button.disabled = true;
    try {
      if (!script) throw new Error('Content API unavailable');
      const base = script.dataset.api || `${script.dataset.sodoSearch.replace(/\/$/, '')}/ghost/api/content/`;
      const url = new URL('tags/', base);
      for (const [key, value] of Object.entries({ key: script.dataset.key, include: 'count.posts', filter: 'visibility:public', order: 'name asc', limit: '100', page: button.dataset.moreTopics })) url.searchParams.set(key, value);
      const response = await fetch(url);
      if (!response.ok) throw new Error('Topics unavailable');
      const data = await response.json();
      if (!Array.isArray(data.tags) || !data.meta?.pagination) throw new Error('Invalid topics response');
      const cards = data.tags.map((tag) => {
        const destination = new URL(tag.url, location.href);
        if (destination.origin !== location.origin) throw new Error('Invalid topic URL');
        const link = document.createElement('a');
        link.href = destination.href;
        const heading = document.createElement('span');
        heading.className = 'bp-topic-heading';
        const name = document.createElement('b');
        name.textContent = tag.name;
        const arrow = document.createElement('span');
        arrow.textContent = '↗';
        arrow.setAttribute('aria-hidden', 'true');
        heading.append(name, arrow);
        link.append(heading);
        if (tag.description) { const description = document.createElement('p'); description.textContent = tag.description; link.append(description); }
        const count = document.createElement('small');
        count.textContent = tag.count.posts === 1 ? '1 byte' : `${tag.count.posts} bytes`;
        link.append(count);
        return link;
      });
      grid.append(...cards);
      button.dataset.moreTopics = data.meta.pagination.next ?? '';
      button.hidden = !data.meta.pagination.next;
      status.textContent = `${cards.length} more topics loaded`;
      cards[0]?.focus({ preventScroll: true });
    } catch {
      status.textContent = 'Could not load more topics. Please try again.';
    } finally { button.disabled = false; }
  });
}
