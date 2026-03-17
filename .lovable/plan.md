

## Real Lead Generation with Firecrawl

Good news — I can build this using **Firecrawl**, which is available as a connector. It has a **web search** feature that can find real businesses by type and location, and a **scrape** feature to extract contact details from their websites. You don't need to provide any API keys — I'll connect it through Lovable's built-in connector system.

### What I'll Build

1. **Connect Firecrawl** — link the connector to this project for real web search capabilities

2. **Create edge function `search-leads`** — accepts business type, location, and optional service; uses Firecrawl's search API to find real businesses, then parses results into structured lead data (business name, website, social links, contact info, AI insight)

3. **Create edge function `enrich-lead`** — when a user clicks a lead, scrapes the business website to find social media links, email addresses, and phone numbers that weren't in the initial search

4. **Update frontend** — replace the mock `generateLeads()` call with a real API call to the edge function; add loading states, error handling, and enrichment on lead click

5. **Update Lead type** — add fields for phone, email, and enrichment status

### What You Need To Do

When I start building, Lovable will prompt you to **connect Firecrawl**. You'll need to either:
- Use the managed Firecrawl connection (free tier includes credits)
- Or connect your own Firecrawl API key

That's the only thing I need from you. Everything else I can build on my own.

### Technical Details

- **Search query format**: `"{businessType}" in {location} small business` — this targets real businesses
- **Result parsing**: Extract business name from title, website from URL, scan markdown for social links and contact patterns
- **Rate limiting**: Free tier has limited credits, so I'll cap searches at 20 results initially (upgradeable with premium)
- **Fallback**: If Firecrawl isn't connected, the tool will show a clear message asking the user to set it up

Shall I proceed?

