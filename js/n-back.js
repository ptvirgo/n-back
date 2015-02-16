/* General configuration */
var config = {
  // How long to display each trial
  displayTime: 1500,
  // How long to accept input for each trial
  roundTime: 2500,
  // How long to pause and provide feedback between trials
  feedbackTime: 500,
  // How long to delay the start of the first trial
  delayTime: 500,
  // Minimum number of trials per session
  baseSessionLength: 20,
  // Minimum number of matches per session
  minMatches: 3
};

if ( config.minMatches > config.baseSessionLength )
{
  config.minMatches = 0;
}

// Initial player stats
var playerStats = {
  n: 2,
  warns: 0
};

/**

## GameBoard( ... )

### Parameters:
  - None

Builds a 9x9 grid on a new Snap.SVG object.  Ratios are built with the
assumption that the #snapBoard SVG has been defined by the HTML
document, and that the ratios are approximately 3 wide to 4 high.

*/

function GameBoard()
{
  var s = Snap("#snapBoard");

  var boardSize = s.attr( "width" );
  var blockSize = Math.floor( (boardSize - boardSize % 10) / 3 );
  var hudSize = blockSize;
  var space = Math.round( boardSize * .01 );

  if ( space < 1 )
  {
    space = 1;
  }

  /**
  
  ## GameBoard.Element.indicate(light)
  
   - Parameters:  String, one of: active, inactive, correct, or incorrect.
   - Returns: The appearance attributes applied to the element.
  
   - Effect: Element.attr( appearance ). Element attributes are set to
     match the associated appearance, per the Snap.SVG call.
  
  It is expected that this function will be added to Snap.SVG Element
  objects, extending their functionality.
  
  */
  
  function indicate( light )
  {
    var appearances = {
      active: {
        fill:   "#0000FF",
        fillOpacity: 1,
        stroke: "#0000AA",
        strokeOpacity: 1,
      },
      inactive: {
        fill:   "#FFFFFF",
        fillOpacity: 1,
        stroke: "#CCCCCC",
        strokeOpacity: 1,
      },
      correct: {
        fill: "#00FF00",
        fillOpacity: 1,
        stroke: "#00AA00",
      },
      incorrect: {
        fill: "#FF0000",
        fillOpacity: 1,
        stroke: "#AA0000",
        strokeOpacity: 1,
      }
    }
  
      var appearance = appearances[light];
      if ( typeof appearance == "undefined" )
      {
        light = "inactive";
        appearance = appearances[light];
      }
  
      this.light = light;
      this.attr( appearance );
      return appearance;
  }

  // Build position blocks
  var blocks = [];

  for (var i = 0; i < 9; i++)
  {
      var bX = ((i % 3)) * blockSize + space;
      var bY = (i - (i % 3)) / 3 * blockSize + space;
  
      blocks[i] = s.rect(
        bX, bY,
        blockSize - space,
        blockSize - space,
        space,
        space
      );

      blocks[i].indicate = indicate;
      blocks[i].indicate("inactive");

      blocks[i].attr({ id: "block-" + i });
      blocks[i].attr({ class: "block" });
  }

  // Load sounds

  var sounds = [];

  for ( var i = 0; i < 9; i++ )
  {
    var sound = 'sound/0' + i + '.ogg';
    sounds[i] = new Howl({
      urls: [ sound ],
      autoplay: false,
      loop: false,
    });
  }

  // Small center target to focus the eyes on
  var target = s.circle(blockSize * 1.5, blockSize * 1.5, space * 2);
  target.attr({ id: "target" } );
  target.indicate = indicate;
  target.indicate( "inactive" );

  // Feedback (correct or incorrect) indicators.  Can also be clicked as
  // non-keyboard input
  indicatorRadius = blockSize / 4;
  pX = blockSize / 2;
  pY = blockSize * 3 + hudSize / 2;
  
  var pIndicator = s.circle( pX, pY, indicatorRadius);
  pIndicator.indicate = indicate;
  pIndicator.indicate( "inactive" );

  sX = blockSize / 2 * 5;
  sY = pY;

  var sIndicator = s.circle( sX, sY, indicatorRadius);
  sIndicator.indicate = indicate;
  sIndicator.indicate( "inactive" );


  var pText = s.text( 0, blockSize * 3 + hudSize, "Position Match (A)"
).attr( { "font-size": "small" } );
  var sText = s.text( blockSize * 2, blockSize * 3 + hudSize,
    "Sound Match (L)" ).attr( { "font-size": "small" } );

  var indicators = {
    position: pIndicator,
    sound: sIndicator
  };

/**

## GameBoard.showBlock(id)

Parameter: id of a block to be briefly activated.  Must be 0 - 8.
Effect: Activates display of the identified block

*/

  this.showBlock = function(id)
  {
    if ( id < 0 || id > 9 )
    {
      return;
    }
    else
    {
      blocks[id].indicate("active");
      var cutoff = window.setTimeout(
        function () { blocks[id].indicate("inactive"); },
        config["displayTime"]
      );
    }
  };

/**

## GameBoard.playSound(id)

Parameter: id of a sound to be played.  Must be 0 - 8.
Effect: Plays the identified sound

*/
  this.playSound = function(id)
  {
    if ( id < 0 || id > 9 )
    {
      return;
    }
    else
    {
      sounds[id].play();
    }
  }

/**

## GameBoard.show( "position||sound", boolean );

Parameters:

  - A string, either "postion" or "sound"
  - A boolean

Effect

  This will tell the position or sound indicator to show that a correct
(true) or incorrect (false) match has been made.

*/

  this.show = function(test, accurate ) {

    if ( test != "position" && test != "sound" )
    {
      console.error(
        "Board can show feedback for sound or position.  Ignoring: " +
        test
      );
      return;
    }

    if ( accurate )
    {
      indicators[test].indicate( "correct" );
    }
    else
    {
      indicators[test].indicate( "incorrect" );
    }

    return accurate;

  };

  this.sessionMatch = function( match ) {

    indicators.position.click( function(){ match( "position" ); } );
    indicators.sound.click( function(){ match( "sound" ); } );

  }

  this.sessionClear = function() {
    indicators.position.unclick();
    indicators.sound.unclick();
  };

/**

## GameBoard.reset()

- Effect: restore all blocks and indicator bulbs to the inactive
  appearance.

*/

  this.reset = function() {

    indicators[ "position" ].indicate( "inactive" );
    indicators[ "sound" ].indicate( "inactive" );

    for ( var i = 0; i < 9; i++ )
    {
      blocks[i].indicate( "inactive" );
    }
  };

}

/*

## Gameboard.play( trial )

Parameter:  A trial object (including position and sound id) to be
played back for the user

Effect: the board will display the block position and sound identified
by the trial

*/

GameBoard.prototype.play = function( trial )
{
  this.showBlock( trial.position.id );
  this.playSound( trial.sound.id );
}

/*

## GameBoard.showPlayerStats()

  - Effect: Display the current player stats.

*/

GameBoard.prototype.showPlayerStats = function()
{
  $("#trialTitle").text("Dual " + playerStats.n + "-Back");
  $("#warns").text("Warnings: " + playerStats.warns);
}

/*

## new Trial(position, sound)

Parameters:

  - position: integer, 0 - 8
  - sound: integer 0 - 8

A trial represents the playback of a combined sound and position that
the user must try to remember and match against previous trials.

*/

function Trial(position, sound)
{

  this.position = {
    "id": position,
    "correct": undefined,
    "complete": false
  };

  this.sound = {
    "id": sound,
    "correct": undefined,
    "complete": false
  };
}

/*

## new Session( n, length, board )

Parameters:
  n, integer:  the n in n-back.
  length: the total number of trials
  board: the game board on which to display trials and feedback.

*/

function Session( n, board )
{

  var trials = [];
  var length = config.baseSessionLength + n;
  var trialTimer;
  var feedbackTimer;

  // Prepare the session's trials
  for (var i = 0; i < length; i++)
  {
    var position = Math.floor( Math.random() * 9 );
    var sound = Math.floor( Math.random() * 9 );
    trials[i] = new Trial( position, sound );
  }

  // Enforce minimum number of matches
  var madeMatch = 0;

  while (madeMatch < config.minMatches)
  {
    var pMatch = Math.floor( Math.random() * (length - n)) + n;
    var sMatch = Math.floor( Math.random() * (length - n)) + n;

    if ( trials[pMatch].position.id != trials[pMatch - n].position.id )
    {
      trials[pMatch].position.id = trials[pMatch - n].position.id;
      madeMatch++;
    }

    if ( trials[sMatch].sound.id != trials[sMatch - n].sound.id )
    {
      trials[sMatch].sound.id = trials[sMatch - n].sound.id;
      madeMatch++;
    }
  }

  var current = 0;
  
/*

## Session.nextRound

Effect:  clears the board and plays the trial for the next round that
needs to be played, as stored in "current".  Ends with a call to
roundFeedback.  The two will recursively call each other until all
rounds are played.

*/

  nextRound = function() {

    board.reset();
    if ( current < length )
    {
      board.play( trials[ current ]);

      trialTimer = window.setTimeout( function() {

        trials[current].position.complete = true;
        trials[current].sound.complete = true;

        if
        (
          current >= n
          &&
          trials[current].position.id == trials[current - n].position.id
          &&
          typeof(trials[current].position.correct)  == "undefined"
        )
        {
          trials[current].position.correct = false;
          board.show("position", false);
        }

        if
        (
          current >= n
          &&
          trials[current].sound.id == trials[current - n].sound.id
          &&
          typeof(trials[current].sound.correct) == "undefined"
        )
        {
          trials[current].sound.correct = false;
          board.show("sound", false);
        }
        roundFeedback();

      }, config["roundTime"] );
    }
    else
    {
      end( false );
    }
  };

/*

## Session.roundFeedBack()

Effect: displays feedback for the current round, then increments and
calls nextRound to keep the session progressing.

*/

  roundFeedback = function() {
    feedbackTimer = window.setTimeout( function() {
        current++;
        nextRound();
    }, config["feedbackTime"] );

  };

/**

## match( test )

Parameter:  "position||sound"
Returns: boolean
Effect: indicates whether the specified test matches the trial from
    n-back.

*/

  match = function(test) {

    if ( current < n )
    {
      return;
    }

    if (test != "position" && test != "sound")
    {
      console.error(
        "Can only match against position or sound. Ignoring: " +
        test
      );
      return;
    }

    if ( trials[current][test].complete )
    {
      return;
    }

    trials[current][test].complete = true;

    var success = (
      trials[current][test].id ==
      trials[current - n][test].id
    );

    trials[current][test].correct = success;
    board.show( test, success );

    return(success);
  };

  /*

##  Session.tally()

Parameters: None
Returns: An object describing the tallied results of this session

It would also be possible to generate the stats on the fly, as the
session unfolds.  However, tallying at the end means that changes to the
stats model can be made indepedently of changes to the session's process
flow.

  */

  tally = function() {

    var stats = {
      "position": { "matches": 0, "correct": 0, "incorrect": 0 },
      "sound": { "matches": 0, "correct": 0, "incorrect": 0 }
    };

    for (var i = n; i < length; i++)
    {

      if (trials[i].position.id == trials[i - n].position.id)
      {
        stats.position.matches++;
      }

      if (trials[i].position.correct == true)
      {
        stats.position.correct++;
      }
      else if (trials[i].position.correct == false)
      {
        stats.position.incorrect++;
      }

      if (trials[i].sound.id == trials[i - n].sound.id)
      {
        stats.sound.matches++;
      }

      if (trials[i].sound.correct == true)
      {
        stats.sound.correct++;
      }
      else if (trials[i].sound.correct == false)
      {
        stats.sound.incorrect++;
      }
    }

    return stats;
  };

/*

## Session.updatePlayerStats( sessionStats )

Parameter: Stats for the session, as generated by Session.tally()
Effect: Updates the "playerStats" global variable with warnings and new
values for "n" as appropriate to the tallied results.

*/

  updatePlayerStats = function( sessionStats )
  {
  
    var correctTotal =
      sessionStats.position.correct + 
      sessionStats.sound.correct;
  
    var overallTotal =  
      correctTotal +
      sessionStats.position.incorrect + 
      sessionStats.sound.incorrect;
  
    var score = Math.round(
      correctTotal / overallTotal * 100 );
  
    if ( score > 80 )
    {
      playerStats.n++
      playerStats.warns = 0;
    }
    else if ( score < 50 && playerStats.warns < 2 )
    {
      playerStats.warns++;
    }
    else if ( score < 50 && playerStats.n > 1 )
    {
      playerStats.n--;
      playerStats.warns = 0;
    }

    board.showPlayerStats();
  
  };

/*
## Session.start()

Effect: tells the page to start accepting input for the session, and
launches the first round.

*/
  this.start = function() {

    $(document).keyup(function(key)
    {
      if ( key.which == 65 )
      {
        match("position");
      }
      else if ( key.which == 76 )
      {
        match("sound");
      }
    });

    board.sessionMatch( match );

    trialTimer = window.setTimeout ( function () {
      nextRound();
    }, config[ "delayTime" ]);
  };

/*
## Session.end( quit )

Parameter: Boolean indicating true if the user quit before the end of
the session, false if the session ended normally.

Effect: tells the page to stop taking input and clears the board and any
running timers.  If "quit" is false, the session ended naturally and
will be tallied and the player stats updated.

*/
  end = function( quit ) {
    
    window.clearTimeout( trialTimer );
    window.clearTimeout( feedbackTimer );

    board.sessionClear();
    board.reset();
    current = length - 1;

    $(document).off("keyup");
    $("#sessionControl").off("click");
    $("#sessionControl").click( function() { startNewSession(board); });
    $("#sessionControl").val("Start Session");

    if ( quit == true )
    {
      return;
    }

    var sessionStats = tally();
    updatePlayerStats( sessionStats );

  };

  /*
    I suspect this is Not Good JS, but my comprehension of scope was a
limiting factor. Could use some advice from a better progammer

  */ 
  this.end = end;
}

/* startNewSession( board )

Parameter: a GameBoard to be used by the new session
Effect: Creates and starts a new session, and makes the
"#sessionControl" button end rather than start a session.

This function is intended to be attached to the input button
"#sessionControl"  when there is no active session. It will convert the
control so that it ends the current session rather than starting a new
one, so that the user can use a single button to alternately start a new
session or end the running one without accidentally starting multiple
sessions at once.

*/

function startNewSession(board) {
  var session = new Session(playerStats.n, board);
  $("#sessionControl").off("click");
  $("#sessionControl").click( function() { session.end( true ); delete( session ); });
  $("#sessionControl").val("Quit Session");
  session.start();
}

window.onload = function() {
  console.debug("n-back.js loaded.");
  var board = new GameBoard(300, 99, 1, 100);
  board.showPlayerStats();
  $("#sessionControl").click( function () { startNewSession(board);});
};
