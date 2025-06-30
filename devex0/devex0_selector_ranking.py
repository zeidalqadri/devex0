import re
import json
from bs4 import BeautifulSoup
from collections import defaultdict
import math

class AssetSelectorRanker:
    """
    Analyzes an HTML document to extract and rank CSS selectors based on their
    perceived "asset value" using a heuristic scoring model.
    This version is enhanced to prioritize 'data-testid' attributes and improve class filtering.
    """

    def __init__(self, html_content):
        """
        Initializes the ranker with HTML content.

        Args:
            html_content (str): The HTML script of the page to analyze.
        """
        if not isinstance(html_content, str):
            raise TypeError("html_content must be a string.")
            
        self.html = html_content
        self.soup = BeautifulSoup(self.html, 'lxml')
        
        # --- Configuration ---
        # Keywords with associated weights, tailored for e-commerce
        self.keywords = {
            'sku': 25, 'productid': 25, 'price': 20, 'pricing': 20, 'sale': 18, 'discount': 18,
            'inventory': 20, 'stock': 20, 'availability': 18, 'productcard': 20,
            'product': 15, 'item': 15, 'brand': 12, 'designer': 12, 'vendor': 10,
            'name': 10, 'title': 10, 'details': 8, 'info': 8, 'description': 8,
            'size': 10, 'color': 8, 'variant': 10, 'cart': 15, 'bag': 15,
            'checkout': 15, 'purchase': 15, 'add': 12, 'buy': 12,
            'list': 8, 'grid': 8, 'gallery': 7, 'image': 7, 'main': 5,
        }
        
        # A prioritized list of attributes for generating stable selectors
        self.STABLE_ATTRIBUTES = [
            'id', 'data-testid', 'data-product-id', 'data-sku', 'data-cy', 'data-test', 'name'
        ]
        
        # A blocklist of common, unhelpful CSS class prefixes or names
        self.CLASS_BLOCKLIST = ['ltr-', 's-']
        
        self.ranked_selectors = []

    def _get_stable_selector(self, element):
        """
        Generates a stable, readable CSS selector for a given element.
        Prioritizes attributes from self.STABLE_ATTRIBUTES, then classes.
        """
        if not hasattr(element, 'name') or not element.name:
            return None

        # Priority 1: A stable, unique identifier attribute
        for attr in self.STABLE_ATTRIBUTES:
            if element.has_attr(attr):
                val = element[attr]
                # Regex to check for stable, string-based identifiers
                if isinstance(val, str) and re.match(r'^[a-zA-Z][a-zA-Z0-9\-_.]*$', val):
                    return f"{element.name}[{attr}='{val}']"

        # Priority 2: A meaningful combination of classes, avoiding blocked ones
        if element.has_attr('class'):
            classes = sorted([
                c for c in element['class'] 
                if not any(c.startswith(prefix) for prefix in self.CLASS_BLOCKLIST)
            ])
            if classes:
                return f"{element.name}.{'.'.join(classes)}"
        
        return None

    def _score_element(self, element):
        """Calculates the asset value score for a single HTML element."""
        score = 0

        # 1. Score based on attributes (id, class, data-*)
        attrs_text = ''
        for attr, value in element.attrs.items():
            # Join list values (like class) into a single string
            attr_val_str = ' '.join(value) if isinstance(value, list) else str(value)
            attr_text = attr_val_str.replace('-', ' ').replace('_', ' ')
            
            # Give higher weight to stable attributes
            weight = 2.5 if attr in self.STABLE_ATTRIBUTES else 1.0
            attrs_text += f' {attr.replace("-", " ")} {attr_text}' * int(weight)

        attrs_text = attrs_text.lower()
        for keyword, weight in self.keywords.items():
            if re.search(r'\b' + re.escape(keyword) + r'\b', attrs_text):
                score += weight

        # 2. Score based on text content
        text_content = element.get_text(strip=True, separator=' ').lower()
        if text_content:
            if re.search(r'€|\$|£|usd|eur|gbp|myr', text_content):
                score += 25
            if re.search(r'add to bag|add to cart|buy now|add to wishlist', text_content):
                score += 30
            for keyword, weight in self.keywords.items():
                 if re.search(r'\b' + re.escape(keyword) + r'\b', text_content):
                    score += weight * 0.5  # Text is a weaker signal

        # 3. Structural & Microdata Scoring
        if element.has_attr('itemprop'):
             score += 20
             prop_value = element['itemprop'].lower()
             for keyword, weight in self.keywords.items():
                 if keyword in prop_value:
                     score += weight * 1.5

        if element.name == 'script' and element.attrs.get('type') == 'application/ld+json':
            score += 150 # Extremely high value
            
        return score
    
    def _learn_from_json_ld(self):
        """Parses JSON-LD scripts to dynamically add relevant keywords."""
        json_ld_scripts = self.soup.find_all('script', type='application/ld+json')
        
        def get_all_keys(d, keys_set):
            if isinstance(d, dict):
                for k, v in d.items():
                    sanitized_key = re.sub(r'[^a-z]', '', k.lower())
                    if sanitized_key:
                        keys_set.add(sanitized_key)
                    get_all_keys(v, keys_set)
            elif isinstance(d, list):
                for item in d:
                    get_all_keys(item, keys_set)

        all_schema_keys = set()
        for script in json_ld_scripts:
            if script.string:
                try:
                    data = json.loads(script.string)
                    get_all_keys(data, all_schema_keys)
                except (json.JSONDecodeError, AttributeError):
                    continue
        
        print(f"Discovered {len(all_schema_keys)} potential keywords from JSON-LD schemas.")
        for key in all_schema_keys:
            if key not in self.keywords:
                self.keywords[key] = 10


    def rank_selectors(self):
        """
        Main method to perform the extraction and ranking process.
        
        Returns:
            list: A sorted list of dictionaries, each containing a selector and its score.
        """
        self._learn_from_json_ld()
        
        selector_scores = defaultdict(lambda: {'score': 0, 'count': 0})
        for element in self.soup.find_all(True):
            score = self._score_element(element)
            if score > 15: # Confidence threshold
                selector = self._get_stable_selector(element)
                if selector:
                    selector_scores[selector]['score'] += score
                    selector_scores[selector]['count'] += 1
        
        final_ranks = []
        for selector, data in selector_scores.items():
            # Boost score based on repetition count (logarithmic boost)
            final_score = data['score'] * (1 + math.log10(data['count'])) if data['count'] > 0 else data['score']
            final_ranks.append({
                'selector': selector,
                'final_score': round(final_score, 2),
                'total_base_score': round(data['score'], 2),
                'count': data['count']
            })
            
        self.ranked_selectors = sorted(final_ranks, key=lambda x: x['final_score'], reverse=True)
        return self.ranked_selectors

    def print_top_n(self, n=25):
        """Prints the top N ranked selectors."""
        if not self.ranked_selectors:
            self.rank_selectors()
            
        print("\n" + "="*60)
        print(f"--- Top {n} Ranked Asset Selectors (Iteration 3) ---")
        print("="*60)
        for item in self.ranked_selectors[:n]:
            print(
                f"Selector: {item['selector']}\n"
                f"  - Final Score: {item['final_score']}\n"
                f"  - Occurrences: {item['count']}\n"
                f"  - Total Base Score: {item['total_base_score']}\n"
            )

# --- Main Execution ---
if __name__ == '__main__':
    html_script = """
    <html dir="LTR" lang="en-US" data-reactroot="" class="js-focus-visible" data-js-focus-visible="" style="--header-height: 124px;">
    ... [PASTED FARFETCH HTML CONTENT] ...
    </script></body></html>
    """

    ranker = AssetSelectorRanker(html_script)
    ranker.print_top_n(25)