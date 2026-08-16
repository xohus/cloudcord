# CloudCord shared profiles

The desktop client publishes opt-in, content-addressed profile JSON here. The service stores only fields from the Fake Profile editor. It never receives Discord passwords, user tokens, BotCord tokens, email addresses, or phone numbers.

Other CloudCord clients discover a profile from the invisible `CCP1` marker that the user chooses to add to their real Discord About Me. Because the marker is delivered by Discord with that user's real profile, the service does not allow arbitrary user-ID claims.

