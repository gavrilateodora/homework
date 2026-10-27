# Notes

## Summary

<!-- What you did, in a few sentences. What you'd like us to look at first. -->

## Bug fixes

### #1 Deleting the first step of a branch

- Root cause: when a step is removed, 'removeStep' reconnects the steps around
  it. It copied the removed step's outgoing 'Done' connection and only changed
  the source. So the new connection kept the outcome 'Done', even when the step
  I deleted was the first one in a 'True' or 'False' branch. That gave us
  'If -> Done -> next' instead of 'If -> True -> next'. 'buildTree' reads a 'Done' from an If as "the step after the condition", so the next step left the
  branch. In a normal chain ('Done' to 'Done') nothing looks wrong, which is
  why it was easy to miss
- Fix: the new connection now takes its target from the removed step's 'Done'
  connection and its outcome from the incoming connection
- How I verified it: I fixed 'removeStep' and checked it in the UI with
  KYC onboarding. Then I ran 'npm test' and one test failed: "reconnects the If
  to the next step...". It expected 'If -> Done -> t2', which is the buggy
  result. So the test was wrong, not the fix. I rewrote it to expect
  'If -> True -> t2' and check the result with 'buildTree'. I also added tests
  for removing the only step of a branch, a middle step, and for the If's
  'Done' connection staying the same

### #2 Switching flows quickly

- Root cause:
- Fix:
- How I verified it:

### #3 Unsaved changes / Discard

- Root cause:
- Fix:
- How I verified it:

### Other things I noticed

<!-- Problems you found that weren't reported. Which ones you fixed, and which ones you left (and why). -->

## Features

### A. Reference picker

<!-- Which outputs you offer, and why. Edge cases you thought about. -->

### B. Safe delete

<!-- How you find references, and why you did it that way. -->

## Decisions and assumptions

<!-- Anything that was unclear and how you decided. -->

## If I had more time

## AI usage

<!--
Which tools you used and for what.
A few examples of prompts or tasks you gave them.
What you kept, what you changed, and what you threw away (and why).
-->
