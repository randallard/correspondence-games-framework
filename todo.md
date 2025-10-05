  ☐ Phase 6.2: Create integration tests
  ☐ Phase 7: Create GitHub Actions workflow
  ☒ Run Level 1 Validation: Type-check and lint
  ☐ Run Level 2 Validation: Unit tests
  ☐ Run Level 3 Validation: Integration tests

  "as definted in PRPs/configurable-game-framework-prd.md and PRPs/configurable-game-framework.md, the config and framework was
  used to build rock paper scissors in
  /home/ryankhetlyr/Development/correspondence-games/correspondence-games-framework/games/rock-paper-scissors.  The game loads
  from config but the flow is off - after player 1 chooses, they see the url to send to player 2, then player 2 chooses, player
  2 then sees the results and, if there's a next round, gets to make the next choice before getting the url to send back to
  player 1, then player 1 sees the results and makes the decision for round 2, then seeing the results and getting to make the
  decision for the next round, if there is one, before getting the url to send back to player 2, continuing like that until the
  final round and the url with final results is shown after the last decision is made by the last player.  Update
  rock-paper-scissors to implement this flow"
