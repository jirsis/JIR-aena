# JIR-flights
Show planes arivals in custom airport from FlightRadar source.

This module listen all calendar events from [calendar](https://github.com/MichMich/MagicMirror/tree/master/modules/default/calendar) module.

Then you could setup this module properties:
```
{
	module: "JIR-flights",
	config: {
		flightRegex: /Visit.*\[(.*)\]/s,
		updateInterval: 1*60*1000,
	}
},
```

with ```fligthRegex``` setup your custom regex in the calendar events to show in JIR-flights module

