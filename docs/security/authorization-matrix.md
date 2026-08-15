# Authorization matrix

| Capability                    |     Owner |           Parent |         Guardian |     Caregiver |                          Child |
| ----------------------------- | --------: | ---------------: | ---------------: | ------------: | -----------------------------: |
| Read own family               |       Yes |              Yes |              Yes |           Yes |         Own allowed projection |
| Manage family/members         |       Yes |       Configured |       Configured | No by default |                             No |
| Create/manage goals           |       Yes |              Yes |              Yes |    Configured |                             No |
| Submit completion             | For child |        For child |        For child |     For child |                       Own only |
| Approve completion            |       Yes |              Yes |              Yes |    Configured |                             No |
| Manage reward catalog         |       Yes |              Yes |              Yes |    Configured |                             No |
| Choose/request reward         | For child |        For child |        For child |     For child |                       Own only |
| Approve/fulfill/refund reward |       Yes |              Yes |              Yes |    Configured |                             No |
| Read point ledger             |       Yes |              Yes |              Yes |    Configured | Own balance/history projection |
| Write ledger directly         |        No |               No |               No |            No |                             No |
| Manage privacy/deletion       |       Yes |       Configured |       Configured |            No |                             No |
| Manage subscription           |       Yes | Adult app policy | Adult app policy | No by default |                             No |
| Connect providers             |       Yes |       Configured |       Configured | No by default |                             No |

Caregiver capabilities are deny-by-default and stored as explicit permissions. UI visibility is
never the authorization control; the domain and database independently enforce the decision.
