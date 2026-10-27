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

- Root cause: 'openFlow' sets 'activeFlowId' right away, then waits for
  'api.getFlow'. It never checked afterwards if that flow was still the
  selected one. The fake backend answers in a different time each call, so the
  response for KYC can arrive after the one for Contract. When that happens,
  KYC overwrites 'flow' while 'activeFlowId' is still Contract. The list
  highlights Contract, but the editor shows KYC. Then Save sends the KYC steps
  under the Contract id, which explains the duplicated KYC flow and the lost
  contract. So Save was not a separate bug, it just used the wrong state
- Fix: after the 'await', 'openFlow' compares 'activeFlowId' with the id it was
  called with. If they differ, it drops the response. I did the same check in
  the 'catch', so an old request can't show an error and in 'finally', so an
  old request can't turn off the loading state of the new one
- How I verified it: I reproduced it in the UI by clicking KYC and then Contract quickly. Before the fix the list and the editor showed different flows. After the fix they always match

### #3 Unsaved changes / Discard

- Root cause:
- Fix:
- How I verified it:

Bug #3 not reproducible in the current branch, verified in browser after editing a flow. Unsaved changes and Discard behaved as expected.”

### Other things I noticed

<!-- Problems you found that weren't reported. Which ones you fixed, and which ones you left (and why). -->

## Features

### A. Reference picker

<!-- Which outputs you offer, and why. Edge cases you thought about. -->

The picker only shows outputs that are guaranteed to exist when the step runs.
That means the earlier steps in the same sequence. If the step is inside a
branch, it also includes the steps before the If.
I leave out the other branch, because only one branch runs. I also leave out
the steps inside branches for anything after the If, because we don't know
which branch ran.
The logic is in 'getAvailableSteps' in graph.js. It walks the tree from
'buildTree'. I wrote tests for a step in a branch, the other branch, a step
after the If, the first step and nested Ifs.
Form outputs come from 'properties.fields', so they change when the user edits
the fields. I skip fields with an empty key, because they would give a broken
reference.
I checked it in the browser and it worked as expected.

### B. Safe delete

<!-- How you find references, and why you did it that way. -->

Before deleting a step, I check if any other step uses its output. I go through
the 'properties' of every other step, including arrays, nested objects and
object keys, so things like the webhook body are covered. For finding the
references I reused 'parseReferences', so the format is defined in one place.
If something uses it, the user sees a confirm dialog with the names of those
steps. They can still delete anyway. The check is in 'deleteStep' in the
store and that's the only place that calls 'removeStep', so there is no way
around it.
I wrote tests for a string, a nested object, an array, an object key and a
step nobody uses. In the browser I deleted ID verification in KYC onboarding
and the dialog listed the steps that use it.

## Decisions and assumptions

<!-- Anything that was unclear and how you decided. -->

## If I had more time

## AI usage

<!--
Which tools you used and for what.
A few examples of prompts or tasks you gave them.
What you kept, what you changed, and what you threw away (and why).
-->
