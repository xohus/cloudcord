# CloudCord shared profiles

The desktop client automatically publishes profile JSON here while Fake Profile is enabled. A stable unguessable profile ID allows later editor changes to update the same record without a new marker. The service stores only fields from the Fake Profile editor. It never receives Discord passwords, user tokens, BotCord tokens, email addresses, or phone numbers.

Other CloudCord clients discover a profile from the invisible `CCP1` marker that the user chooses to add to their real Discord About Me. Because the marker is delivered by Discord with that user's real profile, the service does not allow arbitrary user-ID claims.
