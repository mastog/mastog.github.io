/// <reference types="mdast" />
import { h } from 'hastscript'

/**
 * Creates a Steam Game Card component.
 * 
 * @param {Object} properties - The properties of the component.
 * @param {string} properties.appId - The Steam application ID.
 * @param {import('mdast').RootContent[]} children - The children elements (unused).
 * @returns {import('mdast').Parent} The created Steam Game Card component.
 */
export function SteamGameComponent(properties, children) {
  if (Array.isArray(children) && children.length !== 0)
    return h('div', { class: 'hidden' }, [
      'Invalid directive. ("steamgame" directive must be leaf type "::steamgame{appId=\"12345\"}")',
    ])

  if (!properties.appId || isNaN(properties.appId))
    return h(
      'div',
      { class: 'hidden' },
      'Invalid app ID. ("appId" must be a valid Steam application number)'
    )

  const appId = properties.appId
  const cardUuid = `SG${Math.random().toString(36).slice(-6)}`

  const nCover = h(`div#${cardUuid}-cover`, { class: 'sg-cover' })

  const nTitle = h(`div#${cardUuid}-title`, { class: 'sg-title' }, 'Loading...')
  const nPrice = h(`div`, { class: 'sg-flex' }, [h(`div#${cardUuid}-subtitle`, { class: 'sg-subtitle' }, 'Price: '), h(`div#${cardUuid}-price`, { class: 'sg-price' }, '•••')])
  const nReview = h(`div#${cardUuid}-review`, { class: 'sg-review' }, '•••')

  const nScript = h(
    `script#${cardUuid}-script`,
    { type: 'text/javascript', defer: true },
    `
      Promise.all([
        fetch('https://thingproxy.freeboard.io/fetch/https://store.steampowered.com/api/appdetails?appids=${appId}&l=english', {
          headers: { 'User-Agent': 'SteamCardFetcher/1.0' }
        }),
        fetch('https://thingproxy.freeboard.io/fetch/https://store.steampowered.com/appreviews/${appId}?json=1&l=english', {
          headers: { 'User-Agent': 'SteamCardFetcher/1.0' }
        })
      ])
      .then(async ([detailsRes, reviewsRes]) => {
        const details = await detailsRes.json();
        const reviews = await reviewsRes.json();

        if (!details[${appId}]?.success) throw new Error('Invalid app ID');
        
        const data = details[${appId}].data;
        const reviewSummary = reviews.query_summary;

        const coverEl = document.getElementById('${cardUuid}-cover');
        coverEl.style.backgroundImage = 'url(' + data.header_image + ')';
        
        document.getElementById('${cardUuid}-title').innerText = data.name;
        document.getElementById('${cardUuid}-price').innerText = 
          data.price_overview?.final_formatted || 'N/A';

        const totalPositive = reviewSummary.total_positive;
        const totalReviews = reviewSummary.total_reviews;
        const reviewScoreDesc = reviewSummary.review_score_desc;
        const percentage = totalPositive / totalReviews;

        const reviewColor = 'hsl(' + (percentage * 120) + ', 100%, 30%)';

        const reviewHtml = '<strong style="color: ' + reviewColor + ';">' +
          totalPositive + ' / ' + totalReviews + ' <em>(' + reviewScoreDesc + ')</em></strong>';

        document.getElementById('${cardUuid}-review').innerHTML = reviewHtml;

        document.getElementById('${cardUuid}-card').classList.remove("sg-loading");
      })
      .catch(err => {
        const card = document.getElementById('${cardUuid}-card');
        card.classList.add("sg-error");
        card.querySelector('.sg-title').innerText = 'Failed to load game data';
        console.error('[SteamCard] Error loading ${appId}:', err);
      })
    `
  )

  return h(
    `a#${cardUuid}-card`,
    {
      class: 'card-steam sg-loading no-styling',
      href: `https://store.steampowered.com/app/${appId}`,
      target: '_blank',
      appId
    },
    [
      h('div', { class: 'sg-info' }, [
        nTitle,
        nPrice,
        nReview
      ]),
      nCover,
      nScript,
    ]
  )
}