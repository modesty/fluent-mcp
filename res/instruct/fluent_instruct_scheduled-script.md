# Instructions on Scheduled Script Execution API
Always reference the Record API specification for more details.
1. The second parameter of the get_sys_id function for `businessCalendar` should always query for both `calendar_name` and `label` field, and the query value can only be one of the following: `Year`, `Quarter`, `Month`, `Week`. ex: `calendar_name=Month^ORlabel=Month`.
2. `runPeriod`, `runStart` and `runTime` should all follow the following date time format: `YYYY-MM-DD HH-MM-SS`.
3. `runType` can take any 1 of these values: `daily` | `weekly` | `monthly` | `periodically` | `once` | `on_demand` | `business_calendar_start` | `business_calendar_end`.
4. `timeZone` can take any 1 of these values: `floating` | `US/Hawaii` | `Canada Pacific` | `US/Pacific` | `Canada/Mountain` | `US/Mountain` | `US/Arizona` | `Canada/Central` | `US/Central` | `Canada/Eastern` | `US/Eastern` | `Canada/Atlantic` | `Europe/Dublin` | `Europe/London` | `GMT` | `Europe/Amsterdam` | `Europe/Berlin` | `Europe/Brussels` | `Europe/Copenhagan` | `Europe/Madrid` | `Europe/Paris` | `Europe/Rome` | `Europe/Stockholm` | `Europe/Zurich` | `Hongkong`.
5. `runDayofweek` can take any value between `1` and `7`. `1` is Monday, `2` is Tuesday, `3` is Wednesday, `4` is Thursday, `5` is Friday, `6` is Saturday, and `7` is Sunday.
6. `runPeriod` is calculated by the time difference between its value and January 1st 1970 at midnight. ex: a job that runs every 2 and a half days will have a `runPeriod` of `1970-01-03 12:00:00`.
