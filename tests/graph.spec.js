import { describe, expect, it } from "vitest";
import { buildTree, canRemoveStep, getAvailableSteps, insertStep, removeStep } from "@/logic/graph.js";
import { findStepsUsing } from "@/logic/references.js";

const step = (id, type = "SendEmail") => ({ id, type, displayName: id, properties: {} });
const done = (sourceStepId, targetStepId) => ({ sourceStepId, targetStepId, outcome: "Done" });

/**
 *  a -> if --True--> t1 -> t2
 *          --False-> f1
 *       if --Done--> z
 */
function branchedFlow() {
  return {
    steps: [step("a"), step("if", "If"), step("t1"), step("t2"), step("f1"), step("z")],
    connections: [
      done("a", "if"),
      { sourceStepId: "if", targetStepId: "t1", outcome: "True" },
      done("t1", "t2"),
      { sourceStepId: "if", targetStepId: "f1", outcome: "False" },
      done("if", "z")
    ]
  };
}

const ids = (nodes) => nodes.map((n) => n.step.id);
const availableIds = (flow, id) => getAvailableSteps(buildTree(flow), id).map((s) => s.id);

describe("buildTree", () => {
  it("builds the main sequence and the branches", () => {
    const tree = buildTree(branchedFlow());
    expect(ids(tree)).toEqual(["a", "if", "z"]);
    expect(ids(tree[1].branches.True)).toEqual(["t1", "t2"]);
    expect(ids(tree[1].branches.False)).toEqual(["f1"]);
  });

  it("does not depend on the order of connections", () => {
    const flow = branchedFlow();
    flow.connections.reverse();
    expect(ids(buildTree(flow))).toEqual(["a", "if", "z"]);
  });
});

describe("insertStep", () => {
  it("inserts after a step", () => {
    const flow = branchedFlow();
    insertStep(flow, step("new"), { afterStepId: "a" });
    expect(ids(buildTree(flow))).toEqual(["a", "new", "if", "z"]);
  });

  it("inserts at the start of a branch", () => {
    const flow = branchedFlow();
    insertStep(flow, step("new"), { branch: { ifStepId: "if", outcome: "False" } });
    expect(ids(buildTree(flow)[1].branches.False)).toEqual(["new", "f1"]);
  });

  it("inserts at the beginning of the flow", () => {
    const flow = branchedFlow();
    insertStep(flow, step("new"));
    expect(ids(buildTree(flow))).toEqual(["new", "a", "if", "z"]);
  });
});

describe("removeStep", () => {
  it("removes a step from the main sequence and reconnects its neighbours", () => {
    const flow = branchedFlow();
    removeStep(flow, "a");
    expect(ids(buildTree(flow))).toEqual(["if", "z"]);
  });

  it("removes the last step of a branch", () => {
    const flow = branchedFlow();
    removeStep(flow, "t2");
    expect(ids(buildTree(flow)[1].branches.True)).toEqual(["t1"]);
  });

  // Bug #1: the reconnected step must keep the branch outcome (True/False),
  // not inherit "Done" from the removed step's outgoing connection.
  it("keeps the branch outcome when removing the first step of a branch", () => {
    const flow = branchedFlow();
    removeStep(flow, "t1");

    expect(flow.connections).toContainEqual({ sourceStepId: "if", targetStepId: "t2", outcome: "True" });
    expect(flow.connections).not.toContainEqual({ sourceStepId: "if", targetStepId: "t2", outcome: "Done" });
    expect(ids(buildTree(flow)[1].branches.True)).toEqual(["t2"]);
  });

  it("does not touch the Done connection of the If when removing the first branch step", () => {
    const flow = branchedFlow();
    removeStep(flow, "t1");

    expect(flow.connections).toContainEqual({ sourceStepId: "if", targetStepId: "z", outcome: "Done" });
    expect(ids(buildTree(flow))).toEqual(["a", "if", "z"]);
  });

  it("leaves a branch empty when removing its only step", () => {
    const flow = branchedFlow();
    removeStep(flow, "f1");

    expect(flow.connections).not.toContainEqual(
      expect.objectContaining({ sourceStepId: "if", outcome: "False" })
    );
    expect(ids(buildTree(flow)[1].branches.False ?? [])).toEqual([]);
  });

  it("removes a middle step of a branch and keeps the chain", () => {
    const flow = branchedFlow();
    insertStep(flow, step("t1b"), { afterStepId: "t1" }); // True: t1 -> t1b -> t2
    removeStep(flow, "t1b");

    expect(ids(buildTree(flow)[1].branches.True)).toEqual(["t1", "t2"]);
  });

  it("only allows removing an If when its branches are empty", () => {
    const flow = branchedFlow();
    expect(canRemoveStep(flow, "if")).toBe(false);
    removeStep(flow, "f1");
    removeStep(flow, "t2");
    removeStep(flow, "t1");
    expect(canRemoveStep(flow, "if")).toBe(true);
  });
});

describe("getAvailableSteps", () => {
  it("gives a step in a branch the earlier steps of that branch and the steps before the If", () => {
    expect(availableIds(branchedFlow(), "t2")).toEqual(["a", "if", "t1"]);
  });

  it("does not leak steps from the other branch", () => {
    expect(availableIds(branchedFlow(), "f1")).toEqual(["a", "if"]);
  });

  it("does not expose steps inside branches to a step after the If", () => {
    expect(availableIds(branchedFlow(), "z")).toEqual(["a", "if"]);
  });

  it("gives the first step of a flow nothing", () => {
    expect(availableIds(branchedFlow(), "a")).toEqual([]);
  });

  it("returns an empty list for an unknown step", () => {
    expect(availableIds(branchedFlow(), "does-not-exist")).toEqual([]);
  });

  it("handles nested Ifs", () => {
    const flow = {
      steps: [step("if1", "If"), step("p"), step("if2", "If"), step("x"), step("q")],
      connections: [
        { sourceStepId: "if1", targetStepId: "p", outcome: "True" },
        done("p", "if2"),
        { sourceStepId: "if2", targetStepId: "x", outcome: "True" },
        { sourceStepId: "if1", targetStepId: "q", outcome: "False" }
      ]
    };
    expect(availableIds(flow, "x")).toEqual(["if1", "p", "if2"]);
    expect(availableIds(flow, "q")).toEqual(["if1"]);
  });
});

describe("findStepsUsing", () => {
  const A = "11111111-1111-1111-1111-111111111111";
  const B = "22222222-2222-2222-2222-222222222222";
  const ref = (id) => `{{ steps.${id}.output.fullName }}`;
  const withProps = (id, properties) => ({ ...step(id), properties });
  const usersOf = (steps) => findStepsUsing({ steps, connections: [] }, A).map((s) => s.id);

  it("finds a reference in a string property", () => {
    expect(usersOf([step(A), withProps(B, { body: `Hi ${ref(A)}` })])).toEqual([B]);
  });

  it("finds a reference nested in an object", () => {
    expect(usersOf([step(A), withProps(B, { body: { user: { name: ref(A) } } })])).toEqual([B]);
  });

  it("finds a reference inside an array of objects", () => {
    expect(usersOf([step(A), withProps(B, { fields: [{ key: "x", label: ref(A) }] })])).toEqual([B]);
  });

  it("finds a reference used as an object key", () => {
    expect(usersOf([step(A), withProps(B, { body: { [ref(A)]: 1 } })])).toEqual([B]);
  });

  it("ignores steps that do not use it", () => {
    expect(usersOf([step(A), withProps(B, { body: "hello" })])).toEqual([]);
  });
});