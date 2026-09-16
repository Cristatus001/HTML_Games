HOW TO ADD YOUR OWN MUSIC/SOUND
================================
The game already has full background music and sound effects built in --
they're synthesized in code, so no audio files are required for the game
to sound complete out of the box.

If you'd rather use your own recorded audio, drop MP3 files into this
folder using the EXACT filenames below. Whichever ones you provide will
automatically replace the synthesized version; anything you don't provide
keeps using the built-in sound.

assets/audio/bgm.mp3
    Looping background music played during menus and gameplay.

assets/audio/launch.mp3
    Plays the moment you release the drag to launch the rocket.

assets/audio/crash.mp3
    Plays on "IMPACT DETECTED" (flew too slow and fell into Earth).

assets/audio/success.mp3
    Plays when a stable orbit is achieved.

assets/audio/click.mp3
    Short UI click for menu buttons and level-select cards.

(There's no override slot for the "LOST SIGNAL" escape sound since it's a
quick synthesized sweep -- ping me if you want that configurable too.)

Format: MP3 recommended. Keep files short and reasonably small (a menu
click doesn't need to be a 5MB file) so the game stays fast to load.
