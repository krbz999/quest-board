# Quest Board

A module for the Foundry VTT dnd5e system. This adds new `JournalEntryPage` document subtypes as well as a calendar UI.

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

## Relation
The `quest-board.relation` page subtype can be used by players and game masters to create entities like npcs and other characters without a strict need of an `Actor` document. There are fields to store a biography, secret notes, and various data like their date of birth, birth place, titles, place of residence, and more.

## Shop
The `quest-board.shop` page subtype can be used by a game master to set up a shop. Edit the page, drag-and-drop items into the Stock, and players will only need to be able to view the page to interact and purchase items.

### Notes
A game master being logged in is required for the purchasing to function.

## Track
The `quest-board.track` page subtype can be used by game masters and players to set up counters. Anyone with sufficient ownership can change the counters' values directly on the viewed page.

Each page can be assigned a name, description, and a configurable maximum.

# Calendar
A calendar view is added and can be accessed in the bottom left above the Players. This derives all data from the calendar data model configured in `CONFIG.time.worldCalendarClass`. This module does not replace the calendar, only allows for viewing it.

A game master can add events to specific dates, and all users can view these events.
