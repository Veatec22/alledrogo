// allegroContent.js

function findPriceHost(startNode) {
  let candidate = startNode.parentElement;
  if (!candidate) return null;

  const isPriceLike = (text) => /(\d[\s\u00A0,.]*){2,}/.test(text) && text.length < 100;

  while (
    candidate.parentElement &&
    candidate.parentElement !== document.body &&
    isPriceLike(candidate.parentElement.textContent) &&
    candidate.parentElement.getElementsByTagName('a').length < 2 &&
    candidate.parentElement.textContent.length < 150
  ) {
    if (candidate.parentElement.textContent.trim() === candidate.textContent.trim()) {
      candidate = candidate.parentElement;
    } else {
      candidate = candidate.parentElement;
    }
  }
  return candidate;
}

function getSearchContexts() {
    const url = window.location.href;
    let offerSelectors = [];

    if (url.includes('/oferta/')) {
        offerSelectors = [
          '[data-box-name="summaryOneColumn"]',
          '[data-box-name*="Other Offers"]',
          '[data-box-name*="Container Bundle - base"]',
          '[data-box-name*="allegro.offers.banner.vendor.lokalnie"]',
          '[data-box-name*="precart-layer-offers-container"]',
          '[data-box-name*="allegro.cart"]',
          '[class*="carousel"]',
          '[data-box-name*="carousel"]',
        ];
    }

    const contexts = offerSelectors.flatMap(sel => Array.from(document.querySelectorAll(sel)));

    return contexts.length > 0 ? contexts : [document.body];
}

function processPricesOnPage(searchContexts, earningsToUse, hoursPerDay, daysPerWeek, conversionMode, kebabPrice) {
  const priceRegex = /(\d{1,3}(?:[\s\u00A0]?\d{3})*,\d{2})\s*zł/;
  const processedHostsThisRun = new Set();

  for (const context of searchContexts) {
    const walker = document.createTreeWalker(context, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      const text = node.nodeValue;
      if (text.includes('zł') || text.match(/\d[,.]\d/)) {
        const host = findPriceHost(node);

        if (host) {
          const hostText = host.textContent;
          const match = hostText.match(priceRegex);

          if (match) {
            const fullPriceTextMatched = match[0];
            const priceTextForParsing = match[1];

            const pricePLN = parseFloat(priceTextForParsing.replace(/\s/g, '').replace(',', '.'));

            if (!isNaN(pricePLN) && pricePLN > 0) {
              const convertedValue = convertPrice(pricePLN, earningsToUse, hoursPerDay, daysPerWeek, conversionMode, kebabPrice);
              if (convertedValue !== null) {

                const conversionId = `${fullPriceTextMatched}_${convertedValue}_${false}`;

                if (host.dataset.allegroConvertedId === conversionId || processedHostsThisRun.has(host)) {
                    continue;
                }

                if (
                  host.querySelector(`[data-allegro-converted-value="${convertedValue}"]`)
                ) {
                  continue;
                }

                processedHostsThisRun.add(host);

                const convertedSpan = document.createElement('span');
                convertedSpan.style.backgroundColor = '#FF5A00';
                convertedSpan.style.color = 'white';
                convertedSpan.style.fontSize = '0.65em';
                convertedSpan.style.padding = '2px 5px';
                convertedSpan.style.borderRadius = '2px';
                convertedSpan.style.marginLeft = '5px';
                convertedSpan.textContent = convertedValue;
                
                convertedSpan.dataset.allegroConvertedValue = convertedValue; 

                let guaranteeFound = false;
                let searchRoot = host.parentElement || host;

                const textNodes = document.createTreeWalker(searchRoot, NodeFilter.SHOW_TEXT);
                let textNode;
                while ((textNode = textNodes.nextNode())) {
                    if (textNode.nodeValue.includes('Gwarancja najniższej ceny')) {
                        guaranteeFound = true;
                        break; 
                    }
                }

                if (guaranteeFound) {
                    convertedSpan.style.backgroundColor = '#169A23';
                } else {
                    convertedSpan.style.backgroundColor = '#FF5A00';
                }

                const isInCarousel = (
                    host.closest('[class*="carousel"], [data-box-name*="carousel"]') !== null &&
                    host.closest('[data-box-name="summaryOneColumn"]') === null
                );

                if (isInCarousel) {
                  const lineBreak = document.createElement('br');
                  const wrapper = document.createElement('div');
                  wrapper.style.marginTop = '3px';
                  wrapper.appendChild(convertedSpan);

                  const range = document.createRange();
                  range.setStartAfter(node);
                  range.insertNode(wrapper);
                  range.insertNode(lineBreak);
                  } else {
                  const range = document.createRange();
                  range.setStartAfter(node);
                  range.insertNode(convertedSpan);
                  }

                let originalPriceElementWithLineThrough = node.parentElement;
                while (originalPriceElementWithLineThrough && originalPriceElementWithLineThrough !== host && originalPriceElementWithLineThrough.style.textDecoration !== 'line-through') {
                    originalPriceElementWithLineThrough = originalPriceElementWithLineThrough.parentElement;
                }

                if (originalPriceElementWithLineThrough && originalPriceElementWithLineThrough.style.textDecoration === 'line-through') {
                    convertedSpan.style.backgroundColor = '#A9A9A9';
                    convertedSpan.style.color = 'white';
                }

                host.dataset.allegroConvertedId = conversionId;
              }
            }
          }
        }
      }
    }
  }
}

let observer;

function removeAllConversions() {
    document.querySelectorAll('[data-allegro-converted-value]').forEach(span => {
        span.remove();
    });

    document.querySelectorAll('.allegro-price-converter-wrapper').forEach(wrapper => {
        const br = wrapper.nextSibling;
        if (br && br.nodeName === 'BR') {
            br.remove();
        }
        wrapper.remove();
    });
}

function runConversion() {
  chrome.storage.sync.get(['pluginEnabled', 'monthlyEarnings', 'hoursPerDay', 'daysPerWeek', 'conversionMode', 'kebabPrice'], (data) => {
    if (data.pluginEnabled === false) {
      if (observer) {
        observer.disconnect();
      }
      removeAllConversions();
      return;
    }

    const { monthlyEarnings, hoursPerDay = 8, daysPerWeek = 5, conversionMode = 'earnings', kebabPrice = 25 } = data;
    const earningsToUse = monthlyEarnings;

    if (earningsToUse && !isNaN(earningsToUse) && earningsToUse > 0) {
      if (observer) observer.disconnect();

      const searchContexts = getSearchContexts();
      processPricesOnPage(searchContexts, earningsToUse, hoursPerDay, daysPerWeek, conversionMode, kebabPrice);

      if (observer) {
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
      }
    }
  });
}

function initialize() {
    chrome.storage.sync.get(['pluginEnabled'], (data) => {
        if (data.pluginEnabled === false) {
            return;
        }

        observer = new MutationObserver((mutations) => {
            const nodesAdded = mutations.some(mutation => mutation.addedNodes.length > 0);
            if (nodesAdded) {
                runConversion();
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        runConversion();
    });
}

chrome.storage.onChanged.addListener((changes, namespace) => {
    if (changes.pluginEnabled) {
        window.location.reload();
    }
});

initialize();