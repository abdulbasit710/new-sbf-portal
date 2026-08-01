# Brad Partner Portal setup

The dashboard queries the five God's Blueprint CORE data sources on the server and scopes every query using the `BRAD_PARTNER_PAGE_ID` relation.

1. Configure the variables in `.env.local.example`.
2. Share every CORE database with the same Notion integration.
3. Run `npm.cmd ci` and `npm.cmd run dev`.
4. Open `/api/portal/brad/health?email=brad@keatyrealestate.com` to verify access and live counts.

Required properties:

- Assets and Investors: `Source Partner` relation.
- Buy Boxes: `Owner Partner` relation and `Status`.
- Underwriting and Matches: `Related Partner` relation.
- Matches: `Visibility Allowed` checkbox for partner-visible records.

Failed configuration or Notion access returns a meaningful API error; it is never reported as a successful empty dataset.
