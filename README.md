# Quest Board

A module for the Foundry VTT dnd5e system. This adds new `JournalEntryPage` document subtypes.

## Quest
The `quest-board.quest` page subtype can be used to write quests for players, or for players to keep track of campaign objectives.

### Use case 1: Player campaign tracking
Players are owners of a journal entry in which they write their own quests as a way to keep track of their current objectives. They can make lists of objectives, write contents, and track their progress this way.

### Use case 2: Campaign story hooks
The game master has a journal entry used to keep track of local objectives, with material or financial rewards, and secret knowledge visible only to game masters.

### Notes
The journal entry page document subtype is built in a way to support players having ownership of the parent journal entry (not required, but supported). The page type also supports embedding.

A context menu option in the journal entry's Table of Contents can be used by a game master to toggle the "Complete" state of a quest.

A context menu option in the journal entry's Table of Contents can be used by a game master to grant material or financial rewards to either a player character or the Primary Party actor. In the page's editor is a tab, which is visible only to game masters, where these rewards can be configured.

## Shop
The `quest-board.shop` page subtype can be used by a game master to set up a shop. Edit the page, drag-and-drop items into the Stock, and players will only need to be able to view the page to interact and purchase items.

### Notes
A game master being logged in is required for the purchasing to function.

## Track
The `quest-board.track` page subtype can be used by game masters and players to set up counters. Anyone with sufficient ownership can change the counters' values directly on the viewed page.

Each page can be assigned a name, description, and a configurable maximum.
